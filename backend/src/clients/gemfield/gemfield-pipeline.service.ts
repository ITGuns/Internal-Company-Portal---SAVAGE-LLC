import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../../database/prisma.service'
import { CLIENT_ACTIVITY_TYPES, createClientActivity } from '../clients.activity'
import { GemfieldValidationError } from './gemfield.progress'
import {
  buildSlaSummary,
  CLOSED_STATUSES,
  isChangeClass,
  isGemfieldTicketStatus,
  resolveTargetStatus,
} from './gemfield-pipeline'

export interface PipelineFilters {
  status?: string
  assigneeId?: string
  priority?: string
  devAssistOnly?: boolean
  organizationId?: string
  search?: string
}

// The developer control panel reads/writes the SAME ClientTicket rows the client sees; every query
// here is scoped to Gemfield-entitled orgs, and every move records a ClientActivity event.
export class GemfieldPipelineService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listPipeline(filters: PipelineFilters = {}) {
    const where: Prisma.ClientTicketWhereInput = { organization: { gemfieldClient: true } }
    if (filters.status && isGemfieldTicketStatus(filters.status)) where.status = filters.status
    if (filters.assigneeId) where.assignedToId = filters.assigneeId
    if (filters.priority) where.priority = filters.priority
    if (filters.devAssistOnly) where.ticketKind = 'dev_assist'
    if (filters.organizationId) where.organizationId = filters.organizationId
    if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' }

    const tickets = await this.db.clientTicket.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        category: true,
        ticketKind: true,
        changeClass: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true, tier: { select: { name: true } } } },
        project: { select: { gfId: true, gemfieldPhase: true } },
        comments: { select: { visibility: true } },
        _count: { select: { attachments: true, comments: true } },
      },
    })

    const now = new Date()
    return tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      ticketKind: ticket.ticketKind,
      changeClass: ticket.changeClass,
      assignedToId: ticket.assignedToId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      organization: { id: ticket.organization.id, name: ticket.organization.name },
      gfId: ticket.project?.gfId ?? null,
      gemfieldPhase: ticket.project?.gemfieldPhase ?? null,
      commentCount: ticket._count.comments,
      attachmentCount: ticket._count.attachments,
      sla: buildSlaSummary({
        createdAt: ticket.createdAt,
        now,
        status: ticket.status,
        updatedAt: ticket.updatedAt,
        hasClientReply: ticket.comments.some((comment) => comment.visibility === 'client'),
        tierName: ticket.organization.tier?.name ?? null,
      }),
    }))
  }

  private async loadGemfieldTicket(ticketId: string) {
    const ticket = await this.db.clientTicket.findFirst({
      where: { id: ticketId, organization: { gemfieldClient: true } },
      select: { id: true, organizationId: true, status: true },
    })
    if (!ticket) throw new GemfieldValidationError('Ticket not found', 404)
    return ticket
  }

  async moveTicket(ticketId: string, requestedStatus: string, actorId: string) {
    if (!isGemfieldTicketStatus(requestedStatus)) throw new GemfieldValidationError('Invalid status')
    const ticket = await this.loadGemfieldTicket(ticketId)
    const target = resolveTargetStatus(ticket.status, requestedStatus)

    return this.db.$transaction(async (tx) => {
      const updated = await tx.clientTicket.update({
        where: { id: ticketId },
        data: { status: target, closedAt: CLOSED_STATUSES.has(target) ? new Date() : null },
        select: { id: true, status: true },
      })
      // Internal workflow event (the client sees status via their own ticket, without the jargon).
      await createClientActivity(tx, {
        organizationId: ticket.organizationId,
        actorId,
        type: CLIENT_ACTIVITY_TYPES.ticketStatusChanged,
        subjectType: 'ticket',
        subjectId: ticketId,
        visibility: 'internal',
        title: `Status: ${ticket.status} -> ${target}`,
        metadata: { from: ticket.status, to: target },
      })
      return updated
    })
  }

  async assignTicket(ticketId: string, assigneeId: string | null, actorId: string) {
    const ticket = await this.loadGemfieldTicket(ticketId)
    const updated = await this.db.clientTicket.update({
      where: { id: ticketId },
      data: { assignedToId: assigneeId },
      select: { id: true, assignedToId: true },
    })
    await createClientActivity(this.db, {
      organizationId: ticket.organizationId,
      actorId,
      type: CLIENT_ACTIVITY_TYPES.ticketUpdated,
      subjectType: 'ticket',
      subjectId: ticketId,
      visibility: 'internal',
      title: assigneeId ? 'Ticket assigned' : 'Ticket unassigned',
      metadata: { assigneeId },
    })
    return updated
  }

  async setChangeClass(ticketId: string, changeClass: string, actorId: string) {
    if (!isChangeClass(changeClass)) throw new GemfieldValidationError('Invalid classification')
    const ticket = await this.loadGemfieldTicket(ticketId)
    const updated = await this.db.clientTicket.update({
      where: { id: ticketId },
      data: { changeClass },
      select: { id: true, changeClass: true },
    })
    await createClientActivity(this.db, {
      organizationId: ticket.organizationId,
      actorId,
      type: CLIENT_ACTIVITY_TYPES.ticketUpdated,
      subjectType: 'ticket',
      subjectId: ticketId,
      visibility: 'internal',
      title: `Change classified as ${changeClass}`,
      metadata: { changeClass },
    })
    return updated
  }
}
