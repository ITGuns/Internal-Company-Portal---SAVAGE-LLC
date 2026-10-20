/**
 * Managed payroll lists (2026-10-20): salary divisor schemes (PayrollScheme)
 * and the employment type / pay frequency options (PayrollOption).
 *
 * Profiles store a scheme `key` or an option `value`, never an id, so renaming
 * never touches them. A row in use can be archived (it keeps working for the
 * people on it) but not deleted. Exactly one default per list; setting a new
 * default clears the old one in the same transaction. The default is what new
 * profiles get and what an unknown stored key resolves to.
 * Contract: docs/payroll-time-v2-spec.md, "Salary divisor schemes".
 */

import type { PayrollOption as PayrollOptionRow, PayrollScheme as PayrollSchemeRow, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'
import { PayrollConflictError, PayrollNotFoundError, PayrollValidationError } from './payroll.errors'
import { BUILT_IN_PAYROLL_SCHEMES, PayrollSchemeDefinition, resolvePayrollScheme } from './payroll-schemes'
import {
    nextFreeKey,
    OptionFields,
    parseArchivedFlag,
    parseDefaultFlag,
    parseOptionFields,
    parseSchemeFields,
    PayrollOptionCategory,
    slugifySchemeKey,
} from './payroll-options.validation'
import {
    archiveData,
    assertUniqueText,
    nextSortOrder,
    PayrollOptionView,
    PayrollSchemeView,
    plural,
    toDefinition,
    toOptionView,
    toSchemeFields,
    toSchemeView,
} from './payroll-options.views'

export type { PayrollOptionView, PayrollSchemeView } from './payroll-options.views'

const logger = createLogger('payroll.options')

const CONCURRENT_CHANGE_MESSAGE = 'Someone else changed this list at the same moment. Reload and try again.'
const DUPLICATE_MESSAGE = 'That name or value is already in the list.'
const DEFAULT_LOCKED_MESSAGE = 'This is the default. Set another item as the default first.'
const SCHEME_NOT_FOUND = 'That scheme no longer exists. Reload the list.'
const OPTION_NOT_FOUND = 'That option no longer exists. Reload the list.'
const UNKNOWN_SCHEME_MESSAGE = 'Choose a salary divisor scheme from the list.'

const CATEGORY_NOUNS: Record<PayrollOptionCategory, string> = {
    employment_type: 'employment type',
    payment_frequency: 'pay frequency',
}

const PROFILE_FIELDS: Record<PayrollOptionCategory, 'employmentType' | 'paymentFrequency'> = {
    employment_type: 'employmentType',
    payment_frequency: 'paymentFrequency',
}

const LIST_ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]

export interface NewProfileDefaults {
    payrollScheme?: string
    employmentType?: string
    paymentFrequency?: string
}

export interface ProfileSelections {
    payrollScheme?: string | null
    employmentType?: string | null
    paymentFrequency?: string | null
}

type Db = Prisma.TransactionClient

const loggedOnce = new Set<string>()

function logOnce(key: string, message: string, context: Record<string, unknown>) {
    if (loggedOnce.has(key)) return
    loggedOnce.add(key)
    logger.warn(message, context)
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function errorCode(error: unknown): unknown {
    return typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
}

export class PayrollOptionsService {
    constructor(private readonly db: PrismaClient = prisma) { }

    /** Serializable so two default switches cannot leave two defaults; a lost race answers 409. */
    private async inTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        try {
            return await this.db.$transaction(fn, { isolationLevel: 'Serializable' })
        } catch (error) {
            if (errorCode(error) === 'P2034') throw new PayrollConflictError(CONCURRENT_CHANGE_MESSAGE)
            if (errorCode(error) === 'P2002') throw new PayrollConflictError(DUPLICATE_MESSAGE)
            throw error
        }
    }

    private async schemeUsage(db: Db): Promise<Map<string, number>> {
        const groups = await db.employeeProfile.groupBy({ by: ['payrollScheme'], _count: { _all: true } })
        return new Map(groups.map((group) => [group.payrollScheme, group._count._all]))
    }

    private async optionUsage(db: Db, category: PayrollOptionCategory): Promise<Map<string, number>> {
        if (PROFILE_FIELDS[category] === 'employmentType') {
            const groups = await db.employeeProfile.groupBy({ by: ['employmentType'], _count: { _all: true } })
            return new Map(groups.map((group) => [group.employmentType ?? '', group._count._all]))
        }
        const groups = await db.employeeProfile.groupBy({ by: ['paymentFrequency'], _count: { _all: true } })
        return new Map(groups.map((group) => [group.paymentFrequency, group._count._all]))
    }

    // ------------------------------------------------------------------ schemes

    async listSchemes(options: { includeUsage?: boolean } = {}): Promise<PayrollSchemeView[]> {
        const rows = await this.db.payrollScheme.findMany({ orderBy: LIST_ORDER })
        const usage = options.includeUsage ? await this.schemeUsage(this.db) : undefined
        return rows.map((row) => toSchemeView(row, usage))
    }

    async createScheme(input: Record<string, unknown>): Promise<PayrollSchemeView> {
        return this.inTransaction(async (tx) => {
            const existing = await tx.payrollScheme.findMany({ select: { key: true, name: true, sortOrder: true } })
            const fields = parseSchemeFields(input, undefined, nextSortOrder(existing))
            const makeDefault = parseDefaultFlag(input.isDefault) === true
            assertUniqueText(existing.map((row) => ({ text: row.name })), fields.name, 'A scheme named')
            const key = nextFreeKey(slugifySchemeKey(fields.name), new Set(existing.map((row) => row.key)))
            if (makeDefault) await tx.payrollScheme.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            const row = await tx.payrollScheme.create({ data: { key, ...fields, isDefault: makeDefault } })
            return toSchemeView(row, new Map([[key, 0]]))
        })
    }

    async updateScheme(id: string, input: Record<string, unknown>): Promise<PayrollSchemeView> {
        return this.inTransaction(async (tx) => {
            const row = await tx.payrollScheme.findUnique({ where: { id } })
            if (!row) throw new PayrollNotFoundError(SCHEME_NOT_FOUND)
            const fields = parseSchemeFields(input, toSchemeFields(row))
            const makeDefault = parseDefaultFlag(input.isDefault) === true && !row.isDefault
            const archived = parseArchivedFlag(input.archived)
            if (archived === true && (row.isDefault || makeDefault)) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            if (makeDefault && row.archivedAt && archived !== false) {
                throw new PayrollConflictError('Restore this scheme before making it the default.')
            }
            if (fields.name.toLowerCase() !== row.name.toLowerCase()) {
                const others = await tx.payrollScheme.findMany({ where: { NOT: { id } }, select: { name: true } })
                assertUniqueText(others.map((other) => ({ text: other.name })), fields.name, 'A scheme named')
            }
            if (makeDefault) {
                await tx.payrollScheme.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } })
            }
            const updated = await tx.payrollScheme.update({
                where: { id },
                data: { ...fields, ...(makeDefault ? { isDefault: true } : {}), ...archiveData(archived, row.archivedAt) },
            })
            const inUse = await tx.employeeProfile.count({ where: { payrollScheme: row.key } })
            return toSchemeView(updated, new Map([[row.key, inUse]]))
        })
    }

    async deleteScheme(id: string): Promise<void> {
        await this.inTransaction(async (tx) => {
            const row = await tx.payrollScheme.findUnique({ where: { id } })
            if (!row) throw new PayrollNotFoundError(SCHEME_NOT_FOUND)
            if (row.isDefault) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            const inUse = await tx.employeeProfile.count({ where: { payrollScheme: row.key } })
            if (inUse > 0) {
                throw new PayrollConflictError(
                    `"${row.name}" is used by ${plural(inUse, 'employee')}, so it cannot be deleted. Archive it instead; archived schemes keep working for the people on them.`,
                )
            }
            await tx.payrollScheme.delete({ where: { id } })
        })
    }

    // ------------------------------------------------------------------ options

    async listOptions(category: PayrollOptionCategory, options: { includeUsage?: boolean } = {}): Promise<PayrollOptionView[]> {
        const rows = await this.db.payrollOption.findMany({ where: { category }, orderBy: LIST_ORDER })
        const usage = options.includeUsage ? await this.optionUsage(this.db, category) : undefined
        return rows.map((row) => toOptionView(row, usage))
    }

    async createOption(category: PayrollOptionCategory, input: Record<string, unknown>): Promise<PayrollOptionView> {
        return this.inTransaction(async (tx) => {
            const existing = await tx.payrollOption.findMany({ where: { category }, select: { value: true, label: true, sortOrder: true } })
            const fields = parseOptionFields(input, undefined, nextSortOrder(existing))
            const makeDefault = parseDefaultFlag(input.isDefault) === true
            assertUniqueText(existing.map((row) => ({ text: row.label })), fields.label, 'An option named')
            assertUniqueText(existing.map((row) => ({ text: row.value })), fields.value, 'The value')
            if (makeDefault) {
                await tx.payrollOption.updateMany({ where: { category, isDefault: true }, data: { isDefault: false } })
            }
            const row = await tx.payrollOption.create({ data: { category, ...fields, isDefault: makeDefault } })
            return toOptionView(row, new Map([[row.value, 0]]))
        })
    }

    async updateOption(category: PayrollOptionCategory, id: string, input: Record<string, unknown>): Promise<PayrollOptionView> {
        return this.inTransaction(async (tx) => {
            const row = await tx.payrollOption.findFirst({ where: { id, category } })
            if (!row) throw new PayrollNotFoundError(OPTION_NOT_FOUND)
            const current: OptionFields = { value: row.value, label: row.label, sortOrder: row.sortOrder }
            const fields = parseOptionFields(input, current)
            const makeDefault = parseDefaultFlag(input.isDefault) === true && !row.isDefault
            const archived = parseArchivedFlag(input.archived)
            if (archived === true && (row.isDefault || makeDefault)) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            if (makeDefault && row.archivedAt && archived !== false) {
                throw new PayrollConflictError('Restore this option before making it the default.')
            }
            if (fields.label.toLowerCase() !== row.label.toLowerCase()) {
                const others = await tx.payrollOption.findMany({ where: { category, NOT: { id } }, select: { label: true } })
                assertUniqueText(others.map((other) => ({ text: other.label })), fields.label, 'An option named')
            }
            if (makeDefault) {
                await tx.payrollOption.updateMany({ where: { category, isDefault: true, NOT: { id } }, data: { isDefault: false } })
            }
            const updated = await tx.payrollOption.update({
                where: { id },
                data: {
                    label: fields.label,
                    sortOrder: fields.sortOrder,
                    ...(makeDefault ? { isDefault: true } : {}),
                    ...archiveData(archived, row.archivedAt),
                },
            })
            const usage = await this.optionUsage(tx, category)
            return toOptionView(updated, usage)
        })
    }

    async deleteOption(category: PayrollOptionCategory, id: string): Promise<void> {
        await this.inTransaction(async (tx) => {
            const row = await tx.payrollOption.findFirst({ where: { id, category } })
            if (!row) throw new PayrollNotFoundError(OPTION_NOT_FOUND)
            if (row.isDefault) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            const inUse = PROFILE_FIELDS[category] === 'employmentType'
                ? await tx.employeeProfile.count({ where: { employmentType: row.value } })
                : await tx.employeeProfile.count({ where: { paymentFrequency: row.value } })
            if (inUse > 0) {
                throw new PayrollConflictError(
                    `"${row.label}" is used by ${plural(inUse, 'employee')}, so it cannot be deleted. Archive it instead; archived options stay on the profiles that have them.`,
                )
            }
            await tx.payrollOption.delete({ where: { id } })
        })
    }

    // ------------------------------------------------------------------ pay and profiles

    /**
     * The scheme a profile key stands for, archived rows included. An unknown
     * key resolves to the default row and is logged once per key. When the
     * table cannot be read the built-in copy is used (same keys and math).
     */
    async resolveScheme(key: string | null | undefined): Promise<PayrollSchemeDefinition> {
        const wanted = typeof key === 'string' ? key.trim() : ''
        try {
            const rows = await this.db.payrollScheme.findMany({
                where: { OR: [...(wanted ? [{ key: wanted }] : []), { isDefault: true }] },
                orderBy: LIST_ORDER,
            })
            if (rows.length > 0) {
                const { scheme, known } = resolvePayrollScheme(wanted, rows.map(toDefinition))
                if (!known && wanted) {
                    logOnce(`scheme:${wanted}`, 'Unknown payroll scheme key; using the default scheme', { key: wanted, fallback: scheme.key })
                }
                return scheme
            }
            logOnce('scheme:empty', 'No payroll scheme rows found; using the built-in list', {})
        } catch (error) {
            logOnce('scheme:unreadable', 'Payroll schemes could not be read; using the built-in list', { error: errorMessage(error) })
        }
        return resolvePayrollScheme(wanted).scheme
    }

    /** Scheme key and option values a new profile starts with. Empty when the lists cannot be read. */
    async newProfileDefaults(): Promise<NewProfileDefaults> {
        try {
            const [scheme, options] = await Promise.all([
                this.db.payrollScheme.findFirst({ where: { isDefault: true, archivedAt: null }, orderBy: LIST_ORDER, select: { key: true } }),
                this.db.payrollOption.findMany({
                    where: { isDefault: true, archivedAt: null },
                    orderBy: LIST_ORDER,
                    select: { category: true, value: true },
                }),
            ])
            const optionValue = (category: PayrollOptionCategory) => options.find((option) => option.category === category)?.value
            const employmentType = optionValue('employment_type')
            const paymentFrequency = optionValue('payment_frequency')
            return {
                ...(scheme ? { payrollScheme: scheme.key } : {}),
                ...(employmentType ? { employmentType } : {}),
                ...(paymentFrequency ? { paymentFrequency } : {}),
            }
        } catch (error) {
            logOnce('defaults:unreadable', 'Payroll defaults could not be read; the new profile uses column defaults', { error: errorMessage(error) })
            return {}
        }
    }

    /**
     * A profile may keep whatever it stores; a changed scheme or option must be
     * an active row of its list (400 otherwise).
     */
    async assertProfileSelections(current: ProfileSelections, next: ProfileSelections): Promise<void> {
        if (typeof next.payrollScheme === 'string' && next.payrollScheme !== current.payrollScheme) {
            await this.assertSchemeSelectable(next.payrollScheme)
        }
        for (const category of ['employment_type', 'payment_frequency'] as const) {
            const field = PROFILE_FIELDS[category]
            const value = next[field]
            if (typeof value === 'string' && value !== current[field]) await this.assertOptionSelectable(category, value)
        }
    }

    private async assertSchemeSelectable(key: string): Promise<void> {
        let row: PayrollSchemeRow | null
        try {
            row = await this.db.payrollScheme.findUnique({ where: { key } })
        } catch (error) {
            logOnce('scheme:unreadable', 'Payroll schemes could not be read; using the built-in list', { error: errorMessage(error) })
            if (BUILT_IN_PAYROLL_SCHEMES.some((scheme) => scheme.key === key)) return
            throw new PayrollValidationError(UNKNOWN_SCHEME_MESSAGE)
        }
        if (!row) throw new PayrollValidationError(UNKNOWN_SCHEME_MESSAGE)
        if (row.archivedAt) {
            throw new PayrollValidationError(`"${row.name}" is archived. Restore it in Payroll options or choose another scheme.`)
        }
    }

    private async assertOptionSelectable(category: PayrollOptionCategory, value: string): Promise<void> {
        const noun = CATEGORY_NOUNS[category]
        let row: PayrollOptionRow | null
        try {
            row = await this.db.payrollOption.findUnique({ where: { category_value: { category, value } } })
        } catch (error) {
            // Before the lists existed any text was accepted; keep that if the table cannot be read.
            logOnce('options:unreadable', 'Payroll options could not be read; accepting the value as sent', { error: errorMessage(error) })
            return
        }
        if (!row) throw new PayrollValidationError(`Choose a ${noun} from the list.`)
        if (row.archivedAt) {
            throw new PayrollValidationError(`"${row.label}" is archived. Restore it in Payroll options or choose another ${noun}.`)
        }
    }
}

export const payrollOptionsService = new PayrollOptionsService()
