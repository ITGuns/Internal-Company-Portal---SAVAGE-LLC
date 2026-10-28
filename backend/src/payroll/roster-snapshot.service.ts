/**
 * Writes and reads the automatic employee history (PayrollRosterSnapshot,
 * 2026-10-28). The payroll services call captureSafely after every payslip
 * write (generate, regenerate, edit, delete, approve, revoke) and when a
 * period is locked; a failed capture is logged and never undoes or blocks the
 * payroll change. A read first adds a row for every payslip that has none yet
 * (lazy backfill), so the periods from before this release get history too.
 * Pure rules: roster-snapshot.ts. Contract: docs/payroll-time-v2-spec.md,
 * "Employee history".
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { createLogger } from '../observability/logger'
import { isInternalEmployeeAccount } from '../employees/employees.security'
import { PayrollNotFoundError } from './payroll.errors'
import { periodEndDayKey, periodStartDayKey } from './payroll.calculations'
import { PayrollOptionsService, payrollOptionsService } from './payroll-options.service'
import { PayrollTaxRulesService, payrollTaxRulesService } from './payroll-tax-rules.service'
import {
    buildRosterFields,
    makeRosterLabels,
    PAYROLL_ACTIVE_STATUSES,
    RosterLabels,
    RosterRowView,
    RosterSummary,
    summarizeRoster,
    toRosterRowView,
} from './roster-snapshot'

const logger = createLogger('payroll.roster')

const PERIOD_NOT_FOUND_MESSAGE = 'Payroll period not found'
const EMPLOYEE_NOT_FOUND_MESSAGE = 'Employee not found'

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    status: true,
    roles: { select: { role: true, department: { select: { name: true } } } },
    clientMemberships: { select: { status: true } },
    employeeProfile: {
        select: { jobTitle: true, employmentType: true, payrollScheme: true, payBasis: true, baseSalary: true, taxRule: true },
    },
} satisfies Prisma.UserSelect

const PAYSLIP_SELECT = {
    id: true,
    periodId: true,
    userId: true,
    grossPay: true,
    netPay: true,
    approvalStatus: true,
    items: { select: { type: true, description: true, amount: true } },
} satisfies Prisma.PayslipSelect

type PayslipRecord = Prisma.PayslipGetPayload<{ select: typeof PAYSLIP_SELECT }>

export interface PeriodRosterReport {
    period: { id: string; startDay: string; endDay: string; payDay: string | null; status: string }
    rows: RosterRowView[]
    summary: RosterSummary
}

export interface EmployeeHistoryReport {
    employee: { id: string; name: string; email: string }
    rows: RosterRowView[]
    summary: RosterSummary
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

function pairKey(row: { periodId: string; userId: string }): string {
    return `${row.periodId}:${row.userId}`
}

/** One payslip per person and period, the newest generated (payslips come newest first). */
function firstPerPair<T extends { periodId: string; userId: string }>(payslips: readonly T[], skip: ReadonlySet<string>): T[] {
    const kept = new Map<string, T>()
    for (const payslip of payslips) {
        const key = pairKey(payslip)
        if (!skip.has(key) && !kept.has(key)) kept.set(key, payslip)
    }
    return [...kept.values()]
}

function byName(left: RosterRowView, right: RosterRowView): number {
    return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
}

export class RosterSnapshotService {
    constructor(
        private readonly db: PrismaClient = prisma,
        private readonly options: Pick<PayrollOptionsService, 'listSchemes'> = payrollOptionsService,
        private readonly taxRules: Pick<PayrollTaxRulesService, 'listRules'> = payrollTaxRulesService,
    ) { }

    /** Scheme names and tax rule labels; a list that cannot be read is left out (see makeRosterLabels). */
    private async labels(): Promise<RosterLabels> {
        const [schemes, rules] = await Promise.all([
            this.options.listSchemes().catch(() => null),
            this.taxRules.listRules().catch(() => null),
        ])
        return makeRosterLabels(schemes, rules)
    }

    /** The period's roster: every active internal employee plus everyone with a payslip in it. */
    private async rosterUserIds(periodId: string): Promise<string[]> {
        const [active, holders] = await Promise.all([
            this.db.user.findMany({
                where: { status: { in: [...PAYROLL_ACTIVE_STATUSES] } },
                select: { id: true, roles: { select: { role: true } }, clientMemberships: { select: { status: true } } },
            }),
            this.db.payslip.findMany({ where: { periodId }, select: { userId: true } }),
        ])
        const internal = active.filter(isInternalEmployeeAccount).map((user) => user.id)
        return [...new Set([...internal, ...holders.map((payslip) => payslip.userId)])]
    }

    /**
     * Writes (upserts) the rows of `userIds` for the period, or of its whole
     * roster when userIds is omitted, from each person's current user record,
     * profile and payslip. People without a payslip get null pay fields.
     * Returns the number of rows written.
     */
    async capture(periodId: string, userIds?: readonly string[]): Promise<number> {
        const period = await this.db.payrollPeriod.findUnique({ where: { id: periodId }, select: { status: true } })
        if (!period) throw new PayrollNotFoundError(PERIOD_NOT_FOUND_MESSAGE)
        const ids = userIds ? [...new Set(userIds)] : await this.rosterUserIds(periodId)
        if (ids.length === 0) return 0
        const [users, payslips, labels] = await Promise.all([
            this.db.user.findMany({ where: { id: { in: ids } }, select: USER_SELECT }),
            this.db.payslip.findMany({ where: { periodId, userId: { in: ids } }, select: PAYSLIP_SELECT, orderBy: { generatedAt: 'desc' } }),
            this.labels(),
        ])
        const payslipByUser = new Map<string, PayslipRecord>(firstPerPair(payslips, new Set()).map((payslip) => [payslip.userId, payslip]))
        const capturedAt = new Date()
        const writes = users.map((user) => {
            const fields = buildRosterFields({ user, payslip: payslipByUser.get(user.id) ?? null, periodStatus: period.status, labels })
            return this.db.payrollRosterSnapshot.upsert({
                where: { periodId_userId: { periodId, userId: user.id } },
                create: { periodId, userId: user.id, capturedAt, ...fields },
                update: { capturedAt, ...fields },
            })
        })
        await this.db.$transaction(writes)
        return writes.length
    }

    /** capture() for the payroll write paths: never throws, logs and answers 0 instead. */
    async captureSafely(periodId: string, userIds?: readonly string[]): Promise<number> {
        try {
            return await this.capture(periodId, userIds)
        } catch (error) {
            logger.error('Employee history capture failed; the payroll change itself was saved', {
                periodId,
                userCount: userIds?.length ?? 'roster',
                error: errorMessage(error),
            })
            return 0
        }
    }

    /**
     * After a payroll profile save (2026-10-28): rewrites this person's rows in
     * the periods that are still open (draft) and already have a row for them,
     * so an open period's history shows the new category or salary at once.
     * Every write is conditional on the period still being draft, so a locked
     * period's row is never touched, and no row is ever created here.
     * Returns the number of rows refreshed.
     */
    async refreshOpenPeriods(userId: string): Promise<number> {
        const open = await this.db.payrollRosterSnapshot.findMany({
            where: { userId, period: { status: 'draft' } },
            select: { periodId: true },
        })
        if (open.length === 0) return 0
        const periodIds = open.map((row) => row.periodId)
        const [user, payslips, labels] = await Promise.all([
            this.db.user.findUnique({ where: { id: userId }, select: USER_SELECT }),
            this.db.payslip.findMany({ where: { userId, periodId: { in: periodIds } }, select: PAYSLIP_SELECT, orderBy: { generatedAt: 'desc' } }),
            this.labels(),
        ])
        if (!user) return 0
        const payslipByPeriod = new Map<string, PayslipRecord>(firstPerPair(payslips, new Set()).map((payslip) => [payslip.periodId, payslip]))
        const capturedAt = new Date()
        const writes = periodIds.map((periodId) => this.db.payrollRosterSnapshot.updateMany({
            where: { periodId, userId, period: { status: 'draft' } },
            data: {
                capturedAt,
                ...buildRosterFields({ user, payslip: payslipByPeriod.get(periodId) ?? null, periodStatus: 'draft', labels }),
            },
        }))
        const results = await this.db.$transaction(writes)
        return results.reduce((total, result) => total + result.count, 0)
    }

    /** refreshOpenPeriods() for the profile save: never throws, logs and answers 0 instead. */
    async refreshOpenPeriodsSafely(userId: string): Promise<number> {
        try {
            return await this.refreshOpenPeriods(userId)
        } catch (error) {
            logger.error('Employee history refresh after a profile save failed; the profile was saved', { error: errorMessage(error) })
            return 0
        }
    }

    /**
     * Lazy backfill: adds a row for every payslip matching `where` that has
     * none yet, from the payslip and the person's current profile. Existing
     * rows are never touched. Returns the number of rows added.
     */
    async backfillMissing(where: { periodId: string } | { userId: string }): Promise<number> {
        const [payslips, existing] = await Promise.all([
            this.db.payslip.findMany({
                where,
                select: { ...PAYSLIP_SELECT, period: { select: { status: true } }, user: { select: USER_SELECT } },
                orderBy: { generatedAt: 'desc' },
            }),
            this.db.payrollRosterSnapshot.findMany({ where, select: { periodId: true, userId: true } }),
        ])
        const missing = firstPerPair(payslips, new Set(existing.map(pairKey)))
        if (missing.length === 0) return 0
        const labels = await this.labels()
        const created = await this.db.payrollRosterSnapshot.createMany({
            data: missing.map((payslip) => ({
                periodId: payslip.periodId,
                userId: payslip.userId,
                ...buildRosterFields({ user: payslip.user, payslip, periodStatus: payslip.period.status, labels }),
            })),
            skipDuplicates: true,
        })
        return created.count
    }

    /** A read still answers with the stored rows when the backfill fails. */
    private async backfillSafely(where: { periodId: string } | { userId: string }): Promise<void> {
        try {
            await this.backfillMissing(where)
        } catch (error) {
            logger.error('Employee history backfill failed; answering with the stored rows', { error: errorMessage(error) })
        }
    }

    /** Everyone on the period's roster, by name, with headcount and totals. 404 for an unknown period. */
    async periodRoster(periodId: string): Promise<PeriodRosterReport> {
        const period = await this.db.payrollPeriod.findUnique({
            where: { id: periodId },
            select: { id: true, startDate: true, endDate: true, payDate: true, status: true },
        })
        if (!period) throw new PayrollNotFoundError(PERIOD_NOT_FOUND_MESSAGE)
        await this.backfillSafely({ periodId })
        const stored = await this.db.payrollRosterSnapshot.findMany({ where: { periodId } })
        const rows = stored.map((row) => toRosterRowView(row, period)).sort(byName)
        return {
            period: {
                id: period.id,
                startDay: periodStartDayKey(period.startDate),
                endDay: periodEndDayKey(period.endDate),
                payDay: period.payDate ? periodEndDayKey(period.payDate) : null,
                status: period.status,
            },
            rows,
            summary: summarizeRoster(rows),
        }
    }

    /** One person across every period they were on, newest period first. 404 for an unknown user. */
    async employeeHistory(userId: string): Promise<EmployeeHistoryReport> {
        const user = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } })
        if (!user) throw new PayrollNotFoundError(EMPLOYEE_NOT_FOUND_MESSAGE)
        await this.backfillSafely({ userId })
        const stored = await this.db.payrollRosterSnapshot.findMany({
            where: { userId },
            include: { period: { select: { startDate: true, endDate: true, status: true } } },
            orderBy: { period: { startDate: 'desc' } },
        })
        const rows = stored.map(({ period, ...row }) => toRosterRowView(row, period))
        return {
            employee: { id: user.id, name: user.name?.trim() || user.email, email: user.email },
            rows,
            summary: summarizeRoster(rows),
        }
    }
}

export const rosterSnapshotService = new RosterSnapshotService()
