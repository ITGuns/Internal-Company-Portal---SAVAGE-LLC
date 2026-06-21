import type { PrismaClient } from '@prisma/client'
import {
  CLIENT_ACTIVITY_TYPES,
  createClientActivity,
} from './clients.activity'
import {
  ClientValidationError,
  type CreateClientCalendarItemInput,
  type UpdateClientCalendarItemInput,
} from './clients.validation'

export interface ClientCalendarItemDeleteContext {
  organizationId: string
  title: string
  description?: string | null
  channel?: string | null
  status: string
  startAt: Date
  endAt?: Date | null
  visibleToClient: boolean
  projectId?: string | null
}

export class ClientCalendarService {
  constructor(private prisma: PrismaClient) {}

  async createCalendarItem(organizationId: string, createdById: string, data: CreateClientCalendarItemInput) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const calendarItem = await tx.clientCalendarItem.create({
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

      await createClientActivity(tx, {
        organizationId,
        actorId: createdById,
        type: CLIENT_ACTIVITY_TYPES.calendarScheduled,
        subjectType: 'calendar_item',
        subjectId: calendarItem.id,
        visibility: calendarItem.visibleToClient ? 'client' : 'internal',
        title: `Calendar item scheduled: ${calendarItem.title}`,
        body: calendarItem.description || null,
        metadata: {
          status: calendarItem.status,
          channel: calendarItem.channel || null,
          startAt: calendarItem.startAt.toISOString(),
          endAt: calendarItem.endAt ? calendarItem.endAt.toISOString() : null,
          projectId: calendarItem.projectId || null,
        },
      })

      return calendarItem
    })
  }

  async findCalendarItemById(id: string) {
    return this.prisma.clientCalendarItem.findUnique({ where: { id } })
  }

  async updateCalendarItem(id: string, organizationId: string, data: UpdateClientCalendarItemInput, actorId?: string) {
    await this.assertProjectBelongsToOrganization(organizationId, data.projectId)

    return this.prisma.$transaction(async (tx) => {
      const existingCalendarItem = await tx.clientCalendarItem.findUnique({
        where: { id },
        select: {
          startAt: true,
          endAt: true,
        },
      })
      if (!existingCalendarItem) throw new ClientValidationError('Calendar item not found')

      const nextStartAt = data.startAt || existingCalendarItem.startAt
      const nextEndAt = data.endAt === undefined ? existingCalendarItem.endAt : data.endAt
      if (nextEndAt && nextEndAt < nextStartAt) {
        throw new ClientValidationError('Calendar endAt must be after startAt')
      }

      const calendarItem = await tx.clientCalendarItem.update({
        where: { id },
        data,
      })

      await createClientActivity(tx, {
        organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.calendarUpdated,
        subjectType: 'calendar_item',
        subjectId: calendarItem.id,
        visibility: calendarItem.visibleToClient ? 'client' : 'internal',
        title: `Calendar item updated: ${calendarItem.title}`,
        body: calendarItem.description || null,
        metadata: {
          status: calendarItem.status,
          channel: calendarItem.channel || null,
          startAt: calendarItem.startAt.toISOString(),
          endAt: calendarItem.endAt ? calendarItem.endAt.toISOString() : null,
          projectId: calendarItem.projectId || null,
        },
      })

      return calendarItem
    })
  }

  async deleteCalendarItem(id: string, actorId?: string, existingItem?: ClientCalendarItemDeleteContext) {
    return this.prisma.$transaction(async (tx) => {
      const calendarItem = existingItem || await tx.clientCalendarItem.findUnique({
        where: { id },
        select: {
          organizationId: true,
          title: true,
          description: true,
          channel: true,
          status: true,
          startAt: true,
          endAt: true,
          visibleToClient: true,
          projectId: true,
        },
      })

      const deleted = await tx.clientCalendarItem.delete({
        where: { id },
        select: { id: true },
      })

      if (calendarItem) {
        await createClientActivity(tx, {
          organizationId: calendarItem.organizationId,
          actorId,
          type: CLIENT_ACTIVITY_TYPES.calendarDeleted,
          subjectType: 'calendar_item',
          subjectId: id,
          visibility: calendarItem.visibleToClient ? 'client' : 'internal',
          title: `Calendar item deleted: ${calendarItem.title}`,
          body: calendarItem.description || null,
          metadata: {
            status: calendarItem.status,
            channel: calendarItem.channel || null,
            startAt: calendarItem.startAt.toISOString(),
            endAt: calendarItem.endAt ? calendarItem.endAt.toISOString() : null,
            projectId: calendarItem.projectId || null,
          },
        })
      }

      return deleted
    })
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
