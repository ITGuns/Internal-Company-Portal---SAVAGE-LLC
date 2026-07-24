import express, { Request, Response, Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AuthRequest, authenticateToken } from '../../auth/auth.middleware'
import { createLogger } from '../../observability/logger'
import { notificationService } from '../../notifications/socket.service'
import { emailService } from '../../email/email.service'
import { createUploadStorage } from '../../uploads/upload.storage'
import { UploadsService } from '../../uploads/uploads.service'
import { resolveClientAccessContext } from '../client-access-context'
import { requireGemfieldClient, type GemfieldRequest } from './gemfield.access'
import { GemfieldService } from './gemfield.service'
import { GemfieldValidationError, type GemfieldProgressInput } from './gemfield.progress'
import { verifyGemfieldSignature, type GemfieldProgressPayload } from './gemfield.webhook'
import { GemfieldTicketValidationError, type GemfieldWizardTicketInput } from './gemfield-ticket'
import {
  GemfieldTicketService,
  ticketReference,
  type WizardTicketAttachmentInput,
} from './gemfield-ticket.service'
import { GemfieldPipelineService } from './gemfield-pipeline.service'
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
  keyGenerator: (req: Request) => {
    const gemfieldReq = req as GemfieldRequest
    const organizationId = gemfieldReq.gemfieldOrganization?.id ?? 'unknown'
    const requesterId = gemfieldReq.gemfieldAccess?.requesterId ?? req.ip ?? 'anon'
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

export class GemfieldController {
  private service = new GemfieldService()
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

    return router
  }
}
