import { Prisma, type PrismaClient } from '@prisma/client'
import { prisma } from '../../database/prisma.service'
import { notificationService } from '../../notifications/socket.service'
import { CLIENT_ACTIVITY_TYPES, createClientActivity } from '../clients.activity'
import { GemfieldValidationError } from './gemfield.progress'
import { buildGemfieldDigest, type GemfieldDigest } from './gemfield-digest'
import { isGemfieldDigestEnabled } from './gemfield.config'
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

  /** Daily digest: summarize the open pipeline and notify staff. Config-toggleable via GEMFIELD_DIGEST_ENABLED. */
  async runGemfieldDigest(): Promise<{ enabled: boolean; notified: number; digest: GemfieldDigest }> {
    const items = await this.listPipeline()
    const digest = buildGemfieldDigest(items)
    if (!isGemfieldDigestEnabled()) {
      return { enabled: false, notified: 0, digest }
    }
    // Target staff who run the pipeline (dev channel). notifyUser is targeted - never a broadcast,
    // so this never reaches clients.
    const staff = await this.db.userRole.findMany({
      where: { role: { in: ['gemfield_developer', 'admin', 'operations_manager'] } },
      select: { userId: true },
      distinct: ['userId'],
    })
    for (const member of staff) {
      notificationService.notifyUser(member.userId, {
        type: digest.breachedCount ? 'warning' : 'info',
        title: digest.title,
        message: digest.message,
        link: '/operations/clients/gemfield',
      })
    }
    return { enabled: true, notified: staff.length, digest }
  }

  /** Full staff-side ticket detail: wizard answers, attachments, and the complete comment thread
   *  (internal + client). Gemfield-scoped. Staff serialization - the client-vs-management split is
   *  the caller's guard; this endpoint is staff-only. */
  async getTicketDetail(ticketId: string) {
    const ticket = await this.db.clientTicket.findFirst({
      where: { id: ticketId, organization: { gemfieldClient: true } },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        priority: true,
        status: true,
        ticketKind: true,
        changeClass: true,
        wizardAnswers: true,
        sourceWizardVersion: true,
        assignedToId: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        organization: { select: { id: true, name: true } },
        project: { select: { gfId: true, gemfieldPhase: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            body: true,
            visibility: true,
            createdAt: true,
            author: { select: { id: true, name: true, email: true } },
          },
        },
        attachments: {
          select: { id: true, uploadId: true, upload: { select: { originalName: true, contentType: true } } },
        },
      },
    })
    if (!ticket) throw new GemfieldValidationError('Ticket not found', 404)

    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      ticketKind: ticket.ticketKind,
      changeClass: ticket.changeClass,
      wizardAnswers: (ticket.wizardAnswers ?? null) as Record<string, unknown> | null,
      sourceWizardVersion: ticket.sourceWizardVersion,
      assignedToId: ticket.assignedToId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
      organization: ticket.organization,
      project: ticket.project,
      creator: ticket.creator,
      assignee: ticket.assignee,
      comments: ticket.comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
      })),
      attachments: ticket.attachments.map((attachment) => ({
        id: attachment.id,
        uploadId: attachment.uploadId,
        name: attachment.upload?.originalName ?? 'attachment',
        contentType: attachment.upload?.contentType ?? null,
        // Served through the org-scoped, auth-checked uploads route.
        url: `/api/uploads/files/${attachment.uploadId}`,
      })),
    }
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
