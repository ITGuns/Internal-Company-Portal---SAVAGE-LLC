/**
 * Pure payroll math (payroll and time v2, 2026-10-08).
 *
 * Everything here is free of Prisma and the system clock so it can be unit
 * tested directly. PayrollService wires these helpers to stored data.
 * Contract: docs/payroll-time-v2-spec.md, sections "Rules" 1 to 3.
 */

import { PayrollValidationError } from './payroll.errors'

export type PayrollScheme = 'weekdays' | 'flat_30' | 'flat_20' | 'flat_160_hours'
export type PayBasis = 'hourly_from_monthly' | 'fixed_monthly' | 'hourly_rate'

export const PAY_BASES: readonly PayBasis[] = ['hourly_from_monthly', 'fixed_monthly', 'hourly_rate']
export const DEFAULT_PAY_BASIS: PayBasis = 'hourly_from_monthly'
export const DEFAULT_MAX_BILLABLE_HOURS_PER_DAY = 8
export const DEFAULT_OVERTIME_MULTIPLIER = 1.25
export const DEFAULT_PAYROLL_SCHEME: PayrollScheme = 'weekdays'

export const PAYROLL_SCHEME_LABELS: Record<PayrollScheme, string> = {
    weekdays: 'Weekdays of month',
    flat_30: 'Flat 30 days',
    flat_20: 'Flat 20 days',
    flat_160_hours: 'Flat 160 hours',
}

export const PAY_BASIS_LABELS: Record<PayBasis, string> = {
    hourly_from_monthly: 'Hourly from monthly salary',
    fixed_monthly: 'Fixed monthly salary',
    hourly_rate: 'Hourly rate',
}

export interface PayrollRateProfile {
    baseSalary?: number | null
    payrollScheme?: string | null
    maxBillableHoursPerDay?: number | null
    payBasis?: string | null
    hourlyRate?: number | null
    overtimeMultiplier?: number | null
}

/**
 * Rounds to cents, half away from zero, so a sign flip never changes the
 * magnitude. Same formula as frontend/src/lib/payslip-edit.ts.
 */
export function roundMoney(value: number): number {
    return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100 || 0
}

export const HOURLY_RATE_REQUIRED_MESSAGE = 'Set an hourly rate above 0 before using the hourly rate pay basis.'

export function normalizePositiveNumber(value: unknown, fallback: number): number {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value))
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return parsed
}

export function normalizePayrollScheme(value: unknown): PayrollScheme {
    if (value === 'flat_30' || value === 'flat_20' || value === 'flat_160_hours' || value === 'weekdays') {
        return value
    }
    return DEFAULT_PAYROLL_SCHEME
}

export function isPayBasis(value: unknown): value is PayBasis {
    return typeof value === 'string' && (PAY_BASES as readonly string[]).includes(value)
}

export function normalizePayBasis(value: unknown): PayBasis {
    return isPayBasis(value) ? value : DEFAULT_PAY_BASIS
}

export function getWeekdaysInMonth(date: Date): number {
    const year = date.getFullYear()
    const month = date.getMonth()
    const total = daysInMonth(year, month)
    let weekdays = 0
    for (let day = 1; day <= total; day++) {
        const dayOfWeek = new Date(year, month, day).getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) weekdays++
    }
    return weekdays
}

export function daysInMonth(year: number, monthIndex: number): number {
    return new Date(year, monthIndex + 1, 0).getDate()
}

function getMidpointDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + (end.getTime() - start.getTime()) / 2)
}

/**
 * Hourly rate derived from a monthly salary (the hourly_from_monthly formula).
 * fixed_monthly also uses it to price approved overtime.
 */
export function getPayrollRateContext(profile: PayrollRateProfile, startDate: Date, endDate: Date) {
    const monthlySalary = profile.baseSalary || 0
    const maxBillableHoursPerDay = normalizePositiveNumber(
        profile.maxBillableHoursPerDay,
        DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
    )
    const payrollScheme = normalizePayrollScheme(profile.payrollScheme)

    if (payrollScheme === 'flat_160_hours') {
        return {
            monthlySalary,
            payrollScheme,
            payrollSchemeLabel: PAYROLL_SCHEME_LABELS[payrollScheme],
            maxBillableHoursPerDay,
            divisorHours: 160,
            hourlyRate: monthlySalary / 160,
            dailyRate: (monthlySalary / 160) * maxBillableHoursPerDay,
        }
    }

    const divisorDays = payrollScheme === 'flat_30'
        ? 30
        : payrollScheme === 'flat_20'
            ? 20
            : getWeekdaysInMonth(getMidpointDate(startDate, endDate))
    const dailyRate = divisorDays > 0 ? monthlySalary / divisorDays : 0

    return {
        monthlySalary,
        payrollScheme,
        payrollSchemeLabel: PAYROLL_SCHEME_LABELS[payrollScheme],
        maxBillableHoursPerDay,
        divisorDays,
        hourlyRate: maxBillableHoursPerDay > 0 ? dailyRate / maxBillableHoursPerDay : 0,
        dailyRate,
    }
}

const DAY_MS = 86_400_000
const HALF_DAY_MS = DAY_MS / 2

interface DayParts {
    year: number
    month: number // 0-based
    day: number
}

function dayKeyParts(dayKey: string): DayParts {
    const [year, month, day] = dayKey.split('-').map(Number)
    return { year, month: month - 1, day }
}

function partsToDayKey({ year, month, day }: DayParts): string {
    return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
}

/** dayKey shifted by whole calendar days. */
export function addDaysToKey(dayKey: string, days: number): string {
    const parts = dayKeyParts(dayKey)
    return partsToDayKey({ ...parts, day: parts.day + days })
}

/**
 * Calendar day (YYYY-MM-DD) of a period's first day. Periods were stored at
 * midnight in different zones over time (UTC on Vercel, server-local in dev,
 * the payroll timezone since 2026-10-09). Any midnight less than 12 hours from
 * UTC lands on its own UTC date once shifted forward half a day, so old and
 * new rows read back as the same calendar day.
 */
export function periodStartDayKey(start: Date): string {
    return new Date(start.getTime() + HALF_DAY_MS).toISOString().slice(0, 10)
}

/**
 * Calendar day of a period's last day (or pay date). These are stored as
 * 23:59:59 of that day in a zone less than 12 hours from UTC; shifting back
 * half a day lands on the same UTC date.
 */
export function periodEndDayKey(end: Date): string {
    return new Date(end.getTime() - HALF_DAY_MS).toISOString().slice(0, 10)
}

/**
 * Share of a monthly salary a period represents (Rule 3, fixed_monthly):
 * 0.5 for a 1-15 or 16-end half, 1 for a whole month, else calendar days
 * divided by the days in the start month.
 */
export function periodFraction(start: Date, end: Date): number {
    const first = dayKeyParts(periodStartDayKey(start))
    const last = dayKeyParts(periodEndDayKey(end))
    const monthDays = daysInMonth(first.year, first.month)

    if (first.year === last.year && first.month === last.month) {
        if (first.day === 1 && last.day === monthDays) return 1
        if (first.day === 1 && last.day === 15) return 0.5
        if (first.day === 16 && last.day === monthDays) return 0.5
    }

    const calendarDays = (Date.UTC(last.year, last.month, last.day) - Date.UTC(first.year, first.month, first.day)) / DAY_MS + 1
    if (calendarDays <= 0) return 0
    return calendarDays / monthDays
}

/** Rule 2: paid OT for a day = min(approved, actual - cap), never negative. */
export function paidOvertimeHoursForDay(actualHours: number, cap: number, approvedHours: number): number {
    const overCap = Math.max(0, actualHours - cap)
    return Math.max(0, Math.min(Math.max(0, approvedHours), overCap))
}

export interface PayrollHoursSummary {
    totalHours: number
    billableHours: number
    overtimeHours: number
    overtimeApprovedHours: number
    overtimePendingHours: number
}

/**
 * Split per-day hours into billable (capped), approved overtime (paid) and
 * pending overtime (unpaid). approvedByDay is keyed like dailyHours.
 */
export function summarizePayrollHours(
    dailyHours: ReadonlyMap<string, number>,
    cap: number,
    approvedByDay: ReadonlyMap<string, number> = new Map(),
): PayrollHoursSummary {
    return Array.from(dailyHours.entries()).reduce<PayrollHoursSummary>((acc, [day, hours]) => {
        const overCap = Math.max(0, hours - cap)
        const paid = paidOvertimeHoursForDay(hours, cap, approvedByDay.get(day) || 0)
        return {
            totalHours: acc.totalHours + hours,
            billableHours: acc.billableHours + Math.min(hours, cap),
            overtimeHours: acc.overtimeHours + overCap,
            overtimeApprovedHours: acc.overtimeApprovedHours + paid,
            overtimePendingHours: acc.overtimePendingHours + (overCap - paid),
        }
    }, { totalHours: 0, billableHours: 0, overtimeHours: 0, overtimeApprovedHours: 0, overtimePendingHours: 0 })
}

export interface GrossPayInput {
    payBasis: PayBasis
    billableHours: number
    overtimeApprovedHours: number
    monthlySalary: number
    derivedHourlyRate: number
    explicitHourlyRate?: number | null
    overtimeMultiplier?: number | null
    periodFraction: number
}

export interface GrossPayResult {
    payBasis: PayBasis
    hourlyRate: number
    basePay: number
    overtimeRate: number
    overtimePay: number
    grossPay: number
}

/** Rule 3: gross pay per pay basis, plus approved overtime. */
export function computeGrossPay(input: GrossPayInput): GrossPayResult {
    // hourly_rate without a positive rate must never pay 0 silently.
    if (input.payBasis === 'hourly_rate' && !((input.explicitHourlyRate ?? 0) > 0)) {
        throw new PayrollValidationError(HOURLY_RATE_REQUIRED_MESSAGE)
    }
    const hourlyRate = input.payBasis === 'hourly_rate'
        ? input.explicitHourlyRate as number
        : input.derivedHourlyRate
    const multiplier = normalizePositiveNumber(input.overtimeMultiplier, DEFAULT_OVERTIME_MULTIPLIER)
    const overtimeRate = hourlyRate * multiplier
    const overtimePay = input.overtimeApprovedHours * overtimeRate
    const basePay = input.payBasis === 'fixed_monthly'
        ? input.monthlySalary * input.periodFraction
        : input.billableHours * hourlyRate

    return {
        payBasis: input.payBasis,
        hourlyRate,
        basePay,
        overtimeRate,
        overtimePay,
        grossPay: basePay + overtimePay,
    }
}

// ---------------------------------------------------------------------------
// Day bucketing in PAYROLL_TIMEZONE (Rule 1). Intl only, no dependencies.
// ---------------------------------------------------------------------------

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getDayFormatter(timeZone: string): Intl.DateTimeFormat {
    const cached = formatterCache.get(timeZone)
    if (cached) return cached
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    })
    formatterCache.set(timeZone, formatter)
    return formatter
}

function zonedParts(instant: Date, timeZone: string) {
    const parts = getDayFormatter(timeZone).formatToParts(instant)
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0)
    return {
        year: read('year'),
        month: read('month'),
        day: read('day'),
        hour: read('hour') % 24,
        minute: read('minute'),
        second: read('second'),
    }
}

export function isValidTimeZone(timeZone: string): boolean {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone })
        return true
    } catch {
        return false
    }
}

/** Calendar day (YYYY-MM-DD) of an instant as seen in the payroll timezone. */
export function payrollDayKey(instant: Date, timeZone: string): string {
    const { year, month, day } = zonedParts(instant, timeZone)
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Returns the normalized YYYY-MM-DD key, or null when the value is not a real date. */
export function parseDateKey(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const match = DATE_KEY_PATTERN.exec(value.trim())
    if (!match) return null
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month - 1)) return null
    return `${match[1]}-${match[2]}-${match[3]}`
}

function timeZoneOffsetMs(instant: Date, timeZone: string): number {
    const p = zonedParts(instant, timeZone)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/** UTC instant of midnight at the start of dateKey in the payroll timezone. */
export function zonedMidnightUtc(dateKey: string, timeZone: string): Date {
    const normalized = parseDateKey(dateKey)
    if (!normalized) throw new Error('Invalid date')
    const [year, month, day] = normalized.split('-').map(Number)
    const naiveUtc = Date.UTC(year, month - 1, day)
    const firstGuess = naiveUtc - timeZoneOffsetMs(new Date(naiveUtc), timeZone)
    // Second pass corrects for an offset change between the guess and midnight.
    return new Date(naiveUtc - timeZoneOffsetMs(new Date(firstGuess), timeZone))
}

/** [start, end) UTC window covering one payroll-timezone calendar day. */
export function payrollDayWindow(dateKey: string, timeZone: string): { start: Date; end: Date } {
    const start = zonedMidnightUtc(dateKey, timeZone)
    const [year, month, day] = dateKey.split('-').map(Number)
    const next = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
    return { start, end: zonedMidnightUtc(next, timeZone) }
}

/**
 * [start, end) UTC window covering every payroll-timezone day of a period
 * (first calendar day through last calendar day). Query with gte/lt so each
 * payroll day belongs to exactly one period and gets exactly one daily cap.
 */
export function payrollPeriodWindow(startDate: Date, endDate: Date, timeZone: string): { start: Date; end: Date } {
    return {
        start: zonedMidnightUtc(periodStartDayKey(startDate), timeZone),
        end: payrollDayWindow(periodEndDayKey(endDate), timeZone).end,
    }
}

/** True when the payroll day `dayKey` is one of the period's calendar days. */
export function periodCoversDayKey(period: { startDate: Date; endDate: Date }, dayKey: string): boolean {
    return periodStartDayKey(period.startDate) <= dayKey && dayKey <= periodEndDayKey(period.endDate)
}

export interface PeriodBounds {
    start: Date
    end: Date
    payDate: Date
}

/** Last second (23:59:59) of a payroll-timezone day, as stored on period ends and pay dates. */
function endOfPayrollDay(dayKey: string, timeZone: string): Date {
    return new Date(payrollDayWindow(dayKey, timeZone).end.getTime() - 1000)
}

/**
 * Stored bounds for a period covering startKey..endKey (payroll-timezone
 * calendar days): start at midnight, end and pay date at 23:59:59. The pay
 * date defaults to 5 days after the end.
 */
export function periodBoundsForDays(
    startKey: string,
    endKey: string,
    timeZone: string,
    payKey: string = addDaysToKey(endKey, 5),
): PeriodBounds {
    return {
        start: zonedMidnightUtc(startKey, timeZone),
        end: endOfPayrollDay(endKey, timeZone),
        payDate: endOfPayrollDay(payKey, timeZone),
    }
}

/**
 * Calendar day of a period edge sent by a client: a YYYY-MM-DD key as is, or
 * an ISO instant read with the tolerant edge rules above. Null when invalid.
 */
export function periodEdgeDayKey(value: unknown, edge: 'start' | 'end'): string | null {
    const key = parseDateKey(value)
    if (key) return key
    if (typeof value !== 'string' || !value.trim()) return null
    const instant = new Date(value)
    if (Number.isNaN(instant.getTime())) return null
    return edge === 'start' ? periodStartDayKey(instant) : periodEndDayKey(instant)
}

/** Period bounds from client input (start, end, optional pay date). Throws on bad dates. */
export function periodBoundsFromInput(
    input: { startDate: unknown; endDate: unknown; payDate?: unknown },
    timeZone: string,
): PeriodBounds {
    const startKey = periodEdgeDayKey(input.startDate, 'start')
    const endKey = periodEdgeDayKey(input.endDate, 'end')
    if (!startKey || !endKey) throw new PayrollValidationError('Start and end dates must be valid dates')
    if (endKey < startKey) throw new PayrollValidationError('The end date must be on or after the start date')
    const hasPayDate = input.payDate !== undefined && input.payDate !== null && input.payDate !== ''
    const payKey = hasPayDate ? periodEdgeDayKey(input.payDate, 'end') : addDaysToKey(endKey, 5)
    if (!payKey) throw new PayrollValidationError('The pay date must be a valid date')
    return periodBoundsForDays(startKey, endKey, timeZone, payKey)
}

/** The semi-monthly period (1-15 or 16-end) that contains the payroll day dayKey. */
export function semiMonthlyPeriodForDay(dayKey: string, timeZone: string): PeriodBounds {
    const { year, month, day } = dayKeyParts(dayKey)
    const firstHalf = day <= 15
    const startKey = partsToDayKey({ year, month, day: firstHalf ? 1 : 16 })
    const endKey = partsToDayKey({ year, month, day: firstHalf ? 15 : daysInMonth(year, month) })
    return periodBoundsForDays(startKey, endKey, timeZone)
}

export interface DurationEntry {
    start: Date
    duration?: number | null
}

/** Sum time-entry minutes into hours per payroll-timezone day of the entry start. */
export function bucketEntryHoursByDay(entries: readonly DurationEntry[], timeZone: string): Map<string, number> {
    const totals = new Map<string, number>()
    for (const entry of entries) {
        const key = payrollDayKey(entry.start, timeZone)
        totals.set(key, (totals.get(key) || 0) + (entry.duration || 0) / 60)
    }
    return totals
}
