/**
 * Input rules for the managed payroll lists (2026-10-20): salary divisor
 * schemes and the employment type / pay frequency options. Pure, so the rules
 * are unit tested without a database. Mirrored for inline messages in
 * frontend/src/lib/payroll-options.ts.
 */

import { PayrollValidationError } from './payroll.errors'
import { isPayrollSchemeKind, PayrollSchemeKind } from './payroll-schemes'

export type PayrollOptionCategory = 'employment_type' | 'payment_frequency'

export const PAYROLL_OPTION_CATEGORIES: readonly PayrollOptionCategory[] = ['employment_type', 'payment_frequency']

export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 60
// A monthly salary divisor below these is almost surely a typo (2.2 for 22 days,
// 16 for 160 hours) and would multiply the rate for everyone on the scheme.
export const MIN_FIXED_DAYS = 10
export const MAX_FIXED_DAYS = 31
export const MIN_FIXED_HOURS = 40
export const MAX_FIXED_HOURS = 744
export const MIN_CREDITED_DAYS = 1
export const MAX_CREDITED_DAYS = 31
const MAX_SORT_ORDER = 9999

export const NAME_LENGTH_MESSAGE = `Use ${NAME_MIN_LENGTH} to ${NAME_MAX_LENGTH} characters.`
export const KIND_MESSAGE = 'Choose how the salary is divided: weekdays of the month, a fixed number of days, or a fixed number of hours.'
export const CREDITED_DAYS_MESSAGE = `Credited days must be between ${MIN_CREDITED_DAYS} and ${MAX_CREDITED_DAYS}, or empty for no cap.`
export const SORT_ORDER_MESSAGE = `Sort order must be a whole number from 0 to ${MAX_SORT_ORDER}.`
export const OPTION_VALUE_LOCKED_MESSAGE = 'The saved value cannot change because profiles store it. Edit the label instead.'

export interface SchemeFields {
    name: string
    kind: PayrollSchemeKind
    value: number | null
    maxCreditedDays: number | null
    sortOrder: number
}

export interface OptionFields {
    value: string
    label: string
    sortOrder: number
}

export function isPayrollOptionCategory(value: unknown): value is PayrollOptionCategory {
    return typeof value === 'string' && (PAYROLL_OPTION_CATEGORIES as readonly string[]).includes(value)
}

/** Trimmed text of NAME_MIN_LENGTH to NAME_MAX_LENGTH characters, else a 400. */
export function parseListText(value: unknown, message = NAME_LENGTH_MESSAGE): string {
    const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
    if (text.length < NAME_MIN_LENGTH || text.length > NAME_MAX_LENGTH) throw new PayrollValidationError(message)
    return text
}

/** undefined when not sent, null when cleared ('' or null), else a finite number. */
function parseOptionalNumber(value: unknown, message: string): number | null | undefined {
    if (value === undefined) return undefined
    if (value === null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed)) throw new PayrollValidationError(message)
    return parsed
}

function parseSortOrder(value: unknown, fallback: number): number {
    if (value === undefined) return fallback
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SORT_ORDER) throw new PayrollValidationError(SORT_ORDER_MESSAGE)
    return parsed
}

function fixedValueMessage(kind: PayrollSchemeKind): string {
    return kind === 'fixed_hours'
        ? `Enter the hours the monthly salary is divided by, from ${MIN_FIXED_HOURS} to ${MAX_FIXED_HOURS}.`
        : `Enter the days the monthly salary is divided by, from ${MIN_FIXED_DAYS} to ${MAX_FIXED_DAYS}.`
}

function parseSchemeValue(kind: PayrollSchemeKind, sent: unknown, current?: SchemeFields): number | null {
    if (kind === 'weekdays') return null
    const message = fixedValueMessage(kind)
    const parsed = parseOptionalNumber(sent, message)
    // Keep the stored value only when the kind did not change.
    const value = parsed === undefined && current?.kind === kind ? current.value : parsed
    const [min, max] = kind === 'fixed_hours' ? [MIN_FIXED_HOURS, MAX_FIXED_HOURS] : [MIN_FIXED_DAYS, MAX_FIXED_DAYS]
    if (typeof value !== 'number' || value < min || value > max) throw new PayrollValidationError(message)
    return value
}

function parseCreditedDays(sent: unknown, current?: SchemeFields): number | null {
    const parsed = parseOptionalNumber(sent, CREDITED_DAYS_MESSAGE)
    if (parsed === undefined) return current?.maxCreditedDays ?? null
    if (parsed === null) return null
    if (parsed < MIN_CREDITED_DAYS || parsed > MAX_CREDITED_DAYS) throw new PayrollValidationError(CREDITED_DAYS_MESSAGE)
    return parsed
}

/**
 * Scheme fields after applying `input` over `current` (create: no current).
 * weekdays always stores value null; a fixed kind needs a value in range.
 */
export function parseSchemeFields(input: Record<string, unknown>, current?: SchemeFields, nextSortOrder = 0): SchemeFields {
    const name = input.name !== undefined || !current ? parseListText(input.name) : current.name
    let kind: PayrollSchemeKind
    if (input.kind !== undefined || !current) {
        if (!isPayrollSchemeKind(input.kind)) throw new PayrollValidationError(KIND_MESSAGE)
        kind = input.kind
    } else {
        kind = current.kind
    }
    return {
        name,
        kind,
        value: parseSchemeValue(kind, input.value, current),
        maxCreditedDays: parseCreditedDays(input.maxCreditedDays, current),
        sortOrder: parseSortOrder(input.sortOrder, current?.sortOrder ?? nextSortOrder),
    }
}

/**
 * Option fields after applying `input` over `current`. On create the value
 * defaults to the label; afterwards it cannot change (profiles store it).
 */
export function parseOptionFields(input: Record<string, unknown>, current?: OptionFields, nextSortOrder = 0): OptionFields {
    const label = input.label !== undefined || !current ? parseListText(input.label) : current.label
    let value: string
    if (current) {
        if (input.value !== undefined && String(input.value).trim() !== current.value) {
            throw new PayrollValidationError(OPTION_VALUE_LOCKED_MESSAGE)
        }
        value = current.value
    } else {
        value = input.value === undefined || input.value === '' ? label : parseListText(input.value)
    }
    return { value, label, sortOrder: parseSortOrder(input.sortOrder, current?.sortOrder ?? nextSortOrder) }
}

/** isDefault may only be set to true; the old default is cleared in the same transaction. */
export function parseDefaultFlag(value: unknown): true | undefined {
    if (value === undefined) return undefined
    if (value === true) return true
    throw new PayrollValidationError('To change the default, set another item as the default.')
}

export function parseArchivedFlag(value: unknown): boolean | undefined {
    if (value === undefined) return undefined
    if (typeof value === 'boolean') return value
    throw new PayrollValidationError('archived must be true or false.')
}

/** Lowercase slug for a new scheme key, e.g. "Flat 24 days" -> "flat_24_days". */
export function slugifySchemeKey(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40)
        .replace(/_+$/g, '')
    return slug || 'scheme'
}

/** First of base, base_2, base_3 ... not in `taken`. */
export function nextFreeKey(base: string, taken: ReadonlySet<string>): string {
    if (!taken.has(base)) return base
    let suffix = 2
    while (taken.has(`${base}_${suffix}`)) suffix++
    return `${base}_${suffix}`
}
