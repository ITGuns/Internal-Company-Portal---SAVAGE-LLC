import { Prisma, PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'
import { ClientBillingService } from './client-billing.service'
import {
  ClientCalendarService,
  type ClientCalendarItemDeleteContext,
} from './client-calendar.service'
import { ClientContentService } from './client-content.service'
import { ClientOrganizationsService } from './client-organizations.service'
import { ClientRoadmapAssetsService } from './client-roadmap-assets.service'
import { ClientServiceTiersService } from './client-service-tiers.service'
import {
  CLIENT_ACTIVITY_TYPES,
  buildApprovalQueueItems,
  buildReportQueueItems,
  buildTicketQueueItems,
  buildWorkItemQueueItems,
  createClientActivity,
  type ClientActionQueueAudience,
  type ClientActionQueueItem,
} from './clients.activity'
import {
  ClientActivityQueryInput,
  CreateClientServiceTierInput,
  CreateClientOrganizationInput,
  CreateClientMembershipInput,
  CreateClientMetricSnapshotInput,
  CreateClientProjectInput,
  CreateClientResourceLinkInput,
  CreateClientRoadmapRecommendationInput,
  CreateClientReportInput,
  CreateClientTicketInput,
  CreateClientTicketCommentInput,
  CreateClientUpdateInput,
  CreateClientWorkItemInput,
  CreateClientApprovalInput,
  CreateClientAssetInput,
  CreateClientCalendarItemInput,
  ClientValidationError,
  GenerateClientReportDraftInput,
  InviteClientUserInput,
  UpdateClientOrganizationServiceTierInput,
  UpdateClientOrganizationStatusInput,
  UpdateClientServiceTierInput,
  UpdateClientApprovalInput,
  UpdateClientAssetInput,
  UpdateClientCalendarItemInput,
  UpdateClientMembershipInput,
  UpdateClientProjectInput,
  UpdateClientResourceLinkInput,
  UpdateClientReportInput,
  UpdateClientRoadmapRecommendationInput,
  UpdateClientTicketInput,
  UpdateClientWorkItemInput,
  UpsertClientBillingStatusInput,
} from './clients.validation'
import { buildClientReportDraftData } from './clients.report-builder'

const CLIENT_INVITE_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const CLIENT_ACTION_QUEUE_STATUS_FILTERS = {
  ticketOpen: ['new', 'review', 'in_progress'],
  workRelevant: ['open', 'in_progress', 'review', 'blocked', 'completed'],
}
const CLIENT_REPORT_PERIOD_LIMIT = 100
const CLIENT_ACTION_QUEUE_CATEGORY_RANK: Record<ClientActionQueueItem['category'], number> = {
  team_response_needed: 0,
  client_response_needed: 1,
  approval_needed: 2,
  work_due_soon: 3,
  report_ready: 4,
  recently_completed: 5,
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return nextDate
}

export class ClientsService {
  private prisma: PrismaClient
  private serviceTiers: ClientServiceTiersService
  private organizations: ClientOrganizationsService
  private billing: ClientBillingService
  private calendar: ClientCalendarService
  private content: ClientContentService
  private roadmapAssets: ClientRoadmapAssetsService

  constructor() {
    this.prisma = prisma
    this.serviceTiers = new ClientServiceTiersService(this.prisma)
    this.organizations = new ClientOrganizationsService(this.prisma)
    this.billing = new ClientBillingService(this.prisma)
    this.calendar = new ClientCalendarService(this.prisma)
    this.content = new ClientContentService(this.prisma)
    this.roadmapAssets = new ClientRoadmapAssetsService(this.prisma)
  }

  async findServiceTiers() {
    return this.serviceTiers.findServiceTiers()
  }

  async createServiceTier(data: CreateClientServiceTierInput) {
    return this.serviceTiers.createServiceTier(data)
  }

  async updateServiceTier(id: string, data: UpdateClientServiceTierInput) {
    return this.serviceTiers.updateServiceTier(id, data)
  }

  async deleteServiceTier(id: string) {
    return this.serviceTiers.deleteServiceTier(id)
  }

  async findOrganizations(where: Prisma.ClientOrganizationWhereInput = {}) {
    return this.prisma.clientOrganization.findMany({
      where,
      include: {
        tier: true,
        _count: {
          select: {
            memberships: true,
            projects: true,
            tickets: true,
            updates: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
    })
  }

  async createOrganization(data: CreateClientOrganizationInput) {
    return this.organizations.createOrganization(data)
  }

  async updateOrganizationServiceTier(id: string, data: UpdateClientOrganizationServiceTierInput, actorId?: string) {
    return this.organizations.updateOrganizationServiceTier(id, data, actorId)
  }

  async updateOrganizationStatus(id: string, data: UpdateClientOrganizationStatusInput, actorId?: string) {
    return this.organizations.updateOrganizationStatus(id, data, actorId)
  }

  async findOrganizationOverview(id: string, clientVisibleOnly: boolean) {
    return this.prisma.clientOrganization.findUnique({
      where: { id },
      include: {
        tier: true,
        projects: {
          orderBy: { updatedAt: 'desc' },
        },
        tickets: {
          include: {
            comments: {
              include: {
                author: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        updates: {
          where: clientVisibleOnly ? { visibleToClient: true, status: 'published' } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        metricSnapshots: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 24,
        },
        resourceLinks: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        memberships: {
          where: clientVisibleOnly ? { status: 'active' } : undefined,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 100,
        },
        workItems: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
          take: 100,
        },
        approvals: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
          take: 50,
        },
        reports: {
          where: clientVisibleOnly ? { visibleToClient: true, status: 'published' } : undefined,
          orderBy: { periodStart: 'desc' },
          take: 24,
        },
        roadmapRecommendations: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
          take: 50,
        },
        assets: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: { updatedAt: 'desc' },
          take: 100,
        },
        billingStatus: true,
        calendarItems: {
          where: clientVisibleOnly ? { visibleToClient: true } : undefined,
          orderBy: { startAt: 'asc' },
          take: 100,
        },
      },
    })
  }

  async listActivities(organizationId: string, query: ClientActivityQueryInput, includeInternal: boolean) {
    const where: Prisma.ClientActivityWhereInput = {
      organizationId,
      visibility: includeInternal ? query.visibility : 'client',
      ...(query.subjectType ? { subjectType: query.subjectType } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    }

    if (includeInternal && !query.visibility) {
      delete where.visibility
    }

    return this.prisma.clientActivity.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    })
  }

  async listActionQueue(options: {
    organizationIds?: string[]
    includeInternal: boolean
    audience: ClientActionQueueAudience
  }) {
    if (options.organizationIds && options.organizationIds.length === 0) return []

    const organizations = await this.prisma.clientOrganization.findMany({
      where: {
        status: { not: 'archived' },
        ...(options.organizationIds ? { id: { in: options.organizationIds } } : {}),
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
    })
    const organizationIds = organizations.map((organization) => organization.id)
    if (organizationIds.length === 0) return []

    const organizationNameById = new Map(
      organizations.map((organization) => [organization.id, organization.name]),
    )

    const [tickets, approvals, workItems, reports] = await Promise.all([
      this.prisma.clientTicket.findMany({
        where: {
          organizationId: { in: organizationIds },
          status: { in: CLIENT_ACTION_QUEUE_STATUS_FILTERS.ticketOpen },
        },
        include: {
          comments: {
            where: { visibility: 'client' },
            include: {
              author: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  avatar: true,
                  roles: {
                    select: { role: true },
                  },
                  clientMemberships: {
                    where: {
                      organizationId: { in: organizationIds },
                      status: 'active',
                    },
                    select: {
                      organizationId: true,
                      role: true,
                      status: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.prisma.clientApproval.findMany({
        where: {
          organizationId: { in: organizationIds },
          status: 'pending',
          visibleToClient: true,
        },
        orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
        take: 100,
      }),
      this.prisma.clientWorkItem.findMany({
        where: {
          organizationId: { in: organizationIds },
          status: { in: CLIENT_ACTION_QUEUE_STATUS_FILTERS.workRelevant },
        },
        orderBy: [{ dueAt: 'asc' }, { updatedAt: 'desc' }],
        take: 150,
      }),
      this.prisma.clientReport.findMany({
        where: {
          organizationId: { in: organizationIds },
          status: 'draft',
        },
        orderBy: [{ periodEnd: 'desc' }, { updatedAt: 'desc' }],
        take: 50,
      }),
    ])

    const queueItems: ClientActionQueueItem[] = []
    for (const ticket of tickets) {
      queueItems.push(...buildTicketQueueItems(
        ticket,
        organizationNameById.get(ticket.organizationId) || 'Client',
        options.audience,
      ))
    }
    for (const approval of approvals) {
      queueItems.push(...buildApprovalQueueItems(
        approval,
        organizationNameById.get(approval.organizationId) || 'Client',
        options.audience,
      ))
    }
    for (const workItem of workItems) {
      queueItems.push(...buildWorkItemQueueItems(
        workItem,
        organizationNameById.get(workItem.organizationId) || 'Client',
        options.audience,
      ))
    }
    for (const report of reports) {
      queueItems.push(...buildReportQueueItems(
        report,
        organizationNameById.get(report.organizationId) || 'Client',
        options.audience,
      ))
    }

    return queueItems
      .filter((item) => options.includeInternal || item.visibility === 'client')
      .sort((left, right) => {
        const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER
        const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER
        if (leftDue !== rightDue) return leftDue - rightDue
        return CLIENT_ACTION_QUEUE_CATEGORY_RANK[left.category] - CLIENT_ACTION_QUEUE_CATEGORY_RANK[right.category]
      })
  }

  async findMemberships(organizationId: string) {
    return this.prisma.clientMembership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createMembership(organizationId: string, data: CreateClientMembershipInput) {
    return this.prisma.clientMembership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: data.userId,
        },
      },
      update: {
        role: data.role,
        status: data.status,
      },
      create: {
        organizationId,
        userId: data.userId,
        role: data.role,
        status: data.status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    })
  }

  async findMembershipById(id: string) {
    return this.prisma.clientMembership.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    })
  }

  async updateMembership(id: string, data: UpdateClientMembershipInput) {
    return this.prisma.clientMembership.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    })
  }

  async inviteClientUser(organizationId: string, data: InviteClientUserInput) {
    const organization = await this.prisma.clientOrganization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    })

    if (!organization) {
      throw new ClientValidationError('Client organization not found')
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true, name: true, password: true },
    })
    const shouldCreateSetupToken = !existingUser?.password
    const setupToken = shouldCreateSetupToken ? crypto.randomBytes(32).toString('hex') : undefined
    const hashedSetupToken = setupToken ? crypto.createHash('sha256').update(setupToken).digest('hex') : undefined
    const setupExpiresAt = setupToken ? new Date(Date.now() + CLIENT_INVITE_TOKEN_EXPIRY_MS) : undefined

    const result = await this.prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            ...(data.name ? { name: data.name } : {}),
            status: 'active',
            isApproved: true,
            ...(hashedSetupToken && setupExpiresAt
              ? {
                passwordResetToken: hashedSetupToken,
                passwordResetExpiry: setupExpiresAt,
              }
              : {}),
          },
        })
        : await tx.user.create({
          data: {
            email: data.email,
            name: data.name,
            status: 'active',
            isApproved: true,
            passwordResetToken: hashedSetupToken,
            passwordResetExpiry: setupExpiresAt,
          },
        })

      const existingClientRole = await tx.userRole.findFirst({
        where: {
          userId: user.id,
          departmentId: null,
          role: 'client',
        },
      })

      if (!existingClientRole) {
        await tx.userRole.create({
          data: {
            userId: user.id,
            role: 'client',
          },
        })
      }

      const membership = await tx.clientMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
        update: {
          role: data.role,
          status: data.status,
        },
        create: {
          organizationId,
          userId: user.id,
          role: data.role,
          status: data.status,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
      })

      return { user, membership }
    })

    const setupUrl = setupToken
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${setupToken}&email=${encodeURIComponent(data.email)}`
      : undefined
    const emailResult = setupUrl
      ? await emailService.sendTemplateEmail(
        data.email,
        `Set up your ${organization.name} client portal access`,
        'password_reset',
        {
          userName: result.user.name || 'Client',
          resetUrl: setupUrl,
          expiresInMinutes: Math.round(CLIENT_INVITE_TOKEN_EXPIRY_MS / 60000),
        },
      )
      : { success: false }

    return {
      ...result,
      invite: {
        setupRequired: Boolean(setupUrl),
        emailSent: Boolean(emailResult.success),
        setupUrl: emailResult.success ? undefined : setupUrl,
      },
    }
  }

  async createProject(organizationId: string, data: CreateClientProjectInput) {
    return this.content.createProject(organizationId, data)
  }

  async findProjectById(id: string) {
    return this.content.findProjectById(id)
  }

  async updateProject(id: string, data: UpdateClientProjectInput) {
    return this.content.updateProject(id, data)
  }

  async createUpdate(organizationId: string, createdById: string, data: CreateClientUpdateInput) {
    return this.content.createUpdate(organizationId, createdById, data)
  }

  async createMetricSnapshot(organizationId: string, data: CreateClientMetricSnapshotInput) {
    return this.content.createMetricSnapshot(organizationId, data)
  }

  async createResourceLink(organizationId: string, data: CreateClientResourceLinkInput) {
    return this.content.createResourceLink(organizationId, data)
  }

  async findResourceLinkById(id: string) {
    return this.content.findResourceLinkById(id)
  }

  async updateResourceLink(resourceId: string, organizationId: string, data: UpdateClientResourceLinkInput) {
    return this.content.updateResourceLink(resourceId, organizationId, data)
  }

  async deleteResourceLink(resourceId: string) {
    return this.content.deleteResourceLink(resourceId)
  }

  async findTickets(where: Prisma.ClientTicketWhereInput = {}) {
    return this.prisma.clientTicket.findMany({
      where,
      include: {
        comments: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })
  }

  async createTicket(
    organizationId: string,
    requesterId: string,
    data: CreateClientTicketInput,
  ) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.clientTicket.create({
        data: {
          organizationId,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          createdById: requesterId,
        },
        include: {
          comments: true,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: requesterId,
        type: CLIENT_ACTIVITY_TYPES.ticketCreated,
        subjectType: 'ticket',
        subjectId: ticket.id,
        visibility: 'client',
        title: `Request opened: ${ticket.title}`,
        body: ticket.description || null,
        metadata: {
          category: ticket.category,
          priority: ticket.priority,
          projectId: ticket.projectId || null,
        },
      })

      return ticket
    })
  }

  async findTicketById(id: string) {
    return this.prisma.clientTicket.findUnique({
      where: { id },
      include: {
        comments: {
          include: {
            author: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  async updateTicket(ticketId: string, data: UpdateClientTicketInput, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.clientTicket.findUnique({
        where: { id: ticketId },
        select: {
          organizationId: true,
          title: true,
          description: true,
          category: true,
          priority: true,
        },
      })

      const ticket = await tx.clientTicket.update({
        where: { id: ticketId },
        data,
        include: {
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (previous) {
        await createClientActivity(tx, {
          organizationId: previous.organizationId,
          actorId,
          type: CLIENT_ACTIVITY_TYPES.ticketUpdated,
          subjectType: 'ticket',
          subjectId: ticket.id,
          visibility: 'client',
          title: `Request updated: ${ticket.title}`,
          body: ticket.description || null,
          metadata: {
            previousTitle: previous.title,
            category: ticket.category,
            priority: ticket.priority,
          },
        })
      }

      return ticket
    })
  }

  async deleteTicket(ticketId: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.clientTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          organizationId: true,
          title: true,
          description: true,
          category: true,
          priority: true,
        },
      })
      if (!ticket) throw new ClientValidationError('Client ticket not found')

      await tx.clientTicket.delete({
        where: { id: ticketId },
      })

      await createClientActivity(tx, {
        organizationId: ticket.organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.ticketDeleted,
        subjectType: 'ticket',
        subjectId: ticket.id,
        visibility: 'client',
        title: `Request deleted: ${ticket.title}`,
        body: ticket.description || null,
        metadata: {
          category: ticket.category,
          priority: ticket.priority,
        },
      })
    })
  }

  async updateTicketStatus(ticketId: string, status: string, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.clientTicket.findUnique({
        where: { id: ticketId },
        select: {
          organizationId: true,
          projectId: true,
          title: true,
          status: true,
        },
      })

      const ticket = await tx.clientTicket.update({
        where: { id: ticketId },
        data: {
          status,
          closedAt: status === 'done' ? new Date() : null,
        },
        include: {
          comments: {
            include: {
              author: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })

      if (previous && previous.status !== status) {
        await createClientActivity(tx, {
          organizationId: previous.organizationId,
          actorId,
          type: CLIENT_ACTIVITY_TYPES.ticketStatusChanged,
          subjectType: 'ticket',
          subjectId: ticket.id,
          visibility: 'client',
          title: `Request status changed: ${ticket.title}`,
          body: `Status changed from ${previous.status} to ${status}.`,
          metadata: {
            previousStatus: previous.status,
            status,
            projectId: previous.projectId || null,
          },
        })
      }

      return ticket
    })
  }

  async createTicketComment(
    ticketId: string,
    organizationId: string,
    authorId: string,
    data: CreateClientTicketCommentInput,
    ticketTitle?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.clientTicketComment.create({
        data: {
          ticketId,
          authorId,
          body: data.body,
          visibility: data.visibility,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: authorId,
        type: data.visibility === 'internal'
          ? CLIENT_ACTIVITY_TYPES.ticketInternalNoteCreated
          : CLIENT_ACTIVITY_TYPES.ticketClientReplyCreated,
        subjectType: 'ticket',
        subjectId: ticketId,
        visibility: data.visibility === 'internal' ? 'internal' : 'client',
        title: data.visibility === 'internal'
          ? `Internal note added: ${ticketTitle || 'Request'}`
          : `Reply added: ${ticketTitle || 'Request'}`,
        body: comment.body,
        metadata: {
          commentId: comment.id,
          visibility: comment.visibility,
        },
      })

      return comment
    })
  }

  async createWorkItem(organizationId: string, createdById: string, data: CreateClientWorkItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const workItem = await tx.clientWorkItem.create({
        data: {
          organizationId,
          createdById,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          progress: data.progress,
          dueAt: data.dueAt,
          assignedToId: data.assignedToId,
          visibleToClient: data.visibleToClient,
          sortOrder: data.sortOrder,
          completedAt: data.status === 'completed' ? new Date() : null,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: createdById,
        type: data.status === 'completed'
          ? CLIENT_ACTIVITY_TYPES.workItemCompleted
          : CLIENT_ACTIVITY_TYPES.workItemCreated,
        subjectType: 'work_item',
        subjectId: workItem.id,
        visibility: workItem.visibleToClient ? 'client' : 'internal',
        title: data.status === 'completed'
          ? `Work completed: ${workItem.title}`
          : `Work item added: ${workItem.title}`,
        body: workItem.description || null,
        metadata: {
          status: workItem.status,
          priority: workItem.priority,
          progress: workItem.progress,
          projectId: workItem.projectId || null,
        },
      })

      return workItem
    })
  }

  async findWorkItemById(id: string) {
    return this.prisma.clientWorkItem.findUnique({ where: { id } })
  }

  async updateWorkItem(id: string, organizationId: string, data: UpdateClientWorkItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const workItem = await tx.clientWorkItem.update({
        where: { id },
        data,
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: undefined,
        type: data.status === 'completed'
          ? CLIENT_ACTIVITY_TYPES.workItemCompleted
          : CLIENT_ACTIVITY_TYPES.workItemUpdated,
        subjectType: 'work_item',
        subjectId: workItem.id,
        visibility: workItem.visibleToClient ? 'client' : 'internal',
        title: data.status === 'completed'
          ? `Work completed: ${workItem.title}`
          : `Work updated: ${workItem.title}`,
        body: workItem.description || null,
        metadata: {
          status: workItem.status,
          priority: workItem.priority,
          progress: workItem.progress,
          projectId: workItem.projectId || null,
        },
      })

      return workItem
    })
  }

  async createApproval(organizationId: string, requestedById: string, data: CreateClientApprovalInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const approval = await tx.clientApproval.create({
        data: {
          organizationId,
          requestedById,
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          status: data.status,
          dueAt: data.dueAt,
          visibleToClient: data.visibleToClient,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: requestedById,
        type: CLIENT_ACTIVITY_TYPES.approvalRequested,
        subjectType: 'approval',
        subjectId: approval.id,
        visibility: approval.visibleToClient ? 'client' : 'internal',
        title: `Approval requested: ${approval.title}`,
        body: approval.description || null,
        metadata: {
          status: approval.status,
          dueAt: approval.dueAt ? approval.dueAt.toISOString() : null,
          projectId: approval.projectId || null,
        },
      })

      return approval
    })
  }

  async findApprovalById(id: string) {
    return this.prisma.clientApproval.findUnique({ where: { id } })
  }

  async updateApproval(id: string, organizationId: string, requesterId: string, data: UpdateClientApprovalInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const approval = await tx.clientApproval.update({
        where: { id },
        data: {
          ...data,
          ...(data.decidedAt ? { decidedById: requesterId } : {}),
          ...(data.decidedAt === null ? { decidedById: null } : {}),
        },
      })

      if (data.status === 'approved' || data.status === 'changes_requested') {
        await createClientActivity(tx, {
          organizationId,
          actorId: requesterId,
          type: data.status === 'approved'
            ? CLIENT_ACTIVITY_TYPES.approvalApproved
            : CLIENT_ACTIVITY_TYPES.approvalChangesRequested,
          subjectType: 'approval',
          subjectId: approval.id,
          visibility: approval.visibleToClient ? 'client' : 'internal',
          title: data.status === 'approved'
            ? `Approval completed: ${approval.title}`
            : `Changes requested: ${approval.title}`,
          body: approval.responseNote || null,
          metadata: {
            status: approval.status,
            decidedAt: approval.decidedAt ? approval.decidedAt.toISOString() : null,
            projectId: approval.projectId || null,
          },
        })
      }

      return approval
    })
  }

  async generateReportDraft(organizationId: string, createdById: string, data: GenerateClientReportDraftInput) {
    const periodEndExclusive = addDays(data.periodEnd, 1)
    const [
      completedWorkItems,
      closedTickets,
      publishedUpdates,
      metricSnapshots,
      approvals,
      roadmapRecommendations,
      calendarItems,
      openTickets,
      openApprovals,
    ] = await Promise.all([
      this.prisma.clientWorkItem.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          status: 'completed',
          completedAt: {
            gte: data.periodStart,
            lt: periodEndExclusive,
          },
        },
        select: { title: true, description: true, status: true },
        orderBy: { completedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientTicket.findMany({
        where: {
          organizationId,
          status: 'done',
          OR: [
            {
              closedAt: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
            {
              closedAt: null,
              updatedAt: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
          ],
        },
        select: { title: true, description: true, status: true },
        orderBy: { closedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientUpdate.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          status: 'published',
          createdAt: {
            gte: data.periodStart,
            lt: periodEndExclusive,
          },
        },
        select: { title: true, body: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientMetricSnapshot.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          OR: [
            {
              periodStart: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
            {
              periodEnd: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
            {
              periodStart: { lte: data.periodStart },
              periodEnd: { gte: data.periodEnd },
            },
            {
              createdAt: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
          ],
        },
        select: { label: true, value: true, unit: true, source: true },
        orderBy: { createdAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientApproval.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          OR: [
            {
              createdAt: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
            {
              decidedAt: {
                gte: data.periodStart,
                lt: periodEndExclusive,
              },
            },
          ],
        },
        select: { title: true, description: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientRoadmapRecommendation.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          status: { not: 'archived' },
          updatedAt: {
            gte: data.periodStart,
            lt: periodEndExclusive,
          },
        },
        select: { title: true, body: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientCalendarItem.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          startAt: {
            gte: data.periodStart,
            lt: periodEndExclusive,
          },
        },
        select: { title: true, description: true, status: true },
        orderBy: { startAt: 'asc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientTicket.findMany({
        where: {
          organizationId,
          status: { in: CLIENT_ACTION_QUEUE_STATUS_FILTERS.ticketOpen },
        },
        select: { title: true, description: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
      this.prisma.clientApproval.findMany({
        where: {
          organizationId,
          visibleToClient: true,
          status: 'pending',
        },
        select: { title: true, description: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: CLIENT_REPORT_PERIOD_LIMIT,
      }),
    ])

    const reportData = buildClientReportDraftData({
      title: data.title,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      visibleToClient: data.visibleToClient,
      completedWorkItems,
      closedTickets,
      publishedUpdates: publishedUpdates.map((update) => ({
        title: update.title,
        description: update.body,
        status: update.status,
      })),
      metricSnapshots,
      approvals,
      roadmapRecommendations: roadmapRecommendations.map((recommendation) => ({
        title: recommendation.title,
        description: recommendation.body,
        status: recommendation.status,
      })),
      calendarItems,
      openTickets,
      openApprovals,
    })

    return this.createReport(organizationId, createdById, reportData)
  }

  async createReport(organizationId: string, createdById: string, data: CreateClientReportInput) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.clientReport.create({
        data: {
          organizationId,
          createdById,
          title: data.title,
          summary: data.summary,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          status: data.status,
          visibleToClient: data.visibleToClient,
          leadsCaptured: data.leadsCaptured,
          missedOpportunities: data.missedOpportunities,
          followUpStatus: data.followUpStatus,
          leadSourceBreakdown: data.leadSourceBreakdown as Prisma.InputJsonValue,
          reputationSnapshot: data.reputationSnapshot as Prisma.InputJsonValue,
          localVisibilitySnapshot: data.localVisibilitySnapshot as Prisma.InputJsonValue,
          publishedAt: data.status === 'published' ? new Date() : null,
        },
      })

      await createClientActivity(tx, {
        organizationId,
        actorId: createdById,
        type: data.status === 'published'
          ? CLIENT_ACTIVITY_TYPES.reportPublished
          : CLIENT_ACTIVITY_TYPES.reportCreated,
        subjectType: 'report',
        subjectId: report.id,
        visibility: data.status === 'published' && report.visibleToClient ? 'client' : 'internal',
        title: data.status === 'published'
          ? `Report published: ${report.title}`
          : `Report drafted: ${report.title}`,
        body: report.summary || null,
        metadata: {
          status: report.status,
          periodStart: report.periodStart.toISOString(),
          periodEnd: report.periodEnd.toISOString(),
          leadsCaptured: report.leadsCaptured,
          missedOpportunities: report.missedOpportunities,
        },
      })

      return report
    })
  }

  async findReportById(id: string) {
    return this.prisma.clientReport.findUnique({ where: { id } })
  }

  async updateReport(id: string, data: UpdateClientReportInput) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.clientReport.findUnique({
        where: { id },
        select: {
          organizationId: true,
          title: true,
          status: true,
        },
      })

      const report = await tx.clientReport.update({
        where: { id },
        data: {
          ...data,
          leadSourceBreakdown: data.leadSourceBreakdown as Prisma.InputJsonValue,
          reputationSnapshot: data.reputationSnapshot as Prisma.InputJsonValue,
          localVisibilitySnapshot: data.localVisibilitySnapshot as Prisma.InputJsonValue,
        },
      })

      if (previous && previous.status !== 'published' && report.status === 'published') {
        await createClientActivity(tx, {
          organizationId: previous.organizationId,
          actorId: undefined,
          type: CLIENT_ACTIVITY_TYPES.reportPublished,
          subjectType: 'report',
          subjectId: report.id,
          visibility: report.visibleToClient ? 'client' : 'internal',
          title: `Report published: ${report.title}`,
          body: report.summary || null,
          metadata: {
            previousStatus: previous.status,
            status: report.status,
            periodStart: report.periodStart.toISOString(),
            periodEnd: report.periodEnd.toISOString(),
          },
        })
      }

      return report
    })
  }

  async createRoadmapRecommendation(organizationId: string, data: CreateClientRoadmapRecommendationInput) {
    return this.roadmapAssets.createRoadmapRecommendation(organizationId, data)
  }

  async findRoadmapRecommendationById(id: string) {
    return this.roadmapAssets.findRoadmapRecommendationById(id)
  }

  async updateRoadmapRecommendation(id: string, data: UpdateClientRoadmapRecommendationInput) {
    return this.roadmapAssets.updateRoadmapRecommendation(id, data)
  }

  async createAsset(organizationId: string, data: CreateClientAssetInput) {
    return this.roadmapAssets.createAsset(organizationId, data)
  }

  async findAssetById(id: string) {
    return this.roadmapAssets.findAssetById(id)
  }

  async updateAsset(id: string, organizationId: string, data: UpdateClientAssetInput) {
    return this.roadmapAssets.updateAsset(id, organizationId, data)
  }

  async upsertBillingStatus(organizationId: string, data: UpsertClientBillingStatusInput, actorId?: string) {
    return this.billing.upsertBillingStatus(organizationId, data, actorId)
  }

  async createCalendarItem(organizationId: string, createdById: string, data: CreateClientCalendarItemInput) {
    return this.calendar.createCalendarItem(organizationId, createdById, data)
  }

  async findCalendarItemById(id: string) {
    return this.calendar.findCalendarItemById(id)
  }

  async updateCalendarItem(id: string, organizationId: string, data: UpdateClientCalendarItemInput, actorId?: string) {
    return this.calendar.updateCalendarItem(id, organizationId, data, actorId)
  }

  async deleteCalendarItem(id: string, actorId?: string, existingItem?: ClientCalendarItemDeleteContext) {
    return this.calendar.deleteCalendarItem(id, actorId, existingItem)
  }

  private async assertProjectBelongsToOrganization(organizationId: string, projectId?: string | null) {
    if (!projectId) return

    const project = await this.prisma.clientProject.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: { id: true },
    })

    if (!project) {
      throw new ClientValidationError('Project does not belong to this client organization')
    }
  }
}
