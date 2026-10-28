import express, { NextFunction, Request, Response, Router } from 'express'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { createLogger } from '../observability/logger'
import { resolveViewerAccess } from '../org-chart/org-chart.access'
import { ConcernsService } from './concerns.service'
import {
  ConcernError,
  parseBox,
  parseSearch,
  parseStatusFilter,
  readBody,
  readPersonId,
  readSubject,
  type ConcernActor,
} from './concerns.rules'

const logger = createLogger('concerns.controller')

type ConcernRequest = Request & { concernActor?: ConcernActor }

function routeId(req: Request): string {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  return String(id || '').trim()
}

/**
 * Concerns: internal tickets a member raises with a supervisor.
 * Internal members only (the user directory rule); every route answers
 * ConcernError statuses as { error } and anything else as 500.
 */
export class ConcernsController {
  private service = new ConcernsService()

  private handle(run: (req: ConcernRequest, actor: ConcernActor) => Promise<unknown>, successStatus = 200) {
    return async (req: Request, res: Response) => {
      try {
        const concernRequest = req as ConcernRequest
        const result = await run(concernRequest, concernRequest.concernActor!)
        res.status(successStatus).json(result)
      } catch (error) {
        if (error instanceof ConcernError) {
          return res.status(error.status).json({ error: error.message })
        }
        logger.error('Concern request failed', error)
        res.status(500).json({ error: 'Something went wrong with this concern. Try again.' })
      }
    }
  }

  private async resolveActor(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = (req as AuthRequest).user!
      const access = await resolveViewerAccess(authUser.userId, authUser.email)
      if (!access.canReadDirectory) {
        return res.status(403).json({ error: 'Concerns are only for internal members' })
      }
      ;(req as ConcernRequest).concernActor = {
        id: access.id,
        displayName: access.displayName,
        isFullAccess: access.isFullAccess,
      }
      next()
    } catch (error) {
      logger.error('Concern access check failed', error)
      res.status(500).json({ error: 'Could not check your access. Try again.' })
    }
  }

  router(): Router {
    const router = express.Router()
    router.use(authenticateToken, (req, res, next) => void this.resolveActor(req, res, next))

    // GET /api/concerns?box=inbox|sent|all&status=open|answered|closed&q=
    router.get('/', this.handle((req, actor) => this.service.list(actor, {
      box: parseBox(req.query.box),
      status: parseStatusFilter(req.query.status),
      q: parseSearch(req.query.q),
    })))

    // POST /api/concerns { assigneeId, subject, body }
    router.post('/', this.handle((req, actor) => this.service.create(actor, {
      assigneeId: readPersonId(req.body?.assigneeId, 'Supervisor'),
      subject: readSubject(req.body?.subject),
      body: readBody(req.body?.body),
    }), 201))

    router.get('/:id', this.handle((req, actor) => this.service.getDetail(routeId(req), actor)))

    // POST /api/concerns/:id/messages { body }
    router.post('/:id/messages', this.handle((req, actor) =>
      this.service.reply(routeId(req), actor, readBody(req.body?.body)), 201))

    router.post('/:id/close', this.handle((req, actor) => this.service.close(routeId(req), actor)))
    router.post('/:id/reopen', this.handle((req, actor) => this.service.reopen(routeId(req), actor)))

    // PATCH /api/concerns/:id { assigneeId } reassigns
    router.patch('/:id', this.handle((req, actor) =>
      this.service.reassign(routeId(req), actor, readPersonId(req.body?.assigneeId, 'New assignee'))))

    return router
  }
}
