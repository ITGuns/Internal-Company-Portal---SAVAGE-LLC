/**
 * Salary divisor schemes as data (2026-10-20).
 *
 * PayrollScheme rows replaced the fixed weekdays / flat_30 / flat_20 /
 * flat_160_hours values. EmployeeProfile.payrollScheme keeps the row's `key`.
 * Pure helpers only (no Prisma, no clock) so they can be unit tested; the
 * PayrollOptionsService loads rows and passes them in.
 * Contract: docs/payroll-time-v2-spec.md, "Salary divisor schemes".
 */

export type PayrollSchemeKind = 'weekdays' | 'fixed_days' | 'fixed_hours'

export const PAYROLL_SCHEME_KINDS: readonly PayrollSchemeKind[] = ['weekdays', 'fixed_days', 'fixed_hours']

export interface PayrollSchemeDefinition {
    key: string
    name: string
    kind: PayrollSchemeKind
    /** Days (fixed_days) or hours (fixed_hours) the monthly salary is divided by; null for weekdays. */
    value: number | null
    /** Cap on credited days per month for the hourly pay bases; null means no cap. */
    maxCreditedDays: number | null
    isDefault?: boolean
}

export const DEFAULT_PAYROLL_SCHEME_KEY = 'fixed_22_days'

/**
 * Fallback copy of the rows seeded by migration 202610200002_payroll_schemes.
 * Used only when the PayrollScheme table cannot be read, and by the pure
 * helpers when no row is passed in, so legacy keys keep their old math.
 */
export const BUILT_IN_PAYROLL_SCHEMES: readonly PayrollSchemeDefinition[] = [
    { key: 'fixed_22_days', name: '22 credited days', kind: 'fixed_days', value: 22, maxCreditedDays: 22, isDefault: true },
    { key: 'weekdays', name: 'Weekdays of month', kind: 'weekdays', value: null, maxCreditedDays: null },
    { key: 'flat_30', name: 'Flat 30 days', kind: 'fixed_days', value: 30, maxCreditedDays: null },
    { key: 'flat_20', name: 'Flat 20 days', kind: 'fixed_days', value: 20, maxCreditedDays: null },
    { key: 'flat_160_hours', name: 'Flat 160 hours', kind: 'fixed_hours', value: 160, maxCreditedDays: null },
]

export function isPayrollSchemeKind(value: unknown): value is PayrollSchemeKind {
    return typeof value === 'string' && (PAYROLL_SCHEME_KINDS as readonly string[]).includes(value)
}

function round2(value: number): number {
    return Math.round(value * 100) / 100
}

/** 22 -> "22", 21.75 -> "21.75". Used in payslip line descriptions. */
export function formatSchemeNumber(value: number): string {
    return String(round2(value))
}

/**
 * The scheme stored under `key`, archived rows included. An unknown or empty
 * key resolves to the default row of `schemes`, else the built-in default;
 * `known` tells the caller whether to log the fallback.
 */
export function resolvePayrollScheme(
    key: unknown,
    schemes: readonly PayrollSchemeDefinition[] = BUILT_IN_PAYROLL_SCHEMES,
): { scheme: PayrollSchemeDefinition; known: boolean } {
    const wanted = typeof key === 'string' ? key.trim() : ''
    const exact = wanted ? schemes.find((scheme) => scheme.key === wanted) : undefined
    if (exact) return { scheme: exact, known: true }
    const fallback = schemes.find((scheme) => scheme.isDefault)
        ?? BUILT_IN_PAYROLL_SCHEMES.find((scheme) => scheme.key === DEFAULT_PAYROLL_SCHEME_KEY)
        ?? BUILT_IN_PAYROLL_SCHEMES[0]
    return { scheme: fallback, known: false }
}

/**
 * What the monthly salary is divided by. A fixed kind without a positive value
 * (only possible through bad data) falls back to the weekdays of the month
 * rather than paying 0.
 */
export function schemeDivisor(
    scheme: Pick<PayrollSchemeDefinition, 'kind' | 'value'>,
    weekdaysInMonth: number,
): { unit: 'days' | 'hours'; value: number } {
    const fixed = typeof scheme.value === 'number' && scheme.value > 0 ? scheme.value : null
    if (scheme.kind === 'fixed_hours' && fixed) return { unit: 'hours', value: fixed }
    if (scheme.kind === 'fixed_days' && fixed) return { unit: 'days', value: fixed }
    return { unit: 'days', value: weekdaysInMonth }
}

/**
 * Most regular hours a period can credit: maxCreditedDays x daily cap x period
 * fraction, rounded to 2 decimals. Null when the scheme has no cap.
 */
export function creditedHoursCap(
    maxCreditedDays: number | null | undefined,
    maxBillableHoursPerDay: number,
    periodFraction: number,
): number | null {
    if (typeof maxCreditedDays !== 'number' || !(maxCreditedDays > 0)) return null
    return round2(maxCreditedDays * maxBillableHoursPerDay * Math.max(0, periodFraction))
}

export interface CreditedHoursSplit {
    /** Regular hours that are paid. */
    creditedHours: number
    /** Regular hours above the credited-days cap: shown on the payslip, not paid, not overtime. */
    uncreditedHours: number
    creditedHoursCap: number | null
}

/** Splits billable hours at the cap. Hours over by less than 0.005 h count as credited. */
export function splitCreditedHours(billableHours: number, cap: number | null): CreditedHoursSplit {
    if (cap === null) return { creditedHours: billableHours, uncreditedHours: 0, creditedHoursCap: null }
    const over = round2(billableHours - cap)
    if (over <= 0) return { creditedHours: billableHours, uncreditedHours: 0, creditedHoursCap: cap }
    return { creditedHours: cap, uncreditedHours: over, creditedHoursCap: cap }
}

/** Payslip line for hours above the cap, e.g. "Beyond 22 credited days, not paid (8 h)". */
export function uncreditedHoursDescription(maxCreditedDays: number, hours: number): string {
    return `Beyond ${formatSchemeNumber(maxCreditedDays)} credited days, not paid (${formatSchemeNumber(hours)} h)`
}
