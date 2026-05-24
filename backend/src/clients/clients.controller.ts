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
  serializeClientMembershipForManagement,
  serializeClientMetricSnapshotForManagement,
  serializeClientPortalOverview,
  serializeClientProjectForManagement,
  serializeClientResourceLinkForManagement,
  serializeClientTicketForClient,
  serializeClientTicketForManagement,
  serializeClientUpdateForManagement,
} from './clients.serializers'
import { ClientsService } from './clients.service'
import {
  ClientValidationError,
  parseCreateClientOrganizationInput,
  parseCreateClientMembershipInput,
  parseCreateClientMetricSnapshotInput,
  parseCreateClientProjectInput,
  parseCreateClientResourceLinkInput,
  parseCreateClientTicketCommentInput,
  parseCreateClientTicketInput,
  parseCreateClientUpdateInput,
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

    router.get('/organizations/:id/memberships', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can view client memberships' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const memberships = await this.service.findMemberships(organizationId)
        res.json(memberships.map(serializeClientMembershipForManagement))
      } catch (error) {
        console.error('[Clients] Error listing memberships:', error)
        res.status(500).json({ error: 'Failed to fetch client memberships' })
      }
    })

    router.post('/organizations/:id/memberships', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage client memberships' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const membership = await this.service.createMembership(
          organizationId,
          parseCreateClientMembershipInput(req.body || {}),
        )
        res.status(201).json(serializeClientMembershipForManagement(membership))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or user' })
        }

        console.error('[Clients] Error creating membership:', error)
        res.status(500).json({ error: 'Failed to create client membership' })
      }
    })

    router.post('/organizations/:id/projects', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client projects' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const project = await this.service.createProject(
          organizationId,
          parseCreateClientProjectInput(req.body || {}),
        )
        res.status(201).json(serializeClientProjectForManagement(project))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error creating project:', error)
        res.status(500).json({ error: 'Failed to create client project' })
      }
    })

    router.post('/organizations/:id/updates', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can publish client updates' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const update = await this.service.createUpdate(
          organizationId,
          access.requesterId,
          parseCreateClientUpdateInput(req.body || {}),
        )
        res.status(201).json(serializeClientUpdateForManagement(update))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating update:', error)
        res.status(500).json({ error: 'Failed to create client update' })
      }
    })

    router.post('/organizations/:id/metrics', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client metrics' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const metric = await this.service.createMetricSnapshot(
          organizationId,
          parseCreateClientMetricSnapshotInput(req.body || {}),
        )
        res.status(201).json(serializeClientMetricSnapshotForManagement(metric))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error creating metric:', error)
        res.status(500).json({ error: 'Failed to create client metric' })
      }
    })

    router.post('/organizations/:id/resources', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client resources' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const resource = await this.service.createResourceLink(
          organizationId,
          parseCreateClientResourceLinkInput(req.body || {}),
        )
        res.status(201).json(serializeClientResourceLinkForManagement(resource))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating resource:', error)
        res.status(500).json({ error: 'Failed to create client resource' })
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

    router.post('/tickets/:id/comments', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const ticket = await this.service.findTicketById(ticketId)
        if (!ticket) return res.status(404).json({ error: 'Client ticket not found' })
        if (!canReadClientOrganization(access, { id: ticket.organizationId })) {
          return res.status(403).json({ error: 'You can only comment on tickets for your assigned client organization' })
        }

        await this.service.createTicketComment(
          ticketId,
          access.requesterId,
          parseCreateClientTicketCommentInput(req.body || {}, access.isPrivileged),
        )

        const updatedTicket = await this.service.findTicketById(ticketId)
        if (!updatedTicket) return res.status(404).json({ error: 'Client ticket not found' })

        res.status(201).json(
          access.isPrivileged
            ? serializeClientTicketForManagement(updatedTicket)
            : serializeClientTicketForClient(updatedTicket),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error creating ticket comment:', error)
        res.status(500).json({ error: 'Failed to create client ticket comment' })
      }
    })

    return router
  }
}
