// Timesheet adjustment requests.
//
// Staff used to edit their own clock-in/out directly: no reason recorded, nobody
// notified, and TimeEntry has no field that would even show it had been changed.
// A correction is now a request - what it was, what they want, and why - decided
// by the person who manages them.
//
// "Manager" here means the employee's own manager (User.managerId), not the
// platform administrator. Payroll-privileged roles can also decide, because an
// employee with no manager set would otherwise have nobody able to action their
// request and it would sit forever.

import type { PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export class TimesheetAdjustmentError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message)
  }
}

export const ADJUSTMENT_STATUSES = ['pending', 'approved', 'declined', 'cancelled'] as const
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number]

const OPEN: AdjustmentStatus = 'pending'

export interface CreateAdjustmentInput {
  /** Omit for a shift that was never clocked at all. */
  timeEntryId?: string | null
  requestedStart: Date
  requestedEnd?: Date | null
  reason: string
}

export interface DecideAdjustmentInput {
  status: 'approved' | 'declined'
  decisionNote?: string | null
}

const REASON_MIN = 10
const REASON_MAX = 2000

export class TimesheetAdjustmentsService {
  constructor(private readonly db: PrismaClient = prisma) {}

  private validateRange(start: Date, end?: Date | null): void {
    if (Number.isNaN(start.getTime())) throw new TimesheetAdjustmentError('Invalid start time', 400)
    if (end) {
      if (Number.isNaN(end.getTime())) throw new TimesheetAdjustmentError('Invalid end time', 400)
      if (end.getTime() <= start.getTime()) {
        throw new TimesheetAdjustmentError('The end time must be after the start time')
      }
      // A shift longer than a day is nearly always a date-picker slip, and it
      // would quietly inflate payroll if approved.
      if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
        throw new TimesheetAdjustmentError('That is longer than 24 hours - check the dates')
      }
    }
    if (start.getTime() > Date.now() + 60 * 60 * 1000) {
      throw new TimesheetAdjustmentError('You cannot request a correction for a future time')
    }
  }

  /** Raise a request for yourself. */
  async createForUser(userId: string, input: CreateAdjustmentInput) {
    const reason = (input.reason || '').trim()
    if (reason.length < REASON_MIN) {
      throw new TimesheetAdjustmentError(
        `Please say why the correction is needed (at least ${REASON_MIN} characters)`,
      )
    }
    if (reason.length > REASON_MAX) {
      throw new TimesheetAdjustmentError('That reason is too long')
    }

    this.validateRange(input.requestedStart, input.requestedEnd)

    // Snapshot the current values so the request still reads correctly later,
    // even if the entry is changed or removed in the meantime.
    let originalStart: Date | null = null
    let originalEnd: Date | null = null

    if (input.timeEntryId) {
      const entry = await this.db.timeEntry.findUnique({
        where: { id: input.timeEntryId },
        select: { id: true, userId: true, start: true, end: true },
      })
      // Same 404 for "not found" and "not yours": a staff member should not be
      // able to probe for the existence of a colleague's entries.
      if (!entry || entry.userId !== userId) {
        throw new TimesheetAdjustmentError('Time entry not found', 404)
      }

      const alreadyOpen = await this.db.timesheetAdjustmentRequest.findFirst({
        where: { timeEntryId: entry.id, status: OPEN },
        select: { id: true },
      })
      if (alreadyOpen) {
        throw new TimesheetAdjustmentError(
          'There is already a pending request for this entry',
          409,
        )
      }

      originalStart = entry.start
      originalEnd = entry.end
    }

    return this.db.timesheetAdjustmentRequest.create({
      data: {
        userId,
        timeEntryId: input.timeEntryId || null,
        requestedStart: input.requestedStart,
        requestedEnd: input.requestedEnd ?? null,
        originalStart,
        originalEnd,
        reason,
        status: OPEN,
      },
      include: { timeEntry: { select: { id: true, start: true, end: true } } },
    })
  }

  /** Your own requests. */
  async listForUser(userId: string) {
    return this.db.timesheetAdjustmentRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        decidedBy: { select: { id: true, name: true, email: true } },
        timeEntry: { select: { id: true, start: true, end: true } },
      },
    })
  }

  /**
   * The queue for someone who decides.
   *
   * A payroll-privileged reviewer sees everything; anyone else sees only their
   * own direct reports, so a team lead cannot browse another team's timesheets.
   */
  async listForApprover(approverId: string, options: { canReviewAll: boolean; status?: string }) {
    const status = options.status && (ADJUSTMENT_STATUSES as readonly string[]).includes(options.status)
      ? options.status
      : OPEN

    const where = options.canReviewAll
      ? { status }
      : { status, user: { managerId: approverId } }

    return this.db.timesheetAdjustmentRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, managerId: true } },
        decidedBy: { select: { id: true, name: true, email: true } },
        timeEntry: { select: { id: true, start: true, end: true } },
      },
    })
  }

  /** May this person decide this request? */
  async canDecide(approverId: string, requestId: string, canReviewAll: boolean): Promise<boolean> {
    if (canReviewAll) return true
    const request = await this.db.timesheetAdjustmentRequest.findUnique({
      where: { id: requestId },
      select: { user: { select: { managerId: true } } },
    })
    return Boolean(request && request.user.managerId === approverId)
  }

  /**
   * Approve or decline.
   *
   * Approving writes the time entry and closes the request in one transaction:
   * a request marked approved whose hours never moved would be worse than no
   * feature at all, since payroll would read as reviewed when it was not.
   */
  async decide(requestId: string, approverId: string, input: DecideAdjustmentInput) {
    const request = await this.db.timesheetAdjustmentRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) throw new TimesheetAdjustmentError('Request not found', 404)
    if (request.status !== OPEN) {
      throw new TimesheetAdjustmentError(`This request is already ${request.status}`, 409)
    }
    // Deciding your own correction defeats the entire point of asking.
    if (request.userId === approverId) {
      throw new TimesheetAdjustmentError('You cannot decide your own request', 403)
    }

    const note = (input.decisionNote || '').trim() || null

    if (input.status === 'declined') {
      return this.db.timesheetAdjustmentRequest.update({
        where: { id: requestId },
        data: { status: 'declined', decidedById: approverId, decidedAt: new Date(), decisionNote: note },
      })
    }

    const start = request.requestedStart
    const end = request.requestedEnd
    const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null

    return this.db.$transaction(async (tx) => {
      if (request.timeEntryId) {
        const entry = await tx.timeEntry.findUnique({
          where: { id: request.timeEntryId },
          select: { id: true },
        })
        // Deleted while the request sat in the queue. Approving would silently
        // do nothing, so say so rather than pretend it worked.
        if (!entry) {
          throw new TimesheetAdjustmentError(
            'That time entry no longer exists - decline this request instead',
            409,
          )
        }
        await tx.timeEntry.update({
          where: { id: request.timeEntryId },
          data: { start, end, duration },
        })
      } else {
        await tx.timeEntry.create({
          data: { userId: request.userId, start, end, duration, notes: `Added by approved adjustment request` },
        })
      }

      return tx.timesheetAdjustmentRequest.update({
        where: { id: requestId },
        data: { status: 'approved', decidedById: approverId, decidedAt: new Date(), decisionNote: note },
      })
    })
  }

  /** Withdraw your own request while it is still open. */
  async cancelOwn(requestId: string, userId: string) {
    const request = await this.db.timesheetAdjustmentRequest.findUnique({
      where: { id: requestId },
      select: { id: true, userId: true, status: true },
    })
    if (!request || request.userId !== userId) {
      throw new TimesheetAdjustmentError('Request not found', 404)
    }
    if (request.status !== OPEN) {
      throw new TimesheetAdjustmentError(`This request is already ${request.status}`, 409)
    }
    return this.db.timesheetAdjustmentRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled' },
    })
  }

  /** Pending count, for the reviewer's badge. */
  async pendingCountFor(approverId: string, canReviewAll: boolean): Promise<number> {
    return this.db.timesheetAdjustmentRequest.count({
      where: canReviewAll ? { status: OPEN } : { status: OPEN, user: { managerId: approverId } },
    })
  }
}
