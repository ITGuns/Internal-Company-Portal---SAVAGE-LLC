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
  serializeClientActivities,
  serializeClientApprovalForClient,
  serializeClientOrganizationForClient,
  serializeClientOrganizationForManagement,
  serializeClientApprovalForManagement,
  serializeClientAssetForManagement,
  serializeClientBillingStatusForManagement,
  serializeClientCalendarItemForClient,
  serializeClientCalendarItemForManagement,
  serializeClientInvitedUserForManagement,
  serializeClientMembershipForManagement,
  serializeClientMetricSnapshotForManagement,
  serializeClientPortalOverview,
  serializeClientProjectForManagement,
  serializeClientResourceLinkForClient,
  serializeClientResourceLinkForManagement,
  serializeClientRoadmapRecommendationForManagement,
  serializeClientReportForManagement,
  serializeClientServiceTierForManagement,
  serializeClientTicketForClient,
  serializeClientTicketForManagement,
  serializeClientUpdateForManagement,
  serializeClientWorkItemForManagement,
} from './clients.serializers'
import { ClientsService } from './clients.service'
import {
  ClientValidationError,
  parseClientApprovalResponseInput,
  parseClientActivityQuery,
  parseCreateClientApprovalInput,
  parseCreateClientAssetInput,
  parseCreateClientCalendarItemInput,
  parseCreateClientReportInput,
  parseCreateClientRoadmapRecommendationInput,
  parseCreateClientServiceTierInput,
  parseCreateClientWorkItemInput,
  parseCreateClientOrganizationInput,
  parseCreateClientMembershipInput,
  parseCreateClientMetricSnapshotInput,
  parseCreateClientProjectInput,
  parseCreateClientResourceLinkInput,
  parseCreateClientTicketCommentInput,
  parseCreateClientTicketInput,
  parseCreateClientUpdateInput,
  parseGenerateClientReportDraftInput,
  parseInviteClientUserInput,
  parseUpdateClientApprovalInput,
  parseUpdateClientAssetInput,
  parseUpdateClientCalendarItemInput,
  parseUpdateClientMembershipInput,
  parseUpdateClientOrganizationServiceTierInput,
  parseUpdateClientOrganizationStatusInput,
  parseUpdateClientProjectInput,
  parseUpdateClientReportInput,
  parseUpdateClientResourceLinkInput,
  parseUpdateClientRoadmapRecommendationInput,
  parseUpdateClientServiceTierInput,
  parseUpdateClientTicketInput,
  parseUpdateClientTicketStatusInput,
  parseUpdateClientWorkItemInput,
  parseUpsertClientBillingStatusInput,
} from './clients.validation'

interface ClientOwnedResourceAccessRecord {
  organizationId: string
  createdById?: string | null
  type: string
}

function canMutateClientOwnedResource(access: ClientAccessContext, resource: ClientOwnedResourceAccessRecord): boolean {
  if (access.isPrivileged) return true
  if (!canReadClientOrganization(access, { id: resource.organizationId })) return false
  return resource.type === 'client_link' && resource.createdById === access.requesterId
}

interface ClientOwnedCalendarItemAccessRecord {
  organizationId: string
  createdById?: string | null
}

function canMutateClientOwnedCalendarItem(access: ClientAccessContext, item: ClientOwnedCalendarItemAccessRecord): boolean {
  if (access.isPrivileged) return true
  if (!canReadClientOrganization(access, { id: item.organizationId })) return false
  return item.createdById === access.requesterId
}

function formatClientStatusLabel(status: string): string {
  return status
    .split('_')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

function getClientTicketStatusUpdateCopy(status: string) {
  switch (status) {
    case 'new':
      return {
        title: 'Ticket reopened',
        bodyStatus: 'has been reopened',
      }
    case 'review':
      return {
        title: 'Ticket now in review',
        bodyStatus: 'is now in review',
      }
    case 'in_progress':
      return {
        title: 'Ticket now in progress',
        bodyStatus: 'is now in progress',
      }
    case 'done':
      return {
        title: 'Ticket marked done',
        bodyStatus: 'has been marked done',
      }
    default: {
      const statusLabel = formatClientStatusLabel(status)
      return {
        title: `Ticket moved to ${statusLabel}`,
        bodyStatus: `is now ${statusLabel.toLowerCase()}`,
      }
    }
  }
}

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
          organization: {
            status: 'active',
          },
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

    router.get('/activity/queue', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const requestedOrganizationId = typeof req.query.organizationId === 'string'
          ? req.query.organizationId.trim()
          : undefined
        if (requestedOrganizationId && !canReadClientOrganization(access, { id: requestedOrganizationId })) {
          return res.status(403).json({ error: 'You can only view queue items for your assigned client organization' })
        }

        const queue = await this.service.listActionQueue({
          organizationIds: requestedOrganizationId
            ? [requestedOrganizationId]
            : access.isPrivileged
              ? undefined
              : getActiveClientOrganizationIds(access),
          includeInternal: access.isPrivileged,
          audience: access.isPrivileged ? 'management' : 'client',
        })

        res.json(queue)
      } catch (error) {
        console.error('[Clients] Error listing activity queue:', error)
        res.status(500).json({ error: 'Failed to fetch client action queue' })
      }
    })

    router.get('/portal/bootstrap', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const requestedOrganizationId = typeof req.query.organizationId === 'string'
          ? req.query.organizationId.trim()
          : undefined
        if (requestedOrganizationId && !canReadClientOrganization(access, { id: requestedOrganizationId })) {
          return res.status(403).json({ error: 'You can only view your assigned client organization' })
        }

        const organizations = await this.service.findOrganizations(getClientOrganizationVisibilityFilter(access))
        const selectedId = requestedOrganizationId || organizations[0]?.id || ''
        const serializedOrganizations = organizations.map((organization) =>
          access.isPrivileged
            ? serializeClientOrganizationForManagement(organization)
            : serializeClientOrganizationForClient(organization),
        )

        if (!selectedId) {
          return res.json({
            organizations: serializedOrganizations,
            selectedId: '',
            overview: null,
            activities: [],
            queueItems: [],
          })
        }

        const [organization, activities, queueItems] = await Promise.all([
          this.service.findOrganizationOverview(selectedId, !access.isPrivileged),
          this.service.listActivities(selectedId, { limit: 30 }, access.isPrivileged),
          this.service.listActionQueue({
            organizationIds: [selectedId],
            includeInternal: access.isPrivileged,
            audience: access.isPrivileged ? 'management' : 'client',
          }),
        ])

        if (!organization) {
          return res.status(404).json({ error: 'Client organization not found' })
        }

        res.json({
          organizations: serializedOrganizations,
          selectedId,
          overview: serializeClientPortalOverview(organization, access.isPrivileged),
          activities: serializeClientActivities(activities, access.isPrivileged),
          queueItems,
        })
      } catch (error) {
        console.error('[Clients] Error bootstrapping client portal:', error)
        res.status(500).json({ error: 'Failed to load client portal workspace' })
      }
    })

    router.get('/service-tiers', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage service tiers' })
        }

        const tiers = await this.service.findServiceTiers()
        res.json(tiers.map((tier) => serializeClientServiceTierForManagement(tier)))
      } catch (error) {
        console.error('[Clients] Error listing service tiers:', error)
        res.status(500).json({ error: 'Failed to fetch service tiers' })
      }
    })

    router.post('/service-tiers', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage service tiers' })
        }

        const tier = await this.service.createServiceTier(parseCreateClientServiceTierInput(req.body || {}))
        res.status(201).json(serializeClientServiceTierForManagement(tier))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
          return res.status(409).json({ error: 'Service tier name already exists' })
        }

        console.error('[Clients] Error creating service tier:', error)
        res.status(500).json({ error: 'Failed to create service tier' })
      }
    })

    router.patch('/service-tiers/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage service tiers' })
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const tier = await this.service.updateServiceTier(id, parseUpdateClientServiceTierInput(req.body || {}))
        res.json(serializeClientServiceTierForManagement(tier))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2025') {
          return res.status(404).json({ error: 'Service tier not found' })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
          return res.status(409).json({ error: 'Service tier name already exists' })
        }

        console.error('[Clients] Error updating service tier:', error)
        res.status(500).json({ error: 'Failed to update service tier' })
      }
    })

    router.delete('/service-tiers/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage service tiers' })
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        res.json(await this.service.deleteServiceTier(id))
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2025') {
          return res.status(404).json({ error: 'Service tier not found' })
        }

        console.error('[Clients] Error deleting service tier:', error)
        res.status(500).json({ error: 'Failed to delete service tier' })
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

    router.patch('/organizations/:id/service-tier', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client service tiers' })
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const organization = await this.service.updateOrganizationServiceTier(
          id,
          parseUpdateClientOrganizationServiceTierInput(req.body || {}),
          access.requesterId,
        )

        res.json(serializeClientOrganizationForManagement(organization))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2025') {
          return res.status(404).json({ error: 'Client organization not found' })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid service tier' })
        }

        console.error('[Clients] Error updating organization service tier:', error)
        res.status(500).json({ error: 'Failed to update client service tier' })
      }
    })

    router.patch('/organizations/:id/status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can remove client access' })
        }

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const organization = await this.service.updateOrganizationStatus(
          id,
          parseUpdateClientOrganizationStatusInput(req.body || {}),
          access.requesterId,
        )

        res.json(serializeClientOrganizationForManagement(organization))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2025') {
          return res.status(404).json({ error: 'Client organization not found' })
        }

        console.error('[Clients] Error updating organization status:', error)
        res.status(500).json({ error: 'Failed to update client organization status' })
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

    router.get('/organizations/:id/activity', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        if (!canReadClientOrganization(access, { id })) {
          return res.status(403).json({ error: 'You can only view activity for your assigned client organization' })
        }

        const activities = await this.service.listActivities(
          id,
          parseClientActivityQuery(req.query as Record<string, unknown>),
          access.isPrivileged,
        )

        res.json(serializeClientActivities(activities, access.isPrivileged))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error fetching organization activity:', error)
        res.status(500).json({ error: 'Failed to fetch client activity' })
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

    router.patch('/memberships/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can manage client memberships' })
        }

        const membershipId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const membership = await this.service.findMembershipById(membershipId)
        if (!membership) return res.status(404).json({ error: 'Client membership not found' })

        const updatedMembership = await this.service.updateMembership(
          membershipId,
          parseUpdateClientMembershipInput(req.body || {}),
        )
        res.json(serializeClientMembershipForManagement(updatedMembership))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating membership:', error)
        res.status(500).json({ error: 'Failed to update client membership' })
      }
    })

    router.post('/organizations/:id/invitations', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can invite client users' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const invitation = await this.service.inviteClientUser(
          organizationId,
          parseInviteClientUserInput(req.body || {}),
        )

        res.status(201).json({
          user: serializeClientInvitedUserForManagement(invitation.user),
          membership: serializeClientMembershipForManagement(invitation.membership),
          invite: invitation.invite,
        })
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error inviting client user:', error)
        res.status(500).json({ error: 'Failed to invite client user' })
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

    router.patch('/projects/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client projects' })
        }

        const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const project = await this.service.findProjectById(projectId)
        if (!project) return res.status(404).json({ error: 'Client project not found' })

        const updatedProject = await this.service.updateProject(
          projectId,
          parseUpdateClientProjectInput(req.body || {}),
        )
        res.json(serializeClientProjectForManagement(updatedProject))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating project:', error)
        res.status(500).json({ error: 'Failed to update client project' })
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
        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        if (!canManageClientOrganization(access) && !canReadClientOrganization(access, { id: organizationId })) {
          return res.status(403).json({ error: 'You can only share resources for your assigned client organization' })
        }

        const input = parseCreateClientResourceLinkInput(req.body || {})
        const resource = await this.service.createResourceLink(
          organizationId,
          access.isPrivileged
            ? { ...input, createdById: access.requesterId }
            : {
              label: input.label,
              url: input.url,
              type: 'client_link',
              visibleToClient: true,
              createdById: access.requesterId,
            },
        )
        res.status(201).json(
          access.isPrivileged
            ? serializeClientResourceLinkForManagement(resource)
            : serializeClientResourceLinkForClient(resource),
        )
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

    router.patch('/resources/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const resourceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const resource = await this.service.findResourceLinkById(resourceId)
        if (!resource) return res.status(404).json({ error: 'Client resource not found' })
        if (!canMutateClientOwnedResource(access, resource)) {
          return res.status(403).json({ error: 'You can only edit resources you shared in your client workspace' })
        }

        const input = parseUpdateClientResourceLinkInput(req.body || {})
        const updatedResource = await this.service.updateResourceLink(
          resourceId,
          resource.organizationId,
          access.isPrivileged
            ? input
            : {
              ...(input.label ? { label: input.label } : {}),
              ...(input.url ? { url: input.url } : {}),
              type: 'client_link',
              visibleToClient: true,
            },
        )

        res.json(
          access.isPrivileged
            ? serializeClientResourceLinkForManagement(updatedResource)
            : serializeClientResourceLinkForClient(updatedResource),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid project' })
        }

        console.error('[Clients] Error updating resource:', error)
        res.status(500).json({ error: 'Failed to update client resource' })
      }
    })

    router.delete('/resources/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const resourceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const resource = await this.service.findResourceLinkById(resourceId)
        if (!resource) return res.status(404).json({ error: 'Client resource not found' })
        if (!canMutateClientOwnedResource(access, resource)) {
          return res.status(403).json({ error: 'You can only delete resources you shared in your client workspace' })
        }

        await this.service.deleteResourceLink(resourceId)
        res.status(204).send()
      } catch (error) {
        console.error('[Clients] Error deleting resource:', error)
        res.status(500).json({ error: 'Failed to delete client resource' })
      }
    })

    router.post('/organizations/:id/work-items', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client work items' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const workItem = await this.service.createWorkItem(
          organizationId,
          access.requesterId,
          parseCreateClientWorkItemInput(req.body || {}),
        )
        res.status(201).json(serializeClientWorkItemForManagement(workItem))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization, project, or assigned user' })
        }

        console.error('[Clients] Error creating work item:', error)
        res.status(500).json({ error: 'Failed to create client work item' })
      }
    })

    router.patch('/work-items/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client work items' })
        }

        const workItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const workItem = await this.service.findWorkItemById(workItemId)
        if (!workItem) return res.status(404).json({ error: 'Client work item not found' })

        const updatedWorkItem = await this.service.updateWorkItem(
          workItemId,
          workItem.organizationId,
          parseUpdateClientWorkItemInput(req.body || {}),
        )
        res.json(serializeClientWorkItemForManagement(updatedWorkItem))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid project or assigned user' })
        }

        console.error('[Clients] Error updating work item:', error)
        res.status(500).json({ error: 'Failed to update client work item' })
      }
    })

    router.post('/organizations/:id/approvals', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client approvals' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const approval = await this.service.createApproval(
          organizationId,
          access.requesterId,
          parseCreateClientApprovalInput(req.body || {}),
        )
        res.status(201).json(serializeClientApprovalForManagement(approval))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating approval:', error)
        res.status(500).json({ error: 'Failed to create client approval' })
      }
    })

    router.patch('/approvals/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client approvals' })
        }

        const approvalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const approval = await this.service.findApprovalById(approvalId)
        if (!approval) return res.status(404).json({ error: 'Client approval not found' })

        const updatedApproval = await this.service.updateApproval(
          approvalId,
          approval.organizationId,
          access.requesterId,
          parseUpdateClientApprovalInput(req.body || {}),
        )
        res.json(serializeClientApprovalForManagement(updatedApproval))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating approval:', error)
        res.status(500).json({ error: 'Failed to update client approval' })
      }
    })

    router.patch('/approvals/:id/respond', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const approvalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const approval = await this.service.findApprovalById(approvalId)
        if (!approval) return res.status(404).json({ error: 'Client approval not found' })
        if (!approval.visibleToClient || !canReadClientOrganization(access, { id: approval.organizationId })) {
          return res.status(403).json({ error: 'You can only respond to approvals for your assigned client organization' })
        }

        const updatedApproval = await this.service.updateApproval(
          approvalId,
          approval.organizationId,
          access.requesterId,
          parseClientApprovalResponseInput(req.body || {}),
        )
        res.json(serializeClientApprovalForClient(updatedApproval))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error responding to approval:', error)
        res.status(500).json({ error: 'Failed to respond to client approval' })
      }
    })

    router.post('/organizations/:id/reports/draft', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can generate client report drafts' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const report = await this.service.generateReportDraft(
          organizationId,
          access.requesterId,
          parseGenerateClientReportDraftInput(req.body || {}),
        )
        res.status(201).json(serializeClientReportForManagement(report))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error generating report draft:', error)
        res.status(500).json({ error: 'Failed to generate client report draft' })
      }
    })

    router.post('/organizations/:id/reports', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client reports' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const report = await this.service.createReport(
          organizationId,
          access.requesterId,
          parseCreateClientReportInput(req.body || {}),
        )
        res.status(201).json(serializeClientReportForManagement(report))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error creating report:', error)
        res.status(500).json({ error: 'Failed to create client report' })
      }
    })

    router.patch('/reports/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client reports' })
        }

        const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const report = await this.service.findReportById(reportId)
        if (!report) return res.status(404).json({ error: 'Client report not found' })

        const updatedReport = await this.service.updateReport(reportId, parseUpdateClientReportInput(req.body || {}))
        res.json(serializeClientReportForManagement(updatedReport))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating report:', error)
        res.status(500).json({ error: 'Failed to update client report' })
      }
    })

    router.post('/organizations/:id/roadmap', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create roadmap recommendations' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const roadmap = await this.service.createRoadmapRecommendation(
          organizationId,
          parseCreateClientRoadmapRecommendationInput(req.body || {}),
        )
        res.status(201).json(serializeClientRoadmapRecommendationForManagement(roadmap))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error creating roadmap recommendation:', error)
        res.status(500).json({ error: 'Failed to create roadmap recommendation' })
      }
    })

    router.patch('/roadmap/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update roadmap recommendations' })
        }

        const roadmapId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const roadmap = await this.service.findRoadmapRecommendationById(roadmapId)
        if (!roadmap) return res.status(404).json({ error: 'Roadmap recommendation not found' })

        const updatedRoadmap = await this.service.updateRoadmapRecommendation(
          roadmapId,
          parseUpdateClientRoadmapRecommendationInput(req.body || {}),
        )
        res.json(serializeClientRoadmapRecommendationForManagement(updatedRoadmap))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating roadmap recommendation:', error)
        res.status(500).json({ error: 'Failed to update roadmap recommendation' })
      }
    })

    router.post('/organizations/:id/assets', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can create client assets' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const asset = await this.service.createAsset(organizationId, parseCreateClientAssetInput(req.body || {}))
        res.status(201).json(serializeClientAssetForManagement(asset))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating asset:', error)
        res.status(500).json({ error: 'Failed to create client asset' })
      }
    })

    router.patch('/assets/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client assets' })
        }

        const assetId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const asset = await this.service.findAssetById(assetId)
        if (!asset) return res.status(404).json({ error: 'Client asset not found' })

        const updatedAsset = await this.service.updateAsset(
          assetId,
          asset.organizationId,
          parseUpdateClientAssetInput(req.body || {}),
        )
        res.json(serializeClientAssetForManagement(updatedAsset))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating asset:', error)
        res.status(500).json({ error: 'Failed to update client asset' })
      }
    })

    router.patch('/organizations/:id/billing-status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client billing status' })
        }

        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const billing = await this.service.upsertBillingStatus(
          organizationId,
          parseUpsertClientBillingStatusInput(req.body || {}),
          access.requesterId,
        )
        res.json(serializeClientBillingStatusForManagement(billing))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization' })
        }

        console.error('[Clients] Error updating billing status:', error)
        res.status(500).json({ error: 'Failed to update client billing status' })
      }
    })

    router.post('/organizations/:id/calendar-items', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        const organizationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        if (!canManageClientOrganization(access) && !canReadClientOrganization(access, { id: organizationId })) {
          return res.status(403).json({ error: 'You can only add calendar items for your assigned client organization' })
        }

        const input = parseCreateClientCalendarItemInput(req.body || {})
        const calendarItem = await this.service.createCalendarItem(
          organizationId,
          access.requesterId,
          access.isPrivileged
            ? input
            : {
              title: input.title,
              description: input.description,
              channel: input.channel,
              status: 'planned',
              startAt: input.startAt,
              endAt: input.endAt,
              visibleToClient: true,
            },
        )
        res.status(201).json(
          access.isPrivileged
            ? serializeClientCalendarItemForManagement(calendarItem)
            : serializeClientCalendarItemForClient(calendarItem),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }
        if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
          return res.status(400).json({ error: 'Invalid client organization or project' })
        }

        console.error('[Clients] Error creating calendar item:', error)
        res.status(500).json({ error: 'Failed to create calendar item' })
      }
    })

    router.patch('/calendar-items/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const calendarItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const calendarItem = await this.service.findCalendarItemById(calendarItemId)
        if (!calendarItem) return res.status(404).json({ error: 'Calendar item not found' })
        if (!canMutateClientOwnedCalendarItem(access, calendarItem)) {
          return res.status(403).json({ error: 'You can only edit calendar items you added in your client workspace' })
        }

        const input = parseUpdateClientCalendarItemInput(req.body || {})
        const updatedCalendarItem = await this.service.updateCalendarItem(
          calendarItemId,
          calendarItem.organizationId,
          access.isPrivileged
            ? input
            : {
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.channel !== undefined ? { channel: input.channel } : {}),
              ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
              ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
              status: 'planned',
              visibleToClient: true,
            },
          access.requesterId,
        )
        res.json(
          access.isPrivileged
            ? serializeClientCalendarItemForManagement(updatedCalendarItem)
            : serializeClientCalendarItemForClient(updatedCalendarItem),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating calendar item:', error)
        res.status(500).json({ error: 'Failed to update calendar item' })
      }
    })

    router.delete('/calendar-items/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const calendarItemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const calendarItem = await this.service.findCalendarItemById(calendarItemId)
        if (!calendarItem) return res.status(404).json({ error: 'Calendar item not found' })
        if (!canMutateClientOwnedCalendarItem(access, calendarItem)) {
          return res.status(403).json({ error: 'You can only delete calendar items you added in your client workspace' })
        }

        await this.service.deleteCalendarItem(calendarItemId, access.requesterId, calendarItem)
        res.status(204).send()
      } catch (error) {
        console.error('[Clients] Error deleting calendar item:', error)
        res.status(500).json({ error: 'Failed to delete calendar item' })
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

    router.patch('/tickets/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const ticket = await this.service.findTicketById(ticketId)
        if (!ticket) return res.status(404).json({ error: 'Client ticket not found' })
        if (!canReadClientOrganization(access, { id: ticket.organizationId })) {
          return res.status(403).json({ error: 'You can only edit tickets for your assigned client organization' })
        }
        if (!access.isPrivileged && ticket.status === 'done') {
          return res.status(409).json({ error: 'Completed requests cannot be edited from the client workspace' })
        }

        const updatedTicket = await this.service.updateTicket(
          ticketId,
          parseUpdateClientTicketInput(req.body || {}),
          access.requesterId,
        )

        res.json(
          access.isPrivileged
            ? serializeClientTicketForManagement(updatedTicket)
            : serializeClientTicketForClient(updatedTicket),
        )
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating ticket:', error)
        res.status(500).json({ error: 'Failed to update client ticket' })
      }
    })

    router.delete('/tickets/:id', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })

        const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const ticket = await this.service.findTicketById(ticketId)
        if (!ticket) return res.status(404).json({ error: 'Client ticket not found' })
        if (!canReadClientOrganization(access, { id: ticket.organizationId })) {
          return res.status(403).json({ error: 'You can only delete tickets for your assigned client organization' })
        }
        if ((ticket.comments || []).length > 0) {
          return res.status(409).json({ error: 'Requests with conversation history cannot be deleted. Add a reply or ask the team to close it instead.' })
        }
        if (!access.isPrivileged && ticket.status === 'done') {
          return res.status(409).json({ error: 'Completed requests cannot be deleted from the client workspace' })
        }

        await this.service.deleteTicket(ticketId, access.requesterId)
        res.status(204).send()
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(404).json({ error: error.message })
        }

        console.error('[Clients] Error deleting ticket:', error)
        res.status(500).json({ error: 'Failed to delete client ticket' })
      }
    })

    router.patch('/tickets/:id/status', authenticateToken, async (req: Request, res: Response) => {
      try {
        const access = await this.getAccessContext(req)
        if (!access) return res.status(401).json({ error: 'Authentication required' })
        if (!canManageClientOrganization(access)) {
          return res.status(403).json({ error: 'Only operations managers and admins can update client tickets' })
        }

        const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
        const ticket = await this.service.findTicketById(ticketId)
        if (!ticket) return res.status(404).json({ error: 'Client ticket not found' })

        const { status } = parseUpdateClientTicketStatusInput(req.body || {})
        const updatedTicket = await this.service.updateTicketStatus(ticketId, status, access.requesterId)

        if (ticket.status !== status) {
          const updateCopy = getClientTicketStatusUpdateCopy(status)
          await this.service.createUpdate(ticket.organizationId, access.requesterId, {
            title: updateCopy.title,
            body: `${ticket.title} ${updateCopy.bodyStatus}.`,
            status: 'published',
            visibleToClient: true,
            projectId: ticket.projectId || undefined,
          })
        }

        res.json(serializeClientTicketForManagement(updatedTicket))
      } catch (error) {
        if (error instanceof ClientValidationError) {
          return res.status(400).json({ error: error.message })
        }

        console.error('[Clients] Error updating ticket status:', error)
        res.status(500).json({ error: 'Failed to update client ticket status' })
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
          ticket.organizationId,
          access.requesterId,
          parseCreateClientTicketCommentInput(req.body || {}, access.isPrivileged),
          ticket.title,
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
