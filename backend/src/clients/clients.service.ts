import { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import {
  CreateClientOrganizationInput,
  CreateClientTicketInput,
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
    if (data.projectId) {
      const project = await this.prisma.clientProject.findFirst({
        where: {
          id: data.projectId,
          organizationId,
        },
        select: { id: true },
      })

      if (!project) {
        throw new ClientValidationError('Project does not belong to this client organization')
      }
    }

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
}
