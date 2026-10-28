/**
 * Withholding tax rules (2026-10-28), managed like the salary divisor schemes
 * in payroll-options.service.ts: list, add, edit, archive while in use,
 * delete when unused. At most one default, and unlike schemes a workspace may
 * have none: profiles that follow the default then pay no tax. Profiles store
 * a rule key, never an id, so renaming never touches them, and an archived
 * rule keeps applying to the profiles on it.
 * Contract: docs/payroll-time-v2-spec.md, "Withholding tax".
 */

import type { PayrollTaxRule as PayrollTaxRuleRow, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'
import { PayrollConflictError, PayrollNotFoundError, PayrollValidationError } from './payroll.errors'
import { parseArchivedFlag } from './payroll-options.validation'
import { archiveData, assertUniqueText, nextSortOrder, plural } from './payroll-options.views'
import {
    NO_TAX,
    parseTaxDefaultFlag,
    parseTaxRuleFields,
    resolveTaxRule,
    TaxRuleDefinition,
    taxRuleKeyFor,
    UNKNOWN_TAX_RULE_MESSAGE,
} from './payroll-tax'

const logger = createLogger('payroll.tax-rules')

const LIST_ORDER = [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }]
const NOT_FOUND_MESSAGE = 'That tax rule no longer exists. Reload the list.'
const DEFAULT_LOCKED_MESSAGE = 'This is the default tax rule. Remove it as the default first.'
const CONCURRENT_CHANGE_MESSAGE = 'Someone else changed this list at the same moment. Reload and try again.'
const DUPLICATE_MESSAGE = 'That name is already in the list.'

export interface PayrollTaxRuleView {
    id: string
    key: string
    name: string
    rate: number
    isDefault: boolean
    sortOrder: number
    archived: boolean
    archivedAt: string | null
    /** Profiles storing this key. Sent to payroll roles only. */
    inUseCount?: number
}

type Db = Prisma.TransactionClient

const loggedOnce = new Set<string>()

function errorCode(error: unknown): unknown {
    return typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
}

function toView(row: PayrollTaxRuleRow, usage?: ReadonlyMap<string, number>): PayrollTaxRuleView {
    return {
        id: row.id,
        key: row.key,
        name: row.name,
        rate: row.rate,
        isDefault: row.isDefault,
        sortOrder: row.sortOrder,
        archived: row.archivedAt !== null,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        ...(usage ? { inUseCount: usage.get(row.key) ?? 0 } : {}),
    }
}

function toDefinition(row: PayrollTaxRuleRow): TaxRuleDefinition {
    return { key: row.key, name: row.name, rate: row.rate, isDefault: row.isDefault }
}

export class PayrollTaxRulesService {
    constructor(private readonly db: PrismaClient = prisma) { }

    /** Serializable so two default switches cannot leave two defaults; a lost race answers 409. */
    private async inTransaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
        try {
            return await this.db.$transaction(fn, { isolationLevel: 'Serializable' })
        } catch (error) {
            if (errorCode(error) === 'P2034') throw new PayrollConflictError(CONCURRENT_CHANGE_MESSAGE)
            if (errorCode(error) === 'P2002') throw new PayrollConflictError(DUPLICATE_MESSAGE)
            throw error
        }
    }

    private async usage(db: Db): Promise<Map<string, number>> {
        const groups = await db.employeeProfile.groupBy({
            by: ['taxRule'],
            where: { taxRule: { not: null } },
            _count: { _all: true },
        })
        return new Map(groups.map((group) => [group.taxRule ?? '', group._count._all]))
    }

    async listRules(options: { includeUsage?: boolean } = {}): Promise<PayrollTaxRuleView[]> {
        const rows = await this.db.payrollTaxRule.findMany({ orderBy: LIST_ORDER })
        const usage = options.includeUsage ? await this.usage(this.db) : undefined
        return rows.map((row) => toView(row, usage))
    }

    async createRule(input: Record<string, unknown>): Promise<PayrollTaxRuleView> {
        return this.inTransaction(async (tx) => {
            const existing = await tx.payrollTaxRule.findMany({ select: { key: true, name: true, sortOrder: true } })
            const fields = parseTaxRuleFields(input, undefined, nextSortOrder(existing))
            const makeDefault = parseTaxDefaultFlag(input.isDefault) === true
            assertUniqueText(existing.map((row) => ({ text: row.name })), fields.name, 'A tax rule named')
            const key = taxRuleKeyFor(fields.name, new Set(existing.map((row) => row.key)))
            if (makeDefault) await tx.payrollTaxRule.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
            const row = await tx.payrollTaxRule.create({ data: { key, ...fields, isDefault: makeDefault } })
            return toView(row, new Map([[key, 0]]))
        })
    }

    async updateRule(id: string, input: Record<string, unknown>): Promise<PayrollTaxRuleView> {
        return this.inTransaction(async (tx) => {
            const row = await tx.payrollTaxRule.findUnique({ where: { id } })
            if (!row) throw new PayrollNotFoundError(NOT_FOUND_MESSAGE)
            const fields = parseTaxRuleFields(input, { name: row.name, rate: row.rate, sortOrder: row.sortOrder })
            const defaultFlag = parseTaxDefaultFlag(input.isDefault)
            const makeDefault = defaultFlag === true && !row.isDefault
            const clearDefault = defaultFlag === false && row.isDefault
            const staysDefault = (row.isDefault && !clearDefault) || makeDefault
            const archived = parseArchivedFlag(input.archived)
            if (archived === true && staysDefault) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            if (makeDefault && row.archivedAt && archived !== false) {
                throw new PayrollConflictError('Restore this tax rule before making it the default.')
            }
            if (fields.name.toLowerCase() !== row.name.toLowerCase()) {
                const others = await tx.payrollTaxRule.findMany({ where: { NOT: { id } }, select: { name: true } })
                assertUniqueText(others.map((other) => ({ text: other.name })), fields.name, 'A tax rule named')
            }
            if (makeDefault) {
                await tx.payrollTaxRule.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } })
            }
            const updated = await tx.payrollTaxRule.update({
                where: { id },
                data: {
                    ...fields,
                    ...(makeDefault ? { isDefault: true } : clearDefault ? { isDefault: false } : {}),
                    ...archiveData(archived, row.archivedAt),
                },
            })
            const inUse = await tx.employeeProfile.count({ where: { taxRule: row.key } })
            return toView(updated, new Map([[row.key, inUse]]))
        })
    }

    async deleteRule(id: string): Promise<void> {
        await this.inTransaction(async (tx) => {
            const row = await tx.payrollTaxRule.findUnique({ where: { id } })
            if (!row) throw new PayrollNotFoundError(NOT_FOUND_MESSAGE)
            if (row.isDefault) throw new PayrollConflictError(DEFAULT_LOCKED_MESSAGE)
            const inUse = await tx.employeeProfile.count({ where: { taxRule: row.key } })
            if (inUse > 0) {
                throw new PayrollConflictError(
                    `"${row.name}" is used by ${plural(inUse, 'employee')}, so it cannot be deleted. Archive it instead; archived rules keep applying to the people on them.`,
                )
            }
            await tx.payrollTaxRule.delete({ where: { id } })
        })
    }

    /**
     * The rule a profile's taxRule stands for (archived rules included), or
     * null for no tax. One query: the stored key and the default row. A key
     * that matches no row falls back to the default and is logged once.
     */
    async resolveForProfile(taxRule: string | null | undefined): Promise<TaxRuleDefinition | null> {
        const wanted = typeof taxRule === 'string' ? taxRule.trim() : ''
        if (wanted === NO_TAX) return null
        const rows = await this.db.payrollTaxRule.findMany({
            where: { OR: [...(wanted ? [{ key: wanted }] : []), { isDefault: true }] },
            orderBy: LIST_ORDER,
        })
        const { rule, known } = resolveTaxRule(wanted, rows.map(toDefinition))
        if (!known && !loggedOnce.has(wanted)) {
            loggedOnce.add(wanted)
            logger.warn('Unknown tax rule key on a profile; using the default rule', { key: wanted, fallback: rule?.key ?? null })
        }
        return rule
    }

    /**
     * A profile may keep whatever it stores; a changed value must be null (the
     * default), 'none', or the key of an active rule (400 otherwise).
     */
    async assertProfileTaxRule(current: string | null | undefined, next: string | null | undefined): Promise<void> {
        if (next === undefined || next === null || next === NO_TAX || next === current) return
        const row = await this.db.payrollTaxRule.findUnique({ where: { key: next } })
        if (!row) throw new PayrollValidationError(UNKNOWN_TAX_RULE_MESSAGE)
        if (row.archivedAt) {
            throw new PayrollValidationError(`"${row.name}" is archived. Restore it in Payroll options or choose another tax rule.`)
        }
    }
}

export const payrollTaxRulesService = new PayrollTaxRulesService()
