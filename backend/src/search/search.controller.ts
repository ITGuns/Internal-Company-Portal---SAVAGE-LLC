import express, { Request, Response, Router } from 'express'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { isAdminEmail } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'
import { buildGlobalSearchAccess, normalizeGlobalSearchQuery } from './search.access'
import { GlobalSearchService } from './search.service'

const logger = createLogger('search.search.controller')

export class SearchController {
  private service = new GlobalSearchService()

  router(): Router {
    const router = express.Router()

    router.get('/', authenticateToken, async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest
        const requesterId = authReq.user?.userId
        if (!requesterId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const query = normalizeGlobalSearchQuery(req.query.q)
        if (query.length < 2) {
          return res.json([])
        }

        const limit = Math.min(8, Math.max(1, Number(req.query.limit) || 5))
        const [roles, memberships] = await Promise.all([
          prisma.userRole.findMany({
            where: { userId: requesterId },
            include: {
              department: {
                select: { name: true },
              },
            },
          }),
          prisma.clientMembership.findMany({
            where: {
              userId: requesterId,
              status: 'active',
              organization: {
                status: 'active',
              },
            },
            select: {
              organizationId: true,
              status: true,
            },
          }),
        ])

        const access = buildGlobalSearchAccess({
          requesterId,
          roles,
          memberships,
          isConfiguredAdminEmail: isAdminEmail(authReq.user?.email),
        })
        const results = await this.service.search(query, access, limit)
        res.json(results)
      } catch (error) {
        logger.error('Global search failed:', error)
        res.status(500).json({ error: 'Failed to search' })
      }
    })

    return router
  }
}
