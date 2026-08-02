// Plan upgrade request routes.
//
// Two audiences on one resource:
//   - the signed-in user, who may create and read only their OWN requests
//   - staff, who see the queue and move requests along
//
// Every route requires a session. The user-facing routes never accept a userId
// from the body - it always comes from the token - so one user cannot file or
// read a request on behalf of another.

import express, { Request, Response, Router } from 'express'
import { authenticateToken, type AuthRequest } from '../auth/auth.middleware'
import { resolveClientAccessContext } from '../clients/client-access-context'
import { createLogger } from '../observability/logger'
import { UpgradeRequestError, UpgradesService } from './upgrades.service'

const logger = createLogger('upgrades.controller')

function handleError(res: Response, error: unknown, context: string): void {
  if (error instanceof UpgradeRequestError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  logger.error(`${context}:`, error)
  res.status(500).json({ error: 'Failed to process the upgrade request' })
}

function readString(body: unknown, key: string): string | undefined {
  const value = (body as Record<string, unknown> | undefined)?.[key]
  return typeof value === 'string' ? value : undefined
}

export class UpgradesController {
  constructor(private readonly service = new UpgradesService()) {}

  /** Staff gate. Same privilege notion the client operations panels use. */
  private async requireStaff(req: Request, res: Response): Promise<string | null> {
    const access = await resolveClientAccessContext(req)
    if (!access) {
      res.status(401).json({ error: 'Authentication required' })
      return null
    }
    if (!access.isPrivileged) {
      res.status(403).json({ error: 'Only staff can manage upgrade requests' })
      return null
    }
    return access.requesterId
  }

  router(): Router {
    const router = express.Router()

    // --- The signed-in user's own requests ---

    router.post('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = (req as AuthRequest).user?.userId
        if (!userId) return res.status(401).json({ error: 'Authentication required' })

        // Slug only: the price and name are resolved server-side, so a tampered
        // body cannot invent a cheaper plan than the one being requested.
        const request = await this.service.createForUser(userId, {
          planSlug: readString(req.body, 'planSlug') || '',
          note: readString(req.body, 'note') ?? null,
        })
        res.status(201).json({ ok: true, request })
      } catch (error) {
        handleError(res, error, 'Error creating upgrade request')
      }
    })

    router.get('/mine', authenticateToken, async (req: Request, res: Response) => {
      try {
        const userId = (req as AuthRequest).user?.userId
        if (!userId) return res.status(401).json({ error: 'Authentication required' })
        res.json({ requests: await this.service.listForUser(userId) })
      } catch (error) {
        handleError(res, error, 'Error listing your upgrade requests')
      }
    })

    // --- Staff queue ---

    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        if (!(await this.requireStaff(req, res))) return
        const status = typeof req.query.status === 'string' ? req.query.status : undefined
        res.json({ requests: await this.service.listForStaff(status) })
      } catch (error) {
        handleError(res, error, 'Error listing upgrade requests')
      }
    })

    router.patch('/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const handledById = await this.requireStaff(req, res)
        if (!handledById) return

        const body = (req.body ?? {}) as Record<string, unknown>
        const request = await this.service.updateForStaff(String(req.params.id || ''), handledById, {
          status: readString(body, 'status'),
          // null clears the link; undefined leaves it untouched.
          organizationId:
            body.organizationId === undefined
              ? undefined
              : body.organizationId === null
                ? null
                : String(body.organizationId),
          note: body.note === undefined ? undefined : readString(body, 'note') ?? null,
          externalPaymentId:
            body.externalPaymentId === undefined ? undefined : readString(body, 'externalPaymentId') ?? null,
          hostedCheckoutUrl:
            body.hostedCheckoutUrl === undefined ? undefined : readString(body, 'hostedCheckoutUrl') ?? null,
        })
        res.json({ ok: true, request })
      } catch (error) {
        handleError(res, error, 'Error updating upgrade request')
      }
    })

    return router
  }
}
