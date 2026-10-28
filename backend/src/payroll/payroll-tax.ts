/**
 * Withholding tax rules (2026-10-28): pure helpers, no Prisma and no clock, so
 * the rules are unit tested without a database. PayrollTaxRulesService loads
 * the rows and passes them in.
 *
 * EmployeeProfile.taxRule: null follows the workspace default rule, 'none'
 * means no tax, anything else is a rule key. A workspace with no default rule
 * applies no tax to profiles that follow the default (the behaviour before
 * tax rules existed). Mirrored in frontend/src/lib/payroll-tax.ts.
 * Contract: docs/payroll-time-v2-spec.md, "Withholding tax".
 */

import { PayrollValidationError } from './payroll.errors'
import { roundMoney } from './payroll.calculations'
import { nextFreeKey, parseListText } from './payroll-options.validation'

/** Profile value for "no tax"; never used as a rule key. */
export const NO_TAX = 'none'
export const MIN_TAX_RATE = 0
export const MAX_TAX_RATE = 100
const MAX_SORT_ORDER = 9999

export const TAX_RATE_MESSAGE = `Enter a tax rate from ${MIN_TAX_RATE} to ${MAX_TAX_RATE} percent.`
export const TAX_SORT_ORDER_MESSAGE = `Sort order must be a whole number from 0 to ${MAX_SORT_ORDER}.`
export const UNKNOWN_TAX_RULE_MESSAGE = 'Choose a tax rule from the list, the workspace default, or no tax.'

export interface TaxRuleFields {
    name: string
    rate: number
    sortOrder: number
}

export interface TaxRuleDefinition {
    key: string
    name: string
    rate: number
    isDefault?: boolean
}

export interface TaxLine {
    type: 'tax'
    description: string
    amount: number
}

function round2(value: number): number {
    return Math.round(value * 100) / 100
}

/** 5 -> "5", 2.5 -> "2.5", 12.255 -> "12.26". */
export function formatTaxRate(rate: number): string {
    return String(round2(rate))
}

function parseRate(value: unknown): number {
    const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
    if (!Number.isFinite(parsed) || parsed < MIN_TAX_RATE || parsed > MAX_TAX_RATE) {
        throw new PayrollValidationError(TAX_RATE_MESSAGE)
    }
    return round2(parsed)
}

function parseSortOrder(value: unknown, fallback: number): number {
    if (value === undefined) return fallback
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_SORT_ORDER) throw new PayrollValidationError(TAX_SORT_ORDER_MESSAGE)
    return parsed
}

/** Rule fields after applying `input` over `current` (create: no current). */
export function parseTaxRuleFields(input: Record<string, unknown>, current?: TaxRuleFields, nextSortOrder = 0): TaxRuleFields {
    return {
        name: input.name !== undefined || !current ? parseListText(input.name) : current.name,
        rate: input.rate !== undefined || !current ? parseRate(input.rate) : current.rate,
        sortOrder: parseSortOrder(input.sortOrder, current?.sortOrder ?? nextSortOrder),
    }
}

/**
 * isDefault on a tax rule may be set (true) or cleared (false): unlike salary
 * schemes, a workspace may have no default tax rule at all.
 */
export function parseTaxDefaultFlag(value: unknown): boolean | undefined {
    if (value === undefined) return undefined
    if (typeof value === 'boolean') return value
    throw new PayrollValidationError('isDefault must be true or false.')
}

/** Key for a new rule: a slug of the name, never the reserved 'none'. */
export function taxRuleKeyFor(name: string, taken: ReadonlySet<string>): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40)
        .replace(/_+$/g, '')
    return nextFreeKey(slug || 'tax_rule', new Set([...taken, NO_TAX]))
}

/**
 * The value a profile save stores: undefined when not sent, null for the
 * workspace default ('' or null), 'none', or a trimmed key. 400 otherwise.
 */
export function normalizeProfileTaxRule(value: unknown): string | null | undefined {
    if (value === undefined) return undefined
    if (value === null) return null
    if (typeof value !== 'string') throw new PayrollValidationError(UNKNOWN_TAX_RULE_MESSAGE)
    const text = value.trim()
    if (!text) return null
    if (text.length > 60) throw new PayrollValidationError(UNKNOWN_TAX_RULE_MESSAGE)
    return text
}

/**
 * The rule a profile value stands for, archived rules included. 'none' is no
 * tax; null or '' is the default rule (or no tax without one). A key that
 * matches no row falls back to the default; `known` tells the caller to log it.
 */
export function resolveTaxRule(
    profileValue: string | null | undefined,
    rules: readonly TaxRuleDefinition[],
): { rule: TaxRuleDefinition | null; known: boolean } {
    const wanted = typeof profileValue === 'string' ? profileValue.trim() : ''
    if (wanted === NO_TAX) return { rule: null, known: true }
    const fallback = rules.find((rule) => rule.isDefault) ?? null
    if (!wanted) return { rule: fallback, known: true }
    const exact = rules.find((rule) => rule.key === wanted)
    return exact ? { rule: exact, known: true } : { rule: fallback, known: false }
}

/** Withholding on a gross amount: gross x rate / 100, to cents, never below 0. */
export function computeTaxAmount(grossPay: number, rate: number): number {
    if (!Number.isFinite(grossPay) || grossPay <= 0 || !Number.isFinite(rate) || rate <= 0) return 0
    return roundMoney((grossPay * rate) / 100)
}

/** "Withholding tax (Withholding 5%, 5%)". */
export function taxLineDescription(rule: Pick<TaxRuleDefinition, 'name' | 'rate'>): string {
    return `Withholding tax (${rule.name}, ${formatTaxRate(rule.rate)}%)`
}

/**
 * The payslip line for a rule: type 'tax', stored negative like a deduction,
 * computed on the gross of the lines before it. Added even when it rounds to 0,
 * so the payslip shows which rule applied.
 */
export function buildTaxLine(rule: Pick<TaxRuleDefinition, 'name' | 'rate'>, grossPay: number): TaxLine {
    // roundMoney turns -0 into 0, so a zero line never prints as "-0".
    return { type: 'tax', description: taxLineDescription(rule), amount: roundMoney(-computeTaxAmount(grossPay, rule.rate)) }
}
