import express, { Request, Response, Router } from 'express'
import { AuthRequest, authenticateToken } from '../auth/auth.middleware'
import { isAdminEmail } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import {
  canCreateClientTicket,
  canManageClientOrganization,
  canReadClientOrganization,
  getActiveClientOrganizationIds,
  getClientOrganizationVisibilityFilter,
  hasClientManagementAccess,
  type ClientAccessContext,
} from './clients.access'
import {
  serializeClientOrganizationForClient,
  serializeClientOrganizationForManagement,
  serializeClientPortalOverview,
  serializeClientTicketForClient,
  serializeClientTicketForManagement,
} from './clients.serializers'
import { ClientsService } from './clients.service'
import {
  ClientValidationError,
  parseCreateClientOrganizationInput,
  parseCreateClientTicketInput,
} from './clients.validation'

export class ClientsController {
  private service = new ClientsService()

  private async getAccessContext(req: Request): Promise<ClientAccessContext | null> {
    const authReq = req as AuthRequest
    const requesterId = authReq.user?.userId
    if (!requesterId) return null

    const [roles, memberships] = await Promise.all([
      prisma.userRole.findMany({
        where: { userId: requesterId },
        select: { role: true },
      }),
      prisma.clientMembership.findMany({
        where: {
          userId: requesterId,
          status: 'active',
        },
        select: {
          organizationId: true,
          role: true,
          status: true,
        },
      }),
    ])

    return {
      requesterId,
      isPrivileged: hasClientManagementAccess(roles, isAdminEmail(authReq.user?.email)),
      memberships,
    }
  }

  router(): Router {
    const router = express.Router()

    router.get('/organizations', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const organizations = await this.service.findOrganizations(getClientOrganizationVisibilityFilter(access))
        const response = organizations.map((organization) =>
          access.isPrivileged
            ? serializeClientOrganizationForManagement(organization)
            : serializeClientOrganizationForClient(organization),
        )

        res.json(response)
      } catch (error) {
        console.error('[Clients] Error listing organizations:', error)
        res.status(500).json({ error: 'Failed to fetch client organizations' })
      }
    })

    router.post('/organizations', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create clients' })
        }

        const organization = await this.service.createOrganization(parseCreateClientOrganizationInput(req.body || {}))
        res.status(201).json(serializeClientOrganizationForManagement(organization))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
          return res.status(409).json({ error: 'Client organization slug already exists' })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid service tier' })
        }

        console.error('[Clients] Error creating organization:', error)
        res.status(500).json({ error: 'Failed to create client organization' })
      }
    })

    router.get('/organizations/:id/overview', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        if (!canReadClientOrganization(access, { id })) {
          return res.status(403).json({ error: 'You can only view your assigned client organization' })
        }

        const organization = await this.service.findOrganizationOverview(id, !access.isPrivileged)
        if (!organization) return res.status(404).json({ error: 'Client organization not found' })

        res.json(serializeClientPortalOverview(organization, access.isPrivileged))
      } catch (error) {
        console.error('[Clients] Error fetching organization overview:', error)
        res.status(500).json({ error: 'Failed to fetch client overview' })
      }
    })

    router.post('/organizations/:id/tickets', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        if (!canCreateClientTicket(access, organizationId)) {
          return res.status(403).json({ error: 'You can only create tickets for your assigned client organization' })
        }

        const ticket = await this.service.createTicket(
          organizationId,
          access.requesterId,
          parseCreateClientTicketInput(req.body || {}),
        )

        res.status(201).json(
          access.isPrivileged ? serializeClientTicketForManagement(ticket) : serializeClientTicketForClient(ticket),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating ticket:', error)
        res.status(500).json({ error: 'Failed to create client ticket' })
      }
    })

    router.get('/tickets', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined
        if (organizationId && !canReadClientOrganization(access, { id: organizationId })) {
          return res.status(403).json({ error: 'You can only view tickets for your assigned client organization' })
        }

        const organizationIds = getActiveClientOrganizationIds(access)
        const tickets = await this.service.findTickets({
          ...(organizationId ? { organizationId } : {}),
          ...(!access.isPrivileged && !organizationId ? { organizationId: { in: organizationIds } } : {}),
        })

        res.json(tickets.map((ticket) =>
          access.isPrivileged ? serializeClientTicketForManagement(ticket) : serializeClientTicketForClient(ticket),
        ))
      } catch (error) {
        console.error('[Clients] Error listing tickets:', error)
        res.status(500).json({ error: 'Failed to fetch client tickets' })
      }
    })

    return router
  }
}
