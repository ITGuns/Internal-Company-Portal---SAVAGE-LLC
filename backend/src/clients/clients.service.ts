import { Prisma, PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'
import {
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
  InviteClientUserInput,
  UpdateClientOrganizationStatusInput,
  UpdateClientApprovalInput,
  UpdateClientAssetInput,
  UpdateClientCalendarItemInput,
  UpdateClientMembershipInput,
  UpdateClientProjectInput,
  UpdateClientReportInput,
  UpdateClientRoadmapRecommendationInput,
  UpdateClientWorkItemInput,
  UpsertClientBillingStatusInput,
} from './clients.validation'

const CLIENT_INVITE_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export class ClientsService {
  private prisma: PrismaClient

  constructor() {
    this.prisma = prisma
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
    return this.prisma.clientOrganization.create({
      data: {
        name: data.name,
        slug: data.slug,
        websiteUrl: data.websiteUrl,
        tierId: data.tierId,
        notes: data.notes,
      },
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
    })
  }

  async updateOrganizationStatus(id: string, data: UpdateClientOrganizationStatusInput) {
    return this.prisma.clientOrganization.update({
      where: { id },
      data: {
        status: data.status,
      },
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
    })
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
    return this.prisma.clientProject.create({
      data: {
        organizationId,
        name: data.name,
        status: data.status,
        summary: data.summary,
        progress: data.progress,
        startedAt: data.startedAt,
        targetLaunchAt: data.targetLaunchAt,
        liveUrl: data.liveUrl,
        previewUrl: data.previewUrl,
        internalNotes: data.internalNotes,
      },
    })
  }

  async findProjectById(id: string) {
    return this.prisma.clientProject.findUnique({
      where: { id },
    })
  }

  async updateProject(id: string, data: UpdateClientProjectInput) {
    return this.prisma.clientProject.update({
      where: { id },
      data,
    })
  }

  async createUpdate(organizationId: string, createdById: string, data: CreateClientUpdateInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientUpdate.create({
      data: {
        organizationId,
        projectId: data.projectId,
        title: data.title,
        body: data.body,
        status: data.status,
        visibleToClient: data.visibleToClient,
        createdById,
      },
    })
  }

  async createMetricSnapshot(organizationId: string, data: CreateClientMetricSnapshotInput) {
    return this.prisma.clientMetricSnapshot.create({
      data: {
        organizationId,
        label: data.label,
        value: data.value,
        unit: data.unit,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        source: data.source,
        notes: data.notes,
        visibleToClient: data.visibleToClient,
      },
    })
  }

  async createResourceLink(organizationId: string, data: CreateClientResourceLinkInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientResourceLink.create({
      data: {
        organizationId,
        projectId: data.projectId,
        label: data.label,
        url: data.url,
        type: data.type,
        visibleToClient: data.visibleToClient,
      },
    })
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

    return this.prisma.clientTicket.create({
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

  async updateTicketStatus(ticketId: string, status: string) {
    return this.prisma.clientTicket.update({
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
  }

  async createTicketComment(ticketId: string, authorId: string, data: CreateClientTicketCommentInput) {
    return this.prisma.clientTicketComment.create({
      data: {
        ticketId,
        authorId,
        body: data.body,
        visibility: data.visibility,
      },
    })
  }

  async createWorkItem(organizationId: string, createdById: string, data: CreateClientWorkItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientWorkItem.create({
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
  }

  async findWorkItemById(id: string) {
    return this.prisma.clientWorkItem.findUnique({ where: { id } })
  }

  async updateWorkItem(id: string, organizationId: string, data: UpdateClientWorkItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientWorkItem.update({
      where: { id },
      data,
    })
  }

  async createApproval(organizationId: string, requestedById: string, data: CreateClientApprovalInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientApproval.create({
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
  }

  async findApprovalById(id: string) {
    return this.prisma.clientApproval.findUnique({ where: { id } })
  }

  async updateApproval(id: string, organizationId: string, requesterId: string, data: UpdateClientApprovalInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientApproval.update({
      where: { id },
      data: {
        ...data,
        ...(data.decidedAt ? { decidedById: requesterId } : {}),
        ...(data.decidedAt === null ? { decidedById: null } : {}),
      },
    })
  }

  async createReport(organizationId: string, createdById: string, data: CreateClientReportInput) {
    return this.prisma.clientReport.create({
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
  }

  async findReportById(id: string) {
    return this.prisma.clientReport.findUnique({ where: { id } })
  }

  async updateReport(id: string, data: UpdateClientReportInput) {
    return this.prisma.clientReport.update({
      where: { id },
      data: {
        ...data,
        leadSourceBreakdown: data.leadSourceBreakdown as Prisma.InputJsonValue,
        reputationSnapshot: data.reputationSnapshot as Prisma.InputJsonValue,
        localVisibilitySnapshot: data.localVisibilitySnapshot as Prisma.InputJsonValue,
      },
    })
  }

  async createRoadmapRecommendation(organizationId: string, data: CreateClientRoadmapRecommendationInput) {
    return this.prisma.clientRoadmapRecommendation.create({
      data: {
        organizationId,
        title: data.title,
        body: data.body,
        priority: data.priority,
        status: data.status,
        impact: data.impact,
        effort: data.effort,
        visibleToClient: data.visibleToClient,
        sortOrder: data.sortOrder,
      },
    })
  }

  async findRoadmapRecommendationById(id: string) {
    return this.prisma.clientRoadmapRecommendation.findUnique({ where: { id } })
  }

  async updateRoadmapRecommendation(id: string, data: UpdateClientRoadmapRecommendationInput) {
    return this.prisma.clientRoadmapRecommendation.update({
      where: { id },
      data,
    })
  }

  async createAsset(organizationId: string, data: CreateClientAssetInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientAsset.create({
      data: {
        organizationId,
        projectId: data.projectId,
        label: data.label,
        url: data.url,
        type: data.type,
        status: data.status,
        notes: data.notes,
        visibleToClient: data.visibleToClient,
      },
    })
  }

  async findAssetById(id: string) {
    return this.prisma.clientAsset.findUnique({ where: { id } })
  }

  async updateAsset(id: string, organizationId: string, data: UpdateClientAssetInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientAsset.update({
      where: { id },
      data,
    })
  }

  async upsertBillingStatus(organizationId: string, data: UpsertClientBillingStatusInput) {
    return this.prisma.clientBillingStatus.upsert({
      where: { organizationId },
      update: data,
      create: {
        organizationId,
        ...data,
      },
    })
  }

  async createCalendarItem(organizationId: string, createdById: string, data: CreateClientCalendarItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientCalendarItem.create({
      data: {
        organizationId,
        createdById,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        channel: data.channel,
        status: data.status,
        startAt: data.startAt,
        endAt: data.endAt,
        visibleToClient: data.visibleToClient,
      },
    })
  }

  async findCalendarItemById(id: string) {
    return this.prisma.clientCalendarItem.findUnique({ where: { id } })
  }

  async updateCalendarItem(id: string, organizationId: string, data: UpdateClientCalendarItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.clientCalendarItem.update({
      where: { id },
      data,
    })
  }

  async deleteCalendarItem(id: string) {
    return this.prisma.clientCalendarItem.delete({
      where: { id },
      select: { id: true },
    })
  }

  private async assertProjectBelongsToOrganization(organizationId: string, projectId?: string) {
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
