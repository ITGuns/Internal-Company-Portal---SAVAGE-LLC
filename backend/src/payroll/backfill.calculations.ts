import { addDaysToKey, parseDateKey, payrollDayKey, zonedMidnightUtc } from './payroll.calculations'
import { PayrollValidationError } from './payroll.errors'

/**
 * Hours backfill (owner request 2026-10-14): payroll roles add the same
 * working window to every day of a past date range, for the time before
 * Deskii was in use. Pure helpers, no database. The validation rules are
 * mirrored in frontend/src/lib/backfill-hours.ts.
 */

/** The end date may be at most this many days after the start date. */
export const MAX_BACKFILL_SPAN_DAYS = 62
export const MAX_BACKFILL_NOTE_LENGTH = 500

export type BackfillSkipReason = 'weekend' | 'existing entry'

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const MINUTE_MS = 60_000

export interface BackfillInput {
    startDate?: unknown
    endDate?: unknown
    startTime?: unknown
    endTime?: unknown
    notes?: unknown
}

export interface BackfillRange {
    startKey: string
    endKey: string
    startMinutes: number
    endMinutes: number
    notes: string
}

/** Minutes after midnight for "HH:MM" (00:00 to 23:59), or null. */
export function parseClockMinutes(value: unknown): number | null {
    if (typeof value !== 'string') return null
    const match = CLOCK_PATTERN.exec(value.trim())
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/**
 * Checks the dates, times and note against today's payroll day. An end time
 * earlier than the start time ends on the next day (a night shift). Equal
 * times are refused, so an entry is always shorter than 24 hours.
 */
export function validateBackfillInput(input: BackfillInput, todayKey: string): BackfillRange {
    const startKey = parseDateKey(input.startDate)
    const endKey = parseDateKey(input.endDate)
    if (!startKey || !endKey) throw new PayrollValidationError('Start and end dates must be real dates (YYYY-MM-DD)')
    if (endKey < startKey) throw new PayrollValidationError('The end date must be on or after the start date')
    if (endKey > todayKey) throw new PayrollValidationError('The end date cannot be in the future')
    if (endKey > addDaysToKey(startKey, MAX_BACKFILL_SPAN_DAYS)) {
        throw new PayrollValidationError(`The end date can be at most ${MAX_BACKFILL_SPAN_DAYS} days after the start date`)
    }

    const startMinutes = parseClockMinutes(input.startTime)
    const endMinutes = parseClockMinutes(input.endTime)
    if (startMinutes === null || endMinutes === null) {
        throw new PayrollValidationError('Start and end times must use HH:MM (24-hour clock)')
    }
    if (endMinutes === startMinutes) throw new PayrollValidationError('The end time cannot be the same as the start time')

    if (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string') {
        throw new PayrollValidationError('Notes must be text')
    }
    const notes = typeof input.notes === 'string' ? input.notes.trim() : ''
    if (notes.length > MAX_BACKFILL_NOTE_LENGTH) {
        throw new PayrollValidationError(`Notes can be at most ${MAX_BACKFILL_NOTE_LENGTH} characters`)
    }

    return { startKey, endKey, startMinutes, endMinutes, notes }
}

/** Every day key from startKey to endKey, inclusive. */
export function enumerateDayKeys(startKey: string, endKey: string): string[] {
    const days: string[] = []
    for (let day = startKey; day <= endKey; day = addDaysToKey(day, 1)) days.push(day)
    return days
}

/** Saturday or Sunday. A day key is already a payroll-timezone calendar day. */
export function isWeekendDayKey(dayKey: string): boolean {
    const [year, month, day] = dayKey.split('-').map(Number)
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    return weekday === 0 || weekday === 6
}

/**
 * UTC instants for the window on one payroll-timezone day. An end time earlier
 * than the start ends on the next day; the entry still belongs to its start
 * day. Offsets from local midnight, which is exact for zones without daylight
 * saving (Asia/Manila).
 */
export function backfillEntryTimes(
    dayKey: string,
    startMinutes: number,
    endMinutes: number,
    timeZone: string,
): { start: Date; end: Date } {
    const midnight = zonedMidnightUtc(dayKey, timeZone).getTime()
    const endMidnight = endMinutes < startMinutes
        ? zonedMidnightUtc(addDaysToKey(dayKey, 1), timeZone).getTime()
        : midnight
    return {
        start: new Date(midnight + startMinutes * MINUTE_MS),
        end: new Date(endMidnight + endMinutes * MINUTE_MS),
    }
}

export interface ExistingEntryLike {
    start: Date
    end: Date | null
}

/** Payroll days an entry touches, from its start to its last minute. An open entry runs until now. */
export function occupiedDayKeys(entries: readonly ExistingEntryLike[], now: Date, timeZone: string): Set<string> {
    const days = new Set<string>()
    for (const entry of entries) {
        const lastMs = Math.max(entry.start.getTime(), (entry.end ?? now).getTime() - 1)
        const first = payrollDayKey(entry.start, timeZone)
        const last = payrollDayKey(new Date(lastMs), timeZone)
        for (const day of enumerateDayKeys(first, last)) days.add(day)
    }
    return days
}

/**
 * Days whose window would overlap an existing entry (an open entry runs until
 * now). occupiedDayKeys already covers a window inside its own day; this
 * catches an overnight window running into an entry on the next morning.
 */
export function overlappingDayKeys(
    dayKeys: readonly string[],
    entries: readonly ExistingEntryLike[],
    range: Pick<BackfillRange, 'startMinutes' | 'endMinutes'>,
    now: Date,
    timeZone: string,
): string[] {
    return dayKeys.filter((day) => {
        const window = backfillEntryTimes(day, range.startMinutes, range.endMinutes, timeZone)
        return entries.some((entry) => entry.start < window.end && (entry.end ?? now) > window.start)
    })
}

export interface BackfillPlan {
    /** Days that get an entry. */
    days: string[]
    /** "YYYY-MM-DD: weekend" or "YYYY-MM-DD: existing entry". */
    skipped: string[]
}

/** Days with any entry are skipped, never merged. Weekends are skipped when asked. */
export function planBackfillDays(
    dayKeys: readonly string[],
    options: { skipWeekends: boolean; occupied: ReadonlySet<string> },
): BackfillPlan {
    const days: string[] = []
    const skipped: string[] = []
    for (const day of dayKeys) {
        let reason: BackfillSkipReason | null = null
        if (options.skipWeekends && isWeekendDayKey(day)) reason = 'weekend'
        else if (options.occupied.has(day)) reason = 'existing entry'

        if (reason) skipped.push(`${day}: ${reason}`)
        else days.push(day)
    }
    return { days, skipped }
}

/** Notes on every backfilled entry: the caller's note, then who backfilled and when. */
export function backfillNote(notes: string, actorLabel: string, todayKey: string): string {
    const suffix = `Backfilled by ${actorLabel} on ${todayKey}`
    return notes ? `${notes} ${suffix}` : suffix
}
