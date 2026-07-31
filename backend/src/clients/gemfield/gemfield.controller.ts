import express, { Request, Response, Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AuthRequest, authenticateToken } from '../../auth/auth.middleware'
import { createLogger } from '../../observability/logger'
import { notificationService } from '../../notifications/socket.service'
import { emailService } from '../../email/email.service'
import { createUploadStorage } from '../../uploads/upload.storage'
import { UploadsService } from '../../uploads/uploads.service'
import { resolveClientAccessContext } from '../client-access-context'
import { ClientsService } from '../clients.service'
import { requireGemfieldClient, type GemfieldRequest } from './gemfield.access'
import { GemfieldService } from './gemfield.service'
import { GemfieldValidationError, type GemfieldProgressInput } from './gemfield.progress'
import {
  verifyGemfieldIntakeSignature,
  verifyGemfieldSignature,
  type GemfieldIntakePayload,
  type GemfieldProgressPayload,
} from './gemfield.webhook'
import { GemfieldTicketValidationError, type GemfieldWizardTicketInput } from './gemfield-ticket'
import {
  GemfieldTicketService,
  ticketReference,
  type WizardTicketAttachmentInput,
} from './gemfield-ticket.service'
import { GemfieldPipelineService } from './gemfield-pipeline.service'
import { getGemfieldSupportConfig } from './gemfield.config'
import type { ClientAccessContext } from '../clients.access'

const SIGNATURE_HEADER = 'x-gemfield-signature'
const logger = createLogger('clients.gemfield.controller')

function readProgressPayload(body: unknown): GemfieldProgressPayload & GemfieldProgressInput {
  const source = (body ?? {}) as Record<string, unknown>
  const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null
  return {
    gfId: typeof source.gfId === 'string' ? source.gfId : '',
    phase: typeof source.phase === 'string' ? source.phase : '',
    status: asString(source.status),
    note: asString(source.note),
    stagingUrl: asString(source.stagingUrl),
    liveUrl: asString(source.liveUrl),
    at: asString(source.at),
  }
}

function handleError(res: Response, error: unknown, context: string): void {
  if (error instanceof GemfieldValidationError || error instanceof GemfieldTicketValidationError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  logger.error(`[Gemfield] ${context}:`, error)
  res.status(500).json({ error: 'Failed to process Gemfield request' })
}

// Per-org + per-user ticket-creation limit (abuse rail). Runs after the entitlement guard, so the
// org and requester are known. Defaults to an in-memory store; production can supply a Redis store.
const ticketCreateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Our keyGenerator keys on org+user (never raw IP), so the IPv6-fallback validation doesn't apply.
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    // The route always runs after authenticateToken + the entitlement guard, so requesterId is
    // present; we never fall back to req.ip (which would trip express-rate-limit's IPv6 validation).
    const gemfieldReq = req as GemfieldRequest
    const organizationId = gemfieldReq.gemfieldOrganization?.id ?? 'unknown'
    const requesterId = gemfieldReq.gemfieldAccess?.requesterId ?? 'anon'
    return `gemfield-ticket:${organizationId}:${requesterId}`
  },
  message: { error: 'Too many requests just now. Please try again in a minute.' },
})

function readWizardTicketBody(body: unknown): {
  input: GemfieldWizardTicketInput
  attachments: WizardTicketAttachmentInput[]
} {
  const source = (body ?? {}) as Record<string, unknown>
  const attachments = Array.isArray(source.attachments)
    ? (source.attachments as unknown[])
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => ({
          name: typeof entry.name === 'string' ? entry.name : undefined,
          contentType: typeof entry.contentType === 'string' ? entry.contentType : undefined,
          data: typeof entry.data === 'string' ? entry.data : '',
        }))
    : []
  return {
    input: {
      title: typeof source.title === 'string' ? source.title : undefined,
      category: typeof source.category === 'string' ? source.category : undefined,
      description: typeof source.description === 'string' ? source.description : null,
      projectId: typeof source.projectId === 'string' ? source.projectId : null,
      ticketKind: typeof source.ticketKind === 'string' ? source.ticketKind : undefined,
      wizardVersion: typeof source.wizardVersion === 'string' ? source.wizardVersion : undefined,
      wizardAnswers:
        source.wizardAnswers && typeof source.wizardAnswers === 'object'
          ? (source.wizardAnswers as Record<string, unknown>)
          : null,
      callbackNumber: typeof source.callbackNumber === 'string' ? source.callbackNumber : null,
      callbackWindow: typeof source.callbackWindow === 'string' ? source.callbackWindow : null,
    },
    attachments,
  }
}

function readIntakePayload(body: unknown): GemfieldIntakePayload {
  const raw = (body ?? {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const nullable = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null
  return {
    gfId: str(raw.gfId),
    businessName: str(raw.businessName),
    contactName: str(raw.contactName),
    contactEmail: str(raw.contactEmail),
    contactPhone: nullable(raw.contactPhone),
    websiteUrl: nullable(raw.websiteUrl),
    tierLabel: nullable(raw.tierLabel),
    at: nullable(raw.at),
  }
}

export class GemfieldController {
  private service = new GemfieldService()
  // Reused for the intake webhook's client invite, so provisioning goes through the
  // same path (setup token, role assignment, invite email) as a staff-issued invite.
  private clients = new ClientsService()
  private ticketService = new GemfieldTicketService(new UploadsService(createUploadStorage()))
  private pipeline = new GemfieldPipelineService()

  // Staff gate for the control panel (management + gemfield-dev, via client-ops privilege).
  private async resolveStaff(req: Request, res: Response): Promise<ClientAccessContext | null> {
    const access = await resolveClientAccessContext(req)
    if (!access) {
      res.status(401).json({ error: 'Authentication required' })
      return null
    }
    if (!access.isPrivileged) {
      res.status(403).json({ error: 'Staff access required' })
      return null
    }
    return access
  }

  private guard = requireGemfieldClient({
    resolveAccess: resolveClientAccessContext,
    loadOrganization: (organizationId) => this.service.loadEntitledOrganization(organizationId),
  })

  private async sendTicketReceipt(email: string | undefined, reference: string, ticketId: string): Promise<void> {
    if (!email) return
    const base = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')
    const link = base ? `${base}/client/tickets?ticket=${ticketId}` : ''
    const linkHtml = link
      ? `<p><a href="${link}">Open your request in Deskii</a> to add details or see replies.</p>`
      : `<p>Open Deskii and go to Requests to add details or see replies.</p>`
    try {
      await emailService.sendEmail({
        to: email,
        subject: `We got your request (${reference})`,
        html: `
          <p>Thanks - we've received your request and our team will take it from here.</p>
          <p>Your reference is <strong>${reference}</strong>.</p>
          ${linkHtml}
          <p style="color:#666;font-size:13px">Please reply inside Deskii rather than to this email - this inbox isn't monitored.</p>
        `,
      })
    } catch (error) {
      logger.error('[Gemfield] ticket receipt email failed:', error)
    }
  }

  router(): Router {
    const router = express.Router()

    // Staff-only entitlement management. Gated on MANAGEMENT access, NOT the entitlement guard -
    // its whole purpose is to flip a not-yet-entitled org on, so it must reach any client org.
    router.patch(
      '/admin/organizations/:organizationId/entitlement',
      authenticateToken,
      async (req: Request, res: Response) => {
        try {
          const access = await resolveClientAccessContext(req)
          if (!access) return res.status(401).json({ error: 'Authentication required' })
          if (!access.isPrivileged) {
            return res.status(403).json({ error: 'Only staff can manage Gemfield entitlement' })
          }
          const organizationId = String(req.params.organizationId || '')
          const body = (req.body ?? {}) as Record<string, unknown>
          const result = await this.service.setEntitlement(organizationId, {
            gemfieldClient: typeof body.gemfieldClient === 'boolean' ? body.gemfieldClient : undefined,
            gemfieldCaseIds: Array.isArray(body.gemfieldCaseIds) ? (body.gemfieldCaseIds as string[]) : undefined,
          })
          res.json({ ok: true, ...result })
        } catch (error) {
          handleError(res, error, 'Error setting entitlement')
        }
      },
    )

    // --- Developer control panel (staff-only; all reads/writes Gemfield-scoped) ---
    router.get('/admin/pipeline', authenticateToken, async (req: Request, res: Response) => {
      try {
        if (!(await this.resolveStaff(req, res))) return
        const query = req.query as Record<string, string | undefined>
        const items = await this.pipeline.listPipeline({
          status: query.status,
          assigneeId: query.assigneeId,
          priority: query.priority,
          devAssistOnly: query.devAssist === 'true',
          organizationId: query.organizationId,
          search: query.search,
        })
        res.json({ items })
      } catch (error) {
        handleError(res, error, 'Error listing pipeline')
      }
    })

    router.patch('/admin/tickets/:ticketId/status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.resolveStaff(req, res)
        if (!access) return
        const status = String((req.body as Record<string, unknown>)?.status || '')
        const result = await this.pipeline.moveTicket(String(req.params.ticketId || ''), status, access.requesterId)
        notificationService.broadcastDataChange('client-overview')
        res.json({ ok: true, ...result })
      } catch (error) {
        handleError(res, error, 'Error moving ticket')
      }
    })

    router.patch('/admin/tickets/:ticketId/assignee', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.resolveStaff(req, res)
        if (!access) return
        const raw = (req.body as Record<string, unknown>)?.assigneeId
        const assigneeId = typeof raw === 'string' && raw ? raw : null
        const result = await this.pipeline.assignTicket(String(req.params.ticketId || ''), assigneeId, access.requesterId)
        res.json({ ok: true, ...result })
      } catch (error) {
        handleError(res, error, 'Error assigning ticket')
      }
    })

    router.get('/admin/tickets/:ticketId', authenticateToken, async (req: Request, res: Response) => {
      try {
        if (!(await this.resolveStaff(req, res))) return
        const detail = await this.pipeline.getTicketDetail(String(req.params.ticketId || ''))
        res.json(detail)
      } catch (error) {
        handleError(res, error, 'Error reading ticket detail')
      }
    })

    router.patch('/admin/tickets/:ticketId/classification', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.resolveStaff(req, res)
        if (!access) return
        const changeClass = String((req.body as Record<string, unknown>)?.changeClass || '')
        const result = await this.pipeline.setChangeClass(String(req.params.ticketId || ''), changeClass, access.requesterId)
        res.json({ ok: true, ...result })
      } catch (error) {
        handleError(res, error, 'Error classifying ticket')
      }
    })

    // Staff: run the daily digest on demand (also runs via the scheduler's cron).
    router.post('/admin/digest', authenticateToken, async (req: Request, res: Response) => {
      try {
        if (!(await this.resolveStaff(req, res))) return
        const result = await this.pipeline.runGemfieldDigest()
        res.json(result)
      } catch (error) {
        handleError(res, error, 'Error running digest')
      }
    })

    // Client + staff read: support config (phone + callback hours) for the wizard. Entitlement-guarded.
    router.get(
      '/organizations/:organizationId/support',
      authenticateToken,
      this.guard,
      (_req: Request, res: Response) => {
        res.json(getGemfieldSupportConfig())
      },
    )

    // Client + staff read: the org's build progress. `requireGemfieldClient` enforces entitlement
    // (404 for non-entitled/cross-org) after authentication.
    router.get(
      '/organizations/:organizationId/progress',
      authenticateToken,
      this.guard,
      async (req: Request, res: Response) => {
        try {
          const organizationId = (req as GemfieldRequest).gemfieldOrganization?.id
          if (!organizationId) return res.status(404).json({ error: 'Not found' })
          const projects = await this.service.getProgressForOrganization(organizationId)
          res.json({ projects })
        } catch (error) {
          handleError(res, error, 'Error reading progress')
        }
      },
    )

    // Wizard ticket submission -> a normal ClientTicket (extend, never parallel), with attachments.
    // Any active member of the entitled org may file (org-wide tickets). Rate-limited per org+user.
    router.post(
      '/organizations/:organizationId/tickets',
      authenticateToken,
      this.guard,
      ticketCreateLimiter,
      async (req: Request, res: Response) => {
        try {
          const gemfieldReq = req as GemfieldRequest
          const access = gemfieldReq.gemfieldAccess
          const organizationId = gemfieldReq.gemfieldOrganization?.id
          if (!access || !organizationId) return res.status(404).json({ error: 'Not found' })

          const { input, attachments } = readWizardTicketBody(req.body)
          const result = await this.ticketService.createWizardTicket(
            organizationId,
            access.requesterId,
            input,
            attachments,
          )
          const reference = ticketReference(result.ticket.id)

          await this.sendTicketReceipt((req as AuthRequest).user?.email, reference, result.ticket.id)
          notificationService.broadcastDataChange('client-overview')

          res.status(201).json({ ok: true, reference, ...result })
        } catch (error) {
          handleError(res, error, 'Error creating wizard ticket')
        }
      },
    )

    // Staff manual editor (the always-current fallback). Same entitlement guard, then staff-only.
    router.post(
      '/organizations/:organizationId/projects/:projectId/phase',
      authenticateToken,
      this.guard,
      async (req: Request, res: Response) => {
        try {
          const gemfieldReq = req as GemfieldRequest
          const access = gemfieldReq.gemfieldAccess
          const organizationId = gemfieldReq.gemfieldOrganization?.id
          if (!access || !organizationId) return res.status(404).json({ error: 'Not found' })
          // The editor is staff-only; clients read progress but do not set it.
          if (!access.isPrivileged) return res.status(404).json({ error: 'Not found' })

          const projectId = String(req.params.projectId || '')
          const payload = readProgressPayload(req.body)
          const result = await this.service.setProjectPhase(organizationId, projectId, {
            phase: payload.phase,
            status: payload.status,
            note: payload.note,
            stagingUrl: payload.stagingUrl,
            liveUrl: payload.liveUrl,
            actorId: access.requesterId,
          })
          notificationService.broadcastDataChange('client-overview')
          res.json({ ok: true, ...result })
        } catch (error) {
          handleError(res, error, 'Error setting project phase')
        }
      },
    )

    // Machine-to-machine progress webhook. Authenticated by HMAC, NOT a user session.
    // Idempotent per (gfId, phase). Token provisioning parks in BLOCKERS.md until ops issues it.
    router.post('/progress', async (req: Request, res: Response) => {
      try {
        const secret = process.env.GEMFIELD_WEBHOOK_SECRET
        if (!secret) return res.status(503).json({ error: 'Gemfield webhook is not configured' })

        const payload = readProgressPayload(req.body)
        const signature = req.header(SIGNATURE_HEADER) || undefined
        if (!verifyGemfieldSignature(secret, payload, signature)) {
          return res.status(401).json({ error: 'Invalid signature' })
        }

        const result = await this.service.ingestProgress(payload)
        notificationService.broadcastDataChange('client-overview')
        res.json({ ok: true, ...result })
      } catch (error) {
        handleError(res, error, 'Error ingesting progress webhook')
      }
    })

    // Machine-to-machine intake provisioning webhook. Same HMAC scheme and shared secret as
    // /progress, distinct canonical field order. Sent by the Gemfield site when a client
    // completes the intake wizard: creates the organization, the project carrying the GF-ID,
    // the intake_received milestone, and invites the client so they can sign in.
    //
    // Idempotent per gfId - a replay returns the existing ids and does not invite again.
    router.post('/intake', async (req: Request, res: Response) => {
      try {
        const secret = process.env.GEMFIELD_WEBHOOK_SECRET
        if (!secret) return res.status(503).json({ error: 'Gemfield webhook is not configured' })

        const payload = readIntakePayload(req.body)
        const signature = req.header(SIGNATURE_HEADER) || undefined
        if (!verifyGemfieldIntakeSignature(secret, payload, signature)) {
          return res.status(401).json({ error: 'Invalid signature' })
        }

        const result = await this.service.provisionIntake(payload)

        // Invite outside the provisioning transaction: it sends mail, and a mail
        // failure must not roll back an organization that was created correctly.
        // Reported back so the caller can record whether the client can sign in.
        let invited = false
        if (result.created && result.contactEmail) {
          try {
            await this.clients.inviteClientUser(result.organizationId, {
              email: result.contactEmail,
              name: result.contactName,
              role: 'client',
              status: 'active',
            })
            invited = true
          } catch (inviteError) {
            logger.error('Gemfield intake provisioned but client invite failed', {
              gfId: payload.gfId,
              organizationId: result.organizationId,
              error: inviteError instanceof Error ? inviteError.message : 'unknown',
            })
          }
        }

        notificationService.broadcastDataChange('client-overview')
        res.json({
          ok: true,
          organizationId: result.organizationId,
          projectId: result.projectId,
          created: result.created,
          invited,
        })
      } catch (error) {
        handleError(res, error, 'Error provisioning intake webhook')
      }
    })

    return router
  }
}
