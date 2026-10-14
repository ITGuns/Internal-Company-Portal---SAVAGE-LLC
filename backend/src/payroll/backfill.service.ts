import { prisma } from '../database/prisma.service'
import { config } from '../config/env.config'
import { isInternalEmployeeAccount } from '../employees/employees.security'
import { PayrollForbiddenError, PayrollNotFoundError, PayrollValidationError } from './payroll.errors'
import { payrollDayKey, payrollDayWindow, zonedMidnightUtc } from './payroll.calculations'
import {
    backfillEntryTimes,
    backfillNote,
    enumerateDayKeys,
    occupiedDayKeys,
    planBackfillDays,
    validateBackfillInput,
} from './backfill.calculations'
import { assertDaysUnlocked, serializable } from './time-requests.service'

export interface BackfillActor {
    requesterId: string
    /** Full-access roles may also backfill a deactivated member. */
    isFullAccess: boolean
}

export interface BackfillResult {
    /** Entries written; always 0 on a dry run. */
    created: number
    /** "YYYY-MM-DD: weekend" or "YYYY-MM-DD: existing entry". */
    skipped: string[]
    /** Days that get (or, on a dry run, would get) an entry. */
    days: string[]
}

function readFlag(value: unknown, field: string): boolean {
    if (value === undefined || value === null) return false
    if (typeof value !== 'boolean') throw new PayrollValidationError(`${field} must be true or false`)
    return value
}

/** POST /payroll/entries/backfill: one entry per past day for time tracked outside Deskii. */
export class BackfillService {
    async backfill(body: Record<string, unknown>, actor: BackfillActor, now = new Date()): Promise<BackfillResult> {
        const timeZone = config.payrollTimezone
        const todayKey = payrollDayKey(now, timeZone)
        const range = validateBackfillInput(body, todayKey)
        const skipWeekends = readFlag(body.skipWeekends, 'skipWeekends')
        const dryRun = readFlag(body.dryRun, 'dryRun')
        const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
        if (!userId) throw new PayrollValidationError('Choose an employee')

        const [target, actorUser] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    status: true,
                    roles: { select: { role: true } },
                    clientMemberships: { select: { status: true } },
                },
            }),
            prisma.user.findUnique({ where: { id: actor.requesterId }, select: { name: true, email: true } }),
        ])
        if (!target) throw new PayrollNotFoundError('Employee not found')
        if (!isInternalEmployeeAccount(target)) {
            throw new PayrollValidationError('Hours can only be backfilled for employees, not client accounts')
        }
        if (target.status === 'inactive' && !actor.isFullAccess) {
            throw new PayrollForbiddenError('Only an admin can backfill hours for a deactivated member')
        }

        const note = backfillNote(range.notes, actorUser?.name?.trim() || actorUser?.email || 'payroll', todayKey)
        const rangeStart = zonedMidnightUtc(range.startKey, timeZone)
        const rangeEnd = payrollDayWindow(range.endKey, timeZone).end

        // Serializable: a double submit cannot both see an empty day and write it twice.
        return serializable(async (tx) => {
            const existing = await tx.timeEntry.findMany({
                where: {
                    userId,
                    start: { lt: rangeEnd },
                    OR: [{ end: null }, { end: { gt: rangeStart } }],
                },
                select: { start: true, end: true },
            })
            const plan = planBackfillDays(enumerateDayKeys(range.startKey, range.endKey), {
                skipWeekends,
                occupied: occupiedDayKeys(existing, now, timeZone),
            })
            const windows = plan.days.map((day) => backfillEntryTimes(day, range.startMinutes, range.endMinutes, timeZone))
            if (windows.some((window) => window.end > now)) {
                throw new PayrollValidationError('An entry cannot end in the future. End the range yesterday or pick an earlier end time.')
            }
            await assertDaysUnlocked(tx, windows.map((window) => window.start))

            if (!dryRun && windows.length > 0) {
                await tx.timeEntry.createMany({
                    data: windows.map(({ start, end }) => ({
                        userId,
                        start,
                        end,
                        duration: Math.round((end.getTime() - start.getTime()) / 60_000),
                        notes: note,
                    })),
                })
            }
            return { created: dryRun ? 0 : windows.length, skipped: plan.skipped, days: plan.days }
        })
    }
}
