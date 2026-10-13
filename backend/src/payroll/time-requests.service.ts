import type { Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { config } from '../config/env.config'
import {
    PayrollConflictError,
    PayrollForbiddenError,
    PayrollNotFoundError,
    PayrollValidationError,
} from './payroll.errors'
import {
    DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
    normalizePositiveNumber,
    parseDateKey,
    payrollDayKey,
    payrollDayWindow,
    periodCoversDayKey,
    zonedMidnightUtc,
} from './payroll.calculations'

/**
 * Overtime requests and time-entry adjustment requests (payroll v2, Rules 2
 * and 4). Employees file; management or payroll roles review.
 */

export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type AdjustmentAction = 'create' | 'update' | 'delete'

const REQUEST_STATUSES: readonly RequestStatus[] = ['pending', 'approved', 'rejected']
const ADJUSTMENT_ACTIONS: readonly AdjustmentAction[] = ['create', 'update', 'delete']
// Shared with frontend/src/lib/time-requests.ts and payslip-edit.ts (reason and note).
const MAX_TEXT_LENGTH = 500
const MAX_HOURS_PER_DAY = 24
const HOURS_EPSILON = 1e-6
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** Adjustment bounds, mirrored in frontend/src/lib/time-requests.ts. */
export const MAX_ADJUSTMENT_SPAN_HOURS = 24
export const MAX_ADJUSTMENT_LOOKBACK_DAYS = 60
const LOCKED_DAY_MESSAGE = 'That day is in a processed payroll period and can no longer change.'
const CONCURRENT_REQUEST_MESSAGE = 'Another request for this time was filed at the same moment. Try again.'
const SERIALIZABLE = { isolationLevel: 'Serializable' as const }

export interface RequestActor {
    requesterId: string
    canReview: boolean
}

export interface RequestListFilters {
    status?: string
    userId?: string
    from?: string
    to?: string
}

const requestInclude = {
    user: { select: { id: true, name: true, email: true } },
    reviewedBy: { select: { id: true, name: true } },
} as const

// ---------------------------------------------------------------------------
// Pure validation helpers (unit tested in tests/payroll.time-requests.test.ts)
// ---------------------------------------------------------------------------

export function normalizeOptionalText(value: unknown, field: string): string | null {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') throw new PayrollValidationError(`${field} must be text`)
    const trimmed = value.trim()
    if (trimmed.length > MAX_TEXT_LENGTH) {
        throw new PayrollValidationError(`${field} can be at most ${MAX_TEXT_LENGTH} characters`)
    }
    return trimmed || null
}

export function normalizeRequiredText(value: unknown, field: string): string {
    const text = normalizeOptionalText(value, field)
    if (!text) throw new PayrollValidationError(`${field} is required`)
    return text
}

export function parseRequestHours(value: unknown): number {
    const hours = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_HOURS_PER_DAY) {
        throw new PayrollValidationError('Hours must be more than 0 and at most 24')
    }
    return hours
}

export function parseRequestStatus(value: unknown): RequestStatus | undefined {
    if (value === undefined || value === null || value === '' || value === 'all') return undefined
    if (typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value)) {
        return value as RequestStatus
    }
    throw new PayrollValidationError('Status must be pending, approved or rejected')
}

export function parseAdjustmentAction(value: unknown): AdjustmentAction {
    if (value === undefined) return 'update'
    if (typeof value === 'string' && (ADJUSTMENT_ACTIONS as readonly string[]).includes(value)) {
        return value as AdjustmentAction
    }
    throw new PayrollValidationError('Action must be create, update or delete')
}

function parseInstant(value: unknown, field: string): Date | null {
    if (value === undefined || value === null || value === '') return null
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) throw new PayrollValidationError(`${field} is not a valid date and time`)
    return date
}

/**
 * Bounds for proposed times: not in the future, not older than
 * MAX_ADJUSTMENT_LOOKBACK_DAYS, and an entry spans at most MAX_ADJUSTMENT_SPAN_HOURS.
 */
export function assertAdjustmentBounds(start: Date | null, end: Date | null, now: Date): void {
    const earliest = now.getTime() - MAX_ADJUSTMENT_LOOKBACK_DAYS * DAY_MS
    for (const instant of [start, end]) {
        if (!instant) continue
        if (instant.getTime() > now.getTime()) {
            throw new PayrollValidationError('Proposed times cannot be in the future')
        }
        if (instant.getTime() < earliest) {
            throw new PayrollValidationError(`Corrections can only go back ${MAX_ADJUSTMENT_LOOKBACK_DAYS} days`)
        }
    }
    if (start && end && end.getTime() - start.getTime() > MAX_ADJUSTMENT_SPAN_HOURS * HOUR_MS) {
        throw new PayrollValidationError(`An entry can be at most ${MAX_ADJUSTMENT_SPAN_HOURS} hours long`)
    }
}

function isSerializationFailure(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2034'
}

/** Runs fn in a serializable transaction; a lost race answers 409 instead of 500. */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
        return await prisma.$transaction(fn, SERIALIZABLE)
    } catch (error) {
        if (isSerializationFailure(error)) throw new PayrollConflictError(CONCURRENT_REQUEST_MESSAGE)
        throw error
    }
}

/** 409 when any of the instants falls on a day of a processed (non-draft) period. */
async function assertDaysUnlocked(
    client: Prisma.TransactionClient,
    instants: readonly (Date | null | undefined)[],
): Promise<void> {
    const present = instants.filter((instant): instant is Date => instant instanceof Date)
    if (present.length === 0) return
    const times = present.map((instant) => instant.getTime())
    // Period bounds are calendar days, so widen by a day to catch timezone edges.
    const locked = await client.payrollPeriod.findMany({
        where: {
            status: { not: 'draft' },
            startDate: { lte: new Date(Math.max(...times) + DAY_MS) },
            endDate: { gte: new Date(Math.min(...times) - DAY_MS) },
        },
        select: { startDate: true, endDate: true },
    })
    const dayKeys = present.map((instant) => payrollDayKey(instant, config.payrollTimezone))
    if (locked.some((period) => dayKeys.some((dayKey) => periodCoversDayKey(period, dayKey)))) {
        throw new PayrollConflictError(LOCKED_DAY_MESSAGE)
    }
}

/** Hours a request holds against a day: the ask while pending, the approved hours once approved. */
export function claimedRequestHours(request: { status: string; hours: number; approvedHours: number | null }): number {
    return request.status === 'approved' ? (request.approvedHours ?? request.hours) : request.hours
}

/** Over-cap hours of a day that no pending or approved request already claims. */
export function unclaimedOvertimeHours(actualHours: number, cap: number, claimedHours: number): number {
    return Math.max(0, Math.max(0, actualHours - cap) - Math.max(0, claimedHours))
}

interface AppliedAdjustment {
    timeEntryId: string | null
    previousStart: Date | null
    previousEnd: Date | null
}

export interface AdjustmentDraft {
    action: AdjustmentAction
    timeEntryId: string | null
    proposedStart: Date | null
    proposedEnd: Date | null
    reason: string
}

/** Validates the shape and bounds of an adjustment request body (no database). */
export function parseAdjustmentDraft(body: Record<string, unknown>, now: Date = new Date()): AdjustmentDraft {
    const action = parseAdjustmentAction(body.action)
    const reason = normalizeRequiredText(body.reason, 'Reason')
    const timeEntryId = typeof body.timeEntryId === 'string' && body.timeEntryId.trim()
        ? body.timeEntryId.trim()
        : null
    const proposedStart = parseInstant(body.proposedStart, 'Proposed start')
    const proposedEnd = parseInstant(body.proposedEnd, 'Proposed end')

    if (action === 'create') {
        if (timeEntryId) throw new PayrollValidationError('A new entry request cannot reference an existing entry')
        if (!proposedStart || !proposedEnd) {
            throw new PayrollValidationError('Proposed start and end are required for a new entry')
        }
    } else if (!timeEntryId) {
        throw new PayrollValidationError('Choose the time entry to correct')
    }
    if (action === 'update' && !proposedStart && !proposedEnd) {
        throw new PayrollValidationError('Propose a new start or end time')
    }
    if (proposedStart && proposedEnd && proposedEnd <= proposedStart) {
        throw new PayrollValidationError('End time must be after start time')
    }
    if (action !== 'delete') assertAdjustmentBounds(proposedStart, proposedEnd, now)

    return {
        action,
        timeEntryId,
        proposedStart: action === 'delete' ? null : proposedStart,
        proposedEnd: action === 'delete' ? null : proposedEnd,
        reason,
    }
}

/** Owners and reviewers may remove a request, but only while it is pending. */
function assertCanWithdraw(
    request: { userId: string; status: string },
    actor: RequestActor,
) {
    if (!actor.canReview && request.userId !== actor.requesterId) {
        throw new PayrollForbiddenError('You can only withdraw your own requests')
    }
    if (request.status !== 'pending') {
        throw new PayrollConflictError('Only pending requests can be withdrawn')
    }
}

function assertNotSelfReview(request: { userId: string }, reviewerId: string) {
    if (request.userId === reviewerId) {
        throw new PayrollForbiddenError('You cannot review your own request')
    }
}

function durationMinutes(start: Date, end: Date | null): number | null {
    return end ? Math.round((end.getTime() - start.getTime()) / 60000) : null
}

/** Appends the approval line, dated in the payroll timezone (a Manila day, not UTC). */
export function appendCorrectionNote(existing: string | null, reason: string, reviewedAt: Date): string {
    const line = `Correction approved ${payrollDayKey(reviewedAt, config.payrollTimezone)}: ${reason}`
    return existing ? `${existing}\n${line}` : line
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TimeRequestsService {
    private buildListWhere(filters: RequestListFilters, actor: RequestActor) {
        const status = parseRequestStatus(filters.status)
        const userId = actor.canReview ? (filters.userId || undefined) : actor.requesterId
        return { status, userId }
    }

    private buildWorkDateRange(filters: RequestListFilters): Prisma.DateTimeFilter | undefined {
        const timeZone = config.payrollTimezone
        const from = filters.from ? parseDateKey(filters.from) : null
        const to = filters.to ? parseDateKey(filters.to) : null
        if ((filters.from && !from) || (filters.to && !to)) {
            throw new PayrollValidationError('Dates must use the YYYY-MM-DD format')
        }
        if (!from && !to) return undefined
        return {
            ...(from ? { gte: zonedMidnightUtc(from, timeZone) } : {}),
            ...(to ? { lt: payrollDayWindow(to, timeZone).end } : {}),
        }
    }

    // ----- Overtime -----

    private async getDayHours(client: Prisma.TransactionClient, userId: string, dateKey: string) {
        const { start, end } = payrollDayWindow(dateKey, config.payrollTimezone)
        const entries = await client.timeEntry.findMany({
            where: { userId, start: { gte: start, lt: end }, duration: { not: null } },
            select: { duration: true },
        })
        const entryHours = entries.reduce((sum, entry) => sum + (entry.duration || 0) / 60, 0)
        if (entryHours > 0) return entryHours

        const logs = await client.dailyLog.findMany({
            where: { authorId: userId, logType: 'daily', date: { gte: start, lt: end } },
            select: { hoursLogged: true },
        })
        return logs.reduce((sum, log) => sum + (log.hoursLogged || 0), 0)
    }

    async createOvertimeRequest(userId: string, body: Record<string, unknown>) {
        const dateKey = parseDateKey(body.workDate)
        if (!dateKey) throw new PayrollValidationError('Work date must use the YYYY-MM-DD format')
        const hours = parseRequestHours(body.hours)
        const reason = normalizeOptionalText(body.reason, 'Reason')
        const workDate = zonedMidnightUtc(dateKey, config.payrollTimezone)

        // Availability check and insert share one serializable transaction, so two
        // concurrent requests cannot both claim the same over-cap hours.
        return serializable(async (tx) => {
            const profile = await tx.employeeProfile.findUnique({ where: { userId }, select: { maxBillableHoursPerDay: true } })
            const actualHours = await this.getDayHours(tx, userId, dateKey)
            const open = await tx.overtimeRequest.findMany({
                where: { userId, workDate, status: { in: ['pending', 'approved'] } },
                select: { status: true, hours: true, approvedHours: true },
            })
            const claimed = open.reduce((sum, request) => sum + claimedRequestHours(request), 0)
            const cap = normalizePositiveNumber(profile?.maxBillableHoursPerDay, DEFAULT_MAX_BILLABLE_HOURS_PER_DAY)
            const available = unclaimedOvertimeHours(actualHours, cap, claimed)
            if (hours > available + HOURS_EPSILON) {
                throw new PayrollValidationError(
                    `You can request at most ${Math.round(available * 100) / 100} overtime hours for that day`,
                )
            }

            return tx.overtimeRequest.create({
                data: { userId, workDate, hours, reason },
                include: requestInclude,
            })
        })
    }

    async listOvertimeRequests(filters: RequestListFilters, actor: RequestActor) {
        const { status, userId } = this.buildListWhere(filters, actor)
        const workDate = this.buildWorkDateRange(filters)
        return prisma.overtimeRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(userId ? { userId } : {}),
                ...(workDate ? { workDate } : {}),
            },
            include: requestInclude,
            orderBy: [{ createdAt: 'desc' }],
            take: 500,
        })
    }

    async reviewOvertimeRequest(
        id: string,
        reviewerId: string,
        decision: 'approved' | 'rejected',
        body: Record<string, unknown>,
    ) {
        const note = normalizeOptionalText(body.note, 'Note')
        const request = await prisma.overtimeRequest.findUnique({ where: { id } })
        if (!request) throw new PayrollNotFoundError('Overtime request not found')
        assertNotSelfReview(request, reviewerId)

        // hours stays the original ask; approvedHours records what was approved.
        const hasOverride = decision === 'approved' && body.hours !== undefined && body.hours !== null
        const approvedHours = hasOverride ? parseRequestHours(body.hours) : request.hours
        if (approvedHours > request.hours + HOURS_EPSILON) {
            throw new PayrollValidationError('Approved hours cannot exceed the requested hours')
        }
        if (decision === 'approved') await assertDaysUnlocked(prisma, [request.workDate])

        const updated = await prisma.overtimeRequest.updateMany({
            where: { id, status: 'pending' },
            data: {
                status: decision,
                approvedHours: decision === 'approved' ? approvedHours : null,
                reviewedById: reviewerId,
                reviewedAt: new Date(),
                reviewNote: note,
            },
        })
        if (updated.count === 0) throw new PayrollConflictError('This request was already reviewed')
        return prisma.overtimeRequest.findUnique({ where: { id }, include: requestInclude })
    }

    async deleteOvertimeRequest(id: string, actor: RequestActor) {
        const request = await prisma.overtimeRequest.findUnique({ where: { id } })
        if (!request) throw new PayrollNotFoundError('Overtime request not found')
        assertCanWithdraw(request, actor)
        await prisma.overtimeRequest.delete({ where: { id } })
    }

    // ----- Adjustments -----

    async createAdjustmentRequest(userId: string, body: Record<string, unknown>) {
        const draft = parseAdjustmentDraft(body)

        return serializable(async (tx) => {
            if (draft.timeEntryId) {
                const entry = await tx.timeEntry.findUnique({ where: { id: draft.timeEntryId } })
                if (!entry || entry.userId !== userId) throw new PayrollNotFoundError('Time entry not found')
                const start = draft.proposedStart ?? entry.start
                const end = draft.proposedEnd ?? entry.end
                if (draft.action === 'update' && end && end <= start) {
                    throw new PayrollValidationError('End time must be after start time')
                }
                if (draft.action === 'update' && end && end.getTime() - start.getTime() > MAX_ADJUSTMENT_SPAN_HOURS * HOUR_MS) {
                    throw new PayrollValidationError(`An entry can be at most ${MAX_ADJUSTMENT_SPAN_HOURS} hours long`)
                }
                await assertDaysUnlocked(tx, [entry.start, draft.proposedStart])
                const openRequest = await tx.timeEntryAdjustmentRequest.findFirst({
                    where: { timeEntryId: draft.timeEntryId, status: 'pending' },
                    select: { id: true },
                })
                if (openRequest) throw new PayrollConflictError('This entry already has a pending correction')
            } else {
                await assertDaysUnlocked(tx, [draft.proposedStart])
            }

            return tx.timeEntryAdjustmentRequest.create({
                data: { userId, ...draft },
                include: { ...requestInclude, timeEntry: true },
            })
        })
    }

    async listAdjustmentRequests(filters: RequestListFilters, actor: RequestActor) {
        const { status, userId } = this.buildListWhere(filters, actor)
        const range = this.buildWorkDateRange(filters)
        return prisma.timeEntryAdjustmentRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(userId ? { userId } : {}),
                ...(range ? { createdAt: range } : {}),
            },
            include: { ...requestInclude, timeEntry: true },
            orderBy: [{ createdAt: 'desc' }],
            take: 500,
        })
    }

    private async applyAdjustment(
        tx: Prisma.TransactionClient,
        request: { userId: string; action: string; timeEntryId: string | null; proposedStart: Date | null; proposedEnd: Date | null; reason: string },
        reviewedAt: Date,
    ): Promise<AppliedAdjustment> {
        if (request.action === 'create') {
            const start = request.proposedStart as Date
            await assertDaysUnlocked(tx, [start])
            const created = await tx.timeEntry.create({
                data: {
                    userId: request.userId,
                    start,
                    end: request.proposedEnd,
                    duration: durationMinutes(start, request.proposedEnd),
                    notes: appendCorrectionNote(null, request.reason, reviewedAt),
                },
            })
            return { timeEntryId: created.id, previousStart: null, previousEnd: null }
        }

        const entry = request.timeEntryId
            ? await tx.timeEntry.findUnique({ where: { id: request.timeEntryId } })
            : null
        if (!entry) throw new PayrollConflictError('The time entry no longer exists. Reject this request instead.')
        await assertDaysUnlocked(tx, [entry.start, request.proposedStart])
        const previous = { previousStart: entry.start, previousEnd: entry.end }

        if (request.action === 'delete') {
            await tx.timeEntry.delete({ where: { id: entry.id } })
            return { timeEntryId: null, ...previous }
        }

        const start = request.proposedStart ?? entry.start
        const end = request.proposedEnd ?? entry.end
        if (end && end <= start) throw new PayrollValidationError('End time must be after start time')
        await tx.timeEntry.update({
            where: { id: entry.id },
            data: {
                start,
                end,
                duration: durationMinutes(start, end),
                notes: appendCorrectionNote(entry.notes, request.reason, reviewedAt),
            },
        })
        return { timeEntryId: entry.id, ...previous }
    }

    async approveAdjustmentRequest(id: string, reviewerId: string, body: Record<string, unknown>) {
        const note = normalizeOptionalText(body.note, 'Note')
        const reviewedAt = new Date()

        return prisma.$transaction(async (tx) => {
            const request = await tx.timeEntryAdjustmentRequest.findUnique({ where: { id } })
            if (!request) throw new PayrollNotFoundError('Adjustment request not found')
            assertNotSelfReview(request, reviewerId)
            const claimed = await tx.timeEntryAdjustmentRequest.updateMany({
                where: { id, status: 'pending' },
                data: { status: 'approved', reviewedById: reviewerId, reviewedAt, reviewNote: note },
            })
            if (claimed.count === 0) throw new PayrollConflictError('This request was already reviewed')

            // The entry's old times are kept on the request so reviewers see old vs new.
            const applied = await this.applyAdjustment(tx, request, reviewedAt)
            return tx.timeEntryAdjustmentRequest.update({
                where: { id },
                data: applied,
                include: { ...requestInclude, timeEntry: true },
            })
        })
    }

    async rejectAdjustmentRequest(id: string, reviewerId: string, body: Record<string, unknown>) {
        const note = normalizeOptionalText(body.note, 'Note')
        const request = await prisma.timeEntryAdjustmentRequest.findUnique({ where: { id } })
        if (!request) throw new PayrollNotFoundError('Adjustment request not found')
        assertNotSelfReview(request, reviewerId)
        const updated = await prisma.timeEntryAdjustmentRequest.updateMany({
            where: { id, status: 'pending' },
            data: { status: 'rejected', reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: note },
        })
        if (updated.count === 0) throw new PayrollConflictError('This request was already reviewed')
        return prisma.timeEntryAdjustmentRequest.findUnique({
            where: { id },
            include: { ...requestInclude, timeEntry: true },
        })
    }

    async deleteAdjustmentRequest(id: string, actor: RequestActor) {
        const request = await prisma.timeEntryAdjustmentRequest.findUnique({ where: { id } })
        if (!request) throw new PayrollNotFoundError('Adjustment request not found')
        assertCanWithdraw(request, actor)
        await prisma.timeEntryAdjustmentRequest.delete({ where: { id } })
    }
}
