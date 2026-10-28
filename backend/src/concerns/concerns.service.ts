import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'
import { notificationService, type NotificationPayload } from '../notifications/socket.service'
import { OrgChartService } from '../org-chart/org-chart.service'
import {
  ConcernError,
  canCloseOrReopen,
  canListAllTickets,
  canReassignTicket,
  canViewTicket,
  recipientsFor,
  shorten,
  statusAfterReply,
  type ConcernActor,
  type ConcernBox,
  type ConcernStatus,
} from './concerns.rules'

const logger = createLogger('concerns.service')

// Newest first; enough for a team inbox. Older concerns stay reachable by search.
const LIST_LIMIT = 200

const personSelect = { id: true, name: true, email: true, avatar: true }

const summarySelect = {
  id: true,
  number: true,
  subject: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  requesterId: true,
  assigneeId: true,
  requester: { select: personSelect },
  assignee: { select: personSelect },
  _count: { select: { messages: true } },
}

const detailSelect = {
  ...summarySelect,
  messages: {
    select: { id: true, body: true, createdAt: true, author: { select: personSelect } },
    orderBy: { createdAt: 'asc' as const },
  },
}

const NOT_A_SUPERVISOR =
  'Concerns go to a supervisor: someone with direct reports or a management role'

function serializeSummary(ticket: any) {
  return {
    id: ticket.id,
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt,
    requester: ticket.requester,
    assignee: ticket.assignee,
    messageCount: ticket._count?.messages ?? 0,
  }
}

function personName(person: { name?: string | null; email?: string | null } | null | undefined): string {
  return person?.name?.trim() || person?.email || 'a member'
}

export interface ListFilters {
  box: ConcernBox
  status: ConcernStatus | null
  q: string
}

export class ConcernsService {
  constructor(
    private readonly db = prisma,
    private readonly orgChart = new OrgChartService(prisma),
  ) {}

  async list(actor: ConcernActor, filters: ListFilters) {
    if (filters.box === 'all' && !canListAllTickets(actor)) {
      throw new ConcernError(403, 'Only admins can see every concern')
    }

    const boxWhere =
      filters.box === 'inbox' ? { assigneeId: actor.id }
        : filters.box === 'sent' ? { requesterId: actor.id }
          : {}
    const where = {
      ...boxWhere,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { subject: { contains: filters.q, mode: 'insensitive' as const } } : {}),
    }

    const [items, grouped] = await Promise.all([
      this.db.internalTicket.findMany({ where, select: summarySelect, orderBy: { updatedAt: 'desc' }, take: LIST_LIMIT }),
      this.db.internalTicket.groupBy({ by: ['status'], where: boxWhere, _count: { _all: true } }),
    ])

    const counts = { open: 0, answered: 0, closed: 0 }
    for (const row of grouped) {
      if (row.status in counts) counts[row.status as ConcernStatus] = row._count._all
    }

    return {
      box: filters.box,
      status: filters.status,
      q: filters.q,
      items: items.map(serializeSummary),
      counts,
      viewer: { id: actor.id, isFullAccess: actor.isFullAccess, canListAll: canListAllTickets(actor) },
    }
  }

  async getDetail(id: string, actor: ConcernActor) {
    const ticket = await this.db.internalTicket.findUnique({ where: { id }, select: detailSelect })
    if (!ticket) throw new ConcernError(404, 'Concern not found')
    if (!canViewTicket(ticket, actor)) throw new ConcernError(403, 'You do not have access to this concern')

    const isClosed = ticket.status === 'closed'
    const canChangeState = canCloseOrReopen(ticket, actor)
    return {
      ...serializeSummary(ticket),
      canView: true,
      messages: ticket.messages,
      permissions: {
        canReply: !isClosed,
        canClose: canChangeState && !isClosed,
        canReopen: canChangeState && isClosed,
        canReassign: canReassignTicket(ticket, actor) && !isClosed,
      },
    }
  }

  async create(actor: ConcernActor, input: { assigneeId: string; subject: string; body: string }) {
    if (input.assigneeId === actor.id) {
      throw new ConcernError(400, 'You cannot raise a concern with yourself')
    }
    const target = await this.orgChart.findMemberEligibility(input.assigneeId)
    if (!target) throw new ConcernError(400, 'Choose an active member to send this to')
    if (!target.isSupervisor && !actor.isFullAccess) throw new ConcernError(400, NOT_A_SUPERVISOR)

    const ticket = await this.db.internalTicket.create({
      data: {
        requesterId: actor.id,
        assigneeId: target.member.id,
        subject: input.subject,
        messages: { create: { authorId: actor.id, body: input.body } },
      },
      select: { id: true, number: true },
    })

    await this.notify([target.member.id], actor, ticket.id, {
      title: `New concern #${ticket.number}`,
      message: `${actor.displayName}: ${input.subject}`,
    })
    return this.getDetail(ticket.id, actor)
  }

  async reply(id: string, actor: ConcernActor, body: string) {
    const ticket = await this.loadForAction(id, actor)
    if (ticket.status === 'closed') throw new ConcernError(409, 'Reopen this concern to reply')

    const nextStatus = statusAfterReply(ticket, actor.id)
    await this.db.$transaction(async (tx) => {
      // Guarded write: a close that lands first wins, the reply is refused.
      const updated = await tx.internalTicket.updateMany({
        where: { id, status: { not: 'closed' } },
        data: { status: nextStatus, updatedAt: new Date() },
      })
      if (updated.count === 0) throw new ConcernError(409, 'Reopen this concern to reply')
      await tx.internalTicketMessage.create({ data: { ticketId: id, authorId: actor.id, body } })
    })

    await this.notify([ticket.requesterId, ticket.assigneeId], actor, id, {
      title: `Reply on concern #${ticket.number}`,
      message: `${actor.displayName}: ${shorten(body)}`,
    })
    return this.getDetail(id, actor)
  }

  async close(id: string, actor: ConcernActor) {
    const ticket = await this.loadForAction(id, actor)
    if (!canCloseOrReopen(ticket, actor)) {
      throw new ConcernError(403, 'Only the people on this concern can close it')
    }
    const now = new Date()
    const updated = await this.db.internalTicket.updateMany({
      where: { id, status: { not: 'closed' } },
      data: { status: 'closed', closedAt: now, updatedAt: now },
    })
    if (updated.count === 0) throw new ConcernError(409, 'This concern is already closed')

    await this.notify([ticket.requesterId, ticket.assigneeId], actor, id, {
      title: `Concern #${ticket.number} closed`,
      message: `${actor.displayName} closed "${ticket.subject}"`,
    })
    return this.getDetail(id, actor)
  }

  async reopen(id: string, actor: ConcernActor) {
    const ticket = await this.loadForAction(id, actor)
    if (!canCloseOrReopen(ticket, actor)) {
      throw new ConcernError(403, 'Only the people on this concern can reopen it')
    }
    const updated = await this.db.internalTicket.updateMany({
      where: { id, status: 'closed' },
      data: { status: 'open', closedAt: null, updatedAt: new Date() },
    })
    if (updated.count === 0) throw new ConcernError(409, 'This concern is not closed')

    await this.notify([ticket.requesterId, ticket.assigneeId], actor, id, {
      title: `Concern #${ticket.number} reopened`,
      message: `${actor.displayName} reopened "${ticket.subject}"`,
    })
    return this.getDetail(id, actor)
  }

  async reassign(id: string, actor: ConcernActor, assigneeId: string) {
    const ticket = await this.loadForAction(id, actor)
    if (!canReassignTicket(ticket, actor)) {
      throw new ConcernError(403, 'Only the assignee or an admin can reassign this concern')
    }
    if (ticket.status === 'closed') throw new ConcernError(409, 'Reopen this concern before reassigning it')
    if (assigneeId === ticket.assigneeId) throw new ConcernError(400, 'This concern is already assigned to that person')
    if (assigneeId === ticket.requesterId) {
      throw new ConcernError(400, 'A concern cannot be assigned to the person who raised it')
    }

    const target = await this.orgChart.findMemberEligibility(assigneeId)
    if (!target) throw new ConcernError(400, 'Choose an active member to assign this to')
    if (!target.isSupervisor) throw new ConcernError(400, NOT_A_SUPERVISOR)

    await this.db.internalTicket.update({ where: { id }, data: { assigneeId } })
    await this.notify([ticket.requesterId, ticket.assigneeId, assigneeId], actor, id, {
      title: `Concern #${ticket.number} reassigned`,
      message: `${actor.displayName} assigned "${ticket.subject}" to ${personName(target.member)}`,
    })

    // The previous assignee drops off the concern unless they are a full-access admin.
    if (!canViewTicket({ ...ticket, assigneeId }, actor)) {
      return { id, number: ticket.number, canView: false, assignee: target.member }
    }
    return this.getDetail(id, actor)
  }

  private async loadForAction(id: string, actor: ConcernActor) {
    const ticket = await this.db.internalTicket.findUnique({
      where: { id },
      select: { id: true, number: true, subject: true, status: true, requesterId: true, assigneeId: true },
    })
    if (!ticket) throw new ConcernError(404, 'Concern not found')
    if (!canViewTicket(ticket, actor)) throw new ConcernError(403, 'You do not have access to this concern')
    return ticket
  }

  /**
   * Live notification plus a stored row per recipient (the bell reads stored rows
   * where sockets never deliver, as on Vercel), and a list refresh hint.
   */
  private async notify(
    userIds: string[],
    actor: ConcernActor,
    ticketId: string,
    content: { title: string; message: string },
  ): Promise<number> {
    const recipients = recipientsFor(userIds, actor.id)
    if (recipients.length === 0) return 0

    const payload: NotificationPayload = { type: 'info', ...content, link: `/concerns/${ticketId}` }
    for (const userId of recipients) {
      notificationService.notifyUser(userId, payload)
      notificationService.emitToRoom(`user:${userId}`, 'data:changed', { resource: 'concerns', timestamp: Date.now() })
    }
    try {
      return await notificationService.persistForUsers(recipients, payload)
    } catch (error) {
      // The concern itself is saved; a failed bell row must not fail the request.
      logger.error('Could not store concern notifications', error)
      return 0
    }
  }
}
