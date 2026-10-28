/**
 * Automatic employee history (2026-10-28, payroll manager request): pure
 * helpers for PayrollRosterSnapshot rows, unit tested without a database.
 * One row per person per pay period records who was on payroll and what they
 * were paid. RosterSnapshotService (roster-snapshot.service.ts) writes the
 * rows; the routes in roster-snapshot.routes.ts read them.
 * Contract: docs/payroll-time-v2-spec.md, "Employee history".
 */

import { PayrollValidationError } from './payroll.errors'
import { isPayBasis, PAY_BASIS_LABELS, periodEndDayKey, periodStartDayKey, roundMoney } from './payroll.calculations'
import { formatTaxRate, resolveTaxRule, TaxRuleDefinition } from './payroll-tax'

/** Statuses whose members are always on the payroll roster and in bulk generation. */
export const PAYROLL_ACTIVE_STATUSES: readonly string[] = ['active', 'verified', 'vacation', 'leave']

export const PAYSLIP_STATUSES = ['draft', 'approved', 'locked'] as const
export type RosterPayslipStatus = typeof PAYSLIP_STATUSES[number]

export interface RosterUserSource {
    id: string
    name?: string | null
    email?: string | null
    status?: string | null
    roles?: ReadonlyArray<{ role?: string | null; department?: { name?: string | null } | null }>
    employeeProfile?: {
        jobTitle?: string | null
        employmentType?: string | null
        payrollScheme?: string | null
        payBasis?: string | null
        baseSalary?: number | null
        taxRule?: string | null
    } | null
}

export interface RosterPayslipItem {
    type: string
    description: string
    amount: number
}

export interface RosterPayslipSource {
    id: string
    grossPay: number
    netPay: number
    approvalStatus?: string | null
    items?: readonly RosterPayslipItem[]
}

/** Names for a profile's scheme key and tax value at capture time; null when unknown. */
export interface RosterLabels {
    schemeName(key: string | null | undefined): string | null
    taxRuleLabel(profileValue: string | null | undefined): string | null
}

/** The stored fields of a PayrollRosterSnapshot row, without its keys. */
export interface RosterSnapshotFields {
    name: string
    email: string
    department: string
    roleTitle: string
    employmentType: string | null
    memberStatus: string
    payrollScheme: string | null
    payBasis: string | null
    baseSalary: number | null
    taxRule: string | null
    hoursWorked: number | null
    grossPay: number | null
    taxAmount: number | null
    netPay: number | null
    payslipId: string | null
    payslipStatus: RosterPayslipStatus | null
}

/** A row as the API returns it: the stored fields plus the period it belongs to. */
export interface RosterRowView extends RosterSnapshotFields {
    periodId: string
    /** Payroll-timezone calendar days (YYYY-MM-DD). */
    periodStart: string
    periodEnd: string
    periodStatus: string
    userId: string
    capturedAt: string
}

export interface RosterCount {
    value: string | null
    count: number
}

export interface RosterSummary {
    headcount: number
    /** Rows with a payslip. */
    withPayslip: number
    /** By employmentType value; null counts the people without one. */
    byCategory: RosterCount[]
    /** By member status (active, verified, vacation, leave, inactive). */
    byStatus: RosterCount[]
    totals: { grossPay: number; taxAmount: number; netPay: number }
}

export type RosterTarget = { periodId: string } | { userId: string }

export const ROSTER_QUERY_MESSAGE = 'Send a periodId or a userId, not both.'
export const ROSTER_ID_MESSAGE = 'That periodId or userId is not valid.'

const ROSTER_ID = /^[A-Za-z0-9_-]{1,64}$/
// The earning line of a payslip carries its hours: "(176 h credited, 184 h billable, ...)".
const HOURS_LINE = /\(\d+(?:\.\d+)?\s+h(?:rs?)?\b/i
// A spreadsheet runs a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/

function text(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

/**
 * Status of a person's payslip for the period: null without one, 'locked'
 * once the period is processed (it never changes again), else the sign-off.
 */
export function payslipStatusFor(
    payslip: { approvalStatus?: string | null } | null | undefined,
    periodStatus: string,
): RosterPayslipStatus | null {
    if (!payslip) return null
    if (periodStatus !== 'draft') return 'locked'
    return payslip.approvalStatus === 'approved' ? 'approved' : 'draft'
}

/** Hours on the earning line ("N h billable" first), 0 when the payslip has none. */
export function payslipHoursWorked(items: readonly RosterPayslipItem[] = []): number {
    const earning = items.find((item) => item.amount >= 0 && HOURS_LINE.test(item.description))
    if (!earning) return 0
    // "N h billable" when present: a capped line starts with the credited hours (2026-10-20).
    const match = earning.description.match(/([\d.]+)\s+h billable/i) ?? earning.description.match(/\(([\d.]+)\s+h(?:rs?)?\b/i)
    return match ? Number(match[1]) || 0 : 0
}

/** Withholding on a payslip: its 'tax' lines as a positive amount. */
export function payslipTaxAmount(items: readonly RosterPayslipItem[] = []): number {
    return roundMoney(items.filter((item) => item.type === 'tax').reduce((sum, item) => sum + Math.abs(item.amount), 0))
}

/**
 * Labels from the scheme and tax rule lists. A list that could not be read
 * is passed as null: the scheme then keeps its key and the tax rule is null,
 * rather than recording a wrong name.
 */
export function makeRosterLabels(
    schemes: ReadonlyArray<{ key: string; name: string; isDefault?: boolean }> | null,
    rules: readonly TaxRuleDefinition[] | null,
): RosterLabels {
    return {
        schemeName(key) {
            const wanted = text(key)
            if (!schemes) return wanted
            const row = schemes.find((scheme) => scheme.key === wanted) ?? schemes.find((scheme) => scheme.isDefault)
            return row?.name ?? wanted
        },
        taxRuleLabel(profileValue) {
            if (!rules) return null
            const { rule } = resolveTaxRule(profileValue, rules)
            return rule ? `${rule.name}, ${formatTaxRate(rule.rate)}%` : 'No tax'
        },
    }
}

/** The fields of one snapshot row from the current user, profile and payslip (if any). */
export function buildRosterFields(input: {
    user: RosterUserSource
    payslip: RosterPayslipSource | null
    periodStatus: string
    labels: RosterLabels
}): RosterSnapshotFields {
    const { user, payslip, periodStatus, labels } = input
    const profile = user.employeeProfile ?? null
    const role = user.roles?.find((assignment) => text(assignment.department?.name)) ?? user.roles?.[0]
    const email = text(user.email) ?? ''
    return {
        name: text(user.name) ?? (email || 'Unknown'),
        email,
        department: text(role?.department?.name) ?? 'Unassigned',
        roleTitle: text(profile?.jobTitle) ?? text(role?.role) ?? 'Member',
        employmentType: text(profile?.employmentType),
        memberStatus: text(user.status) ?? 'active',
        payrollScheme: profile ? labels.schemeName(profile.payrollScheme) : null,
        payBasis: text(profile?.payBasis),
        baseSalary: typeof profile?.baseSalary === 'number' ? roundMoney(profile.baseSalary) : null,
        taxRule: profile ? labels.taxRuleLabel(profile.taxRule) : null,
        hoursWorked: payslip ? payslipHoursWorked(payslip.items) : null,
        grossPay: payslip ? roundMoney(payslip.grossPay) : null,
        taxAmount: payslip ? payslipTaxAmount(payslip.items) : null,
        netPay: payslip ? roundMoney(payslip.netPay) : null,
        payslipId: payslip?.id ?? null,
        payslipStatus: payslipStatusFor(payslip, periodStatus),
    }
}

function asPayslipStatus(value: string | null): RosterPayslipStatus | null {
    return (PAYSLIP_STATUSES as readonly string[]).includes(value ?? '') ? value as RosterPayslipStatus : null
}

/**
 * API view of a stored row. A processed period never changes again, so its
 * payslips read as locked even when the capture at lock time did not run.
 */
export function toRosterRowView(
    row: Omit<RosterSnapshotFields, 'payslipStatus'> & { periodId: string; userId: string; capturedAt: Date; payslipStatus: string | null },
    period: { startDate: Date; endDate: Date; status: string },
): RosterRowView {
    return {
        periodId: row.periodId,
        periodStart: periodStartDayKey(period.startDate),
        periodEnd: periodEndDayKey(period.endDate),
        periodStatus: period.status,
        userId: row.userId,
        name: row.name,
        email: row.email,
        department: row.department,
        roleTitle: row.roleTitle,
        employmentType: row.employmentType,
        memberStatus: row.memberStatus,
        payrollScheme: row.payrollScheme,
        payBasis: row.payBasis,
        baseSalary: row.baseSalary,
        taxRule: row.taxRule,
        hoursWorked: row.hoursWorked,
        grossPay: row.grossPay,
        taxAmount: row.taxAmount,
        netPay: row.netPay,
        payslipId: row.payslipId,
        payslipStatus: row.payslipId && period.status !== 'draft' ? 'locked' : asPayslipStatus(row.payslipStatus),
        capturedAt: row.capturedAt.toISOString(),
    }
}

/** Counts per value, largest first, then by value; the null bucket last. */
function countBy<T>(rows: readonly T[], pick: (row: T) => string | null): RosterCount[] {
    const counts = rows.reduce((map, row) => {
        const key = pick(row)
        return map.set(key, (map.get(key) ?? 0) + 1)
    }, new Map<string | null, number>())
    return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) => {
            if (left.value === null || right.value === null) return left.value === null ? 1 : -1
            return right.count - left.count || left.value.localeCompare(right.value)
        })
}

/** Headcount by category and by status, and the pay totals of the rows with a payslip. */
export function summarizeRoster(
    rows: ReadonlyArray<Pick<RosterSnapshotFields, 'employmentType' | 'memberStatus' | 'grossPay' | 'taxAmount' | 'netPay' | 'payslipId'>>,
): RosterSummary {
    const sum = (pick: (row: typeof rows[number]) => number | null) => roundMoney(rows.reduce((total, row) => total + (pick(row) ?? 0), 0))
    return {
        headcount: rows.length,
        withPayslip: rows.filter((row) => row.payslipId !== null).length,
        byCategory: countBy(rows, (row) => row.employmentType),
        byStatus: countBy(rows, (row) => row.memberStatus),
        totals: {
            grossPay: sum((row) => row.grossPay),
            taxAmount: sum((row) => row.taxAmount),
            netPay: sum((row) => row.netPay),
        },
    }
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export type CsvValue = string | number | null | undefined

/**
 * One CSV cell. Text that starts with = + - @, a tab or a carriage return
 * gets a leading single quote so a spreadsheet shows it instead of running it
 * as a formula; cells with a comma, quote or line break are quoted. Numbers
 * are written by this function (2 decimals) and stay numbers.
 */
export function csvCell(value: CsvValue): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(2) : ''
    const guarded = FORMULA_START.test(value) ? `'${value}` : value
    return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

const MEMBER_STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    verified: 'Verified',
    vacation: 'On vacation',
    leave: 'On leave',
    inactive: 'Inactive',
    pending: 'Pending',
}

const PAYSLIP_STATUS_LABELS: Record<RosterPayslipStatus, string> = {
    draft: 'Draft',
    approved: 'Approved',
    locked: 'Locked',
}

export function memberStatusLabel(status: string): string {
    return MEMBER_STATUS_LABELS[status] ?? status
}

export function payslipStatusLabel(status: RosterPayslipStatus | null): string {
    return status ? PAYSLIP_STATUS_LABELS[status] : 'No payslip'
}

export function payBasisLabel(payBasis: string | null): string {
    if (!payBasis) return ''
    return isPayBasis(payBasis) ? PAY_BASIS_LABELS[payBasis] : payBasis
}

/** An employment type's label from the option list; the value itself when unlisted, "Not set" for none. */
export function categoryLabelFor(options: ReadonlyArray<{ value: string; label: string }>, value: string | null): string {
    if (!value) return 'Not set'
    return options.find((option) => option.value === value)?.label ?? value
}

export const ROSTER_CSV_HEADER = [
    'Period start', 'Period end', 'Employee', 'Email', 'Department', 'Role', 'Category', 'Member status',
    'Salary scheme', 'Pay basis', 'Base salary', 'Withholding tax', 'Hours', 'Gross pay', 'Tax', 'Net pay',
    'Payslip status', 'Captured at',
] as const

/** UTF-8 with a byte order mark (so Excel reads names with accents) and CRLF line ends. */
export function buildRosterCsv(rows: readonly RosterRowView[], categoryLabel: (value: string | null) => string): string {
    const lines: CsvValue[][] = [
        [...ROSTER_CSV_HEADER],
        ...rows.map((row): CsvValue[] => [
            row.periodStart, row.periodEnd, row.name, row.email, row.department, row.roleTitle,
            categoryLabel(row.employmentType), memberStatusLabel(row.memberStatus), row.payrollScheme, payBasisLabel(row.payBasis),
            row.baseSalary, row.taxRule, row.hoursWorked, row.grossPay, row.taxAmount, row.netPay,
            payslipStatusLabel(row.payslipStatus), row.capturedAt,
        ]),
    ]
    return `\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\r\n')}\r\n`
}

function filenameSlug(value: string): string {
    const slug = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
        .replace(/-+$/g, '')
    return slug || 'employee'
}

/** ASCII-only download names, safe inside a quoted Content-Disposition. */
export function rosterCsvFilename(target: { periodStart: string; periodEnd: string } | { employeeName: string }): string {
    if ('employeeName' in target) return `deskii-payroll-history-${filenameSlug(target.employeeName)}.csv`
    return `deskii-employee-history-${filenameSlug(target.periodStart)}-to-${filenameSlug(target.periodEnd)}.csv`
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

function queryText(value: unknown): string | undefined {
    if (value === undefined) return undefined
    if (typeof value !== 'string') throw new PayrollValidationError(ROSTER_QUERY_MESSAGE)
    return value.trim() || undefined
}

/** Exactly one of periodId or userId, each a plain id (400 otherwise). */
export function parseRosterQuery(query: Record<string, unknown>): RosterTarget {
    const periodId = queryText(query.periodId)
    const userId = queryText(query.userId)
    if ((periodId === undefined) === (userId === undefined)) throw new PayrollValidationError(ROSTER_QUERY_MESSAGE)
    if (periodId !== undefined) {
        if (!ROSTER_ID.test(periodId)) throw new PayrollValidationError(ROSTER_ID_MESSAGE)
        return { periodId }
    }
    const id = userId as string
    if (!ROSTER_ID.test(id)) throw new PayrollValidationError(ROSTER_ID_MESSAGE)
    return { userId: id }
}
