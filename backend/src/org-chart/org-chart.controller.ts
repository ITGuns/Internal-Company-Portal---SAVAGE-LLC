import express, { Request, Response, Router } from 'express'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { createLogger } from '../observability/logger'
import { resolveViewerAccess } from './org-chart.access'
import { OrgChartService } from './org-chart.service'

const logger = createLogger('org-chart.controller')

/**
 * GET /api/org-chart: the member-facing org chart. Reporting lines are edited
 * through PATCH /api/users/:id { managerId }, which keeps its own guards and
 * cycle check; `viewer` only tells the page which of those actions to offer.
 */
export class OrgChartController {
  private service = new OrgChartService()

  router(): Router {
    const router = express.Router()

    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const authUser = (req as AuthRequest).user!
        const viewer = await resolveViewerAccess(authUser.userId, authUser.email)
        if (!viewer.canReadDirectory) {
          return res.status(403).json({ error: 'The org chart is only for internal members' })
        }

        const members = await this.service.listMembers()
        res.json({
          viewer: {
            id: viewer.id,
            canEditReportingLines: viewer.canEditReportingLines,
            canSetRoot: viewer.isFullAccess,
            isFullAccess: viewer.isFullAccess,
          },
          members,
        })
      } catch (error) {
        logger.error('Org chart load failed', error)
        res.status(500).json({ error: 'Could not load the org chart' })
      }
    })

    return router
  }
}
