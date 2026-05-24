import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import {
  CreateClientOrganizationInput,
  CreateClientMembershipInput,
  CreateClientMetricSnapshotInput,
  CreateClientProjectInput,
  CreateClientResourceLinkInput,
  CreateClientTicketInput,
  CreateClientTicketCommentInput,
  CreateClientUpdateInput,
  ClientValidationError,
} from './clients.validation'

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
      orderBy: { updatedAt: 'desc' },
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
