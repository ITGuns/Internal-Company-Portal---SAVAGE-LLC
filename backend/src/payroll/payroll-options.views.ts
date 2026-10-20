/**
 * Pure shapes and helpers for the managed payroll lists (split out of
 * payroll-options.service.ts, 2026-10-20): API views of the rows, the scheme
 * definition the pay math reads, and small rules shared by the service.
 */

import type { PayrollOption as PayrollOptionRow, PayrollScheme as PayrollSchemeRow } from '@prisma/client'
import { PayrollConflictError } from './payroll.errors'
import { isPayrollSchemeKind, PayrollSchemeDefinition } from './payroll-schemes'
import { SchemeFields } from './payroll-options.validation'

export interface PayrollSchemeView {
    id: string
    key: string
    name: string
    kind: string
    value: number | null
    maxCreditedDays: number | null
    isDefault: boolean
    sortOrder: number
    archived: boolean
    archivedAt: string | null
    /** Profiles storing this key. Sent to payroll roles only. */
    inUseCount?: number
}

export interface PayrollOptionView {
    id: string
    category: string
    value: string
    label: string
    isDefault: boolean
    sortOrder: number
    archived: boolean
    archivedAt: string | null
    inUseCount?: number
}

export function plural(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function toDefinition(row: PayrollSchemeRow): PayrollSchemeDefinition {
    return {
        key: row.key,
        name: row.name,
        kind: isPayrollSchemeKind(row.kind) ? row.kind : 'weekdays',
        value: row.value,
        maxCreditedDays: row.maxCreditedDays,
        isDefault: row.isDefault,
    }
}

export function toSchemeFields(row: PayrollSchemeRow): SchemeFields {
    const { kind, value, maxCreditedDays } = toDefinition(row)
    return { name: row.name, kind, value, maxCreditedDays, sortOrder: row.sortOrder }
}

export function toSchemeView(row: PayrollSchemeRow, usage?: ReadonlyMap<string, number>): PayrollSchemeView {
    return {
        id: row.id,
        key: row.key,
        name: row.name,
        kind: row.kind,
        value: row.value,
        maxCreditedDays: row.maxCreditedDays,
        isDefault: row.isDefault,
        sortOrder: row.sortOrder,
        archived: row.archivedAt !== null,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        ...(usage ? { inUseCount: usage.get(row.key) ?? 0 } : {}),
    }
}

export function toOptionView(row: PayrollOptionRow, usage?: ReadonlyMap<string, number>): PayrollOptionView {
    return {
        id: row.id,
        category: row.category,
        value: row.value,
        label: row.label,
        isDefault: row.isDefault,
        sortOrder: row.sortOrder,
        archived: row.archivedAt !== null,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        ...(usage ? { inUseCount: usage.get(row.value) ?? 0 } : {}),
    }
}

export function nextSortOrder(rows: ReadonlyArray<{ sortOrder: number }>): number {
    return rows.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0)
}

export function assertUniqueText(rows: ReadonlyArray<{ text: string }>, text: string, what: string) {
    const wanted = text.toLowerCase()
    if (rows.some((row) => row.text.toLowerCase() === wanted)) {
        throw new PayrollConflictError(`${what} "${text}" is already in the list.`)
    }
}

/** archivedAt for a PATCH: keep the first archive time, clear on restore. */
export function archiveData(archived: boolean | undefined, current: Date | null) {
    if (archived === undefined) return {}
    return { archivedAt: archived ? current ?? new Date() : null }
}
