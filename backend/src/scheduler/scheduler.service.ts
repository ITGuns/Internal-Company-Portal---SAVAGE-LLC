import { prisma } from '../database/prisma.service'
import { PayrollService } from '../payroll/payroll.service'
import { ClientProviderWorkflowsService } from '../clients/client-provider-workflows.service'
import { createLogger } from '../observability/logger'

const logger = createLogger('scheduler.service')

export type JobType = 'auto-payslip' | 'dept-report' | 'period-advance' | 'client-invoices'
export type JobStatus = 'running' | 'success' | 'failed' | 'skipped'
export type TriggerSource = 'cron' | 'manual'

export interface JobResult {
    jobRunId: string
    jobType: JobType
    status: JobStatus
    durationMs: number
    summary: Record<string, unknown>
    errorMsg?: string
}

export class SchedulerService {
    private payrollService = new PayrollService()
    private clientProviderWorkflows = new ClientProviderWorkflowsService(prisma)

    // ─── Run all scheduled jobs ──────────────────────────────────────────────

    async runAll(triggeredBy: TriggerSource = 'cron'): Promise<JobResult[]> {
        const results: JobResult[] = []

        results.push(await this.runPeriodAdvance(triggeredBy))
        results.push(await this.runAutoPayslip(triggeredBy))
        results.push(await this.runDeptReport(triggeredBy))
        results.push(await this.runClientInvoices(triggeredBy))

        return results
    }

    async runClientInvoices(triggeredBy: TriggerSource = 'cron'): Promise<JobResult> {
        const run = await this.startRun('client-invoices', triggeredBy)
        const t0 = Date.now()

        try {
            const result = await this.clientProviderWorkflows.generateDueInvoices()
            const summary = {
                scanned: result.scanned,
                created: result.created.length,
                createdInvoiceIds: result.created,
                skipped: result.skipped,
            }
            return await this.finishRun(
                run.id,
                result.created.length > 0 ? 'success' : 'skipped',
                Date.now() - t0,
                summary,
            )
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('client-invoices job failed', { error: msg })
            return await this.finishRun(run.id, 'failed', Date.now() - t0, {}, msg)
        }
    }

    // ─── Period Advance ──────────────────────────────────────────────────────
    // Auto-creates a new semi-monthly PayrollPeriod when none exists for the
    // current half of the month. Safe to call repeatedly — idempotent.

    async runPeriodAdvance(triggeredBy: TriggerSource = 'cron'): Promise<JobResult> {
        const run = await this.startRun('period-advance', triggeredBy)
        const t0 = Date.now()

        try {
            const now = new Date()
            const year = now.getFullYear()
            const month = now.getMonth()
            const day = now.getDate()

            // Determine the expected period window for today
            let expectedStart: Date
            let expectedEnd: Date
            if (day <= 15) {
                expectedStart = new Date(year, month, 1)
                expectedEnd = new Date(year, month, 15, 23, 59, 59)
            } else {
                expectedStart = new Date(year, month, 16)
                expectedEnd = new Date(year, month + 1, 0, 23, 59, 59)
            }

            // Check whether a period already covering this window exists
            const existing = await prisma.payrollPeriod.findFirst({
                where: {
                    startDate: { lte: expectedEnd },
                    endDate: { gte: expectedStart },
                },
            })

            let summary: Record<string, unknown>
            if (existing) {
                summary = { skipped: true, reason: 'Period already exists', periodId: existing.id }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            const payDate = new Date(expectedEnd)
            payDate.setDate(payDate.getDate() + 5)
            const period = await prisma.payrollPeriod.create({
                data: { startDate: expectedStart, endDate: expectedEnd, payDate, status: 'draft' },
            })

            summary = {
                created: true,
                periodId: period.id,
                startDate: period.startDate.toISOString().slice(0, 10),
                endDate: period.endDate.toISOString().slice(0, 10),
            }
            return await this.finishRun(run.id, 'success', Date.now() - t0, summary)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('period-advance job failed', { error: msg })
            return await this.finishRun(run.id, 'failed', Date.now() - t0, {}, msg)
        }
    }

    // ─── Auto Payslip Generation ──────────────────────────────────────────────
    // Runs bulk payslip generation for the most recent draft payroll period.

    async runAutoPayslip(triggeredBy: TriggerSource = 'cron'): Promise<JobResult> {
        const run = await this.startRun('auto-payslip', triggeredBy)
        const t0 = Date.now()

        try {
            // Find the most recent draft period
            const period = await prisma.payrollPeriod.findFirst({
                where: { status: 'draft' },
                orderBy: { startDate: 'desc' },
            })

            if (!period) {
                const summary = { skipped: true, reason: 'No draft period found' }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            // Only generate on or after pay date (or within 2 days before it)
            const now = new Date()
            const generateFrom = period.payDate
                ? new Date(period.payDate.getTime() - 2 * 24 * 60 * 60 * 1000)
                : period.endDate

            if (now < generateFrom) {
                const summary = {
                    skipped: true,
                    reason: 'Too early — period pay date not yet reached',
                    periodId: period.id,
                    payDate: period.payDate?.toISOString().slice(0, 10),
                }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            const results = await this.payrollService.bulkGeneratePayslips(period.id)
            const succeeded = results.filter((r) => r.success).length
            const failed = results.filter((r) => !r.success).length

            const summary = {
                periodId: period.id,
                startDate: period.startDate.toISOString().slice(0, 10),
                endDate: period.endDate.toISOString().slice(0, 10),
                total: results.length,
                succeeded,
                failed,
                failures: results.filter((r) => !r.success).map((r) => ({
                    userId: r.userId,
                    error: r.error,
                })),
            }

            return await this.finishRun(run.id, failed === results.length && results.length > 0 ? 'failed' : 'success', Date.now() - t0, summary)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('auto-payslip job failed', { error: msg })
            return await this.finishRun(run.id, 'failed', Date.now() - t0, {}, msg)
        }
    }

    // ─── Department Report ────────────────────────────────────────────────────
    // Aggregates department cost summary for the most recent completed period
    // and stores the JSON result in the job run record.

    async runDeptReport(triggeredBy: TriggerSource = 'cron'): Promise<JobResult> {
        const run = await this.startRun('dept-report', triggeredBy)
        const t0 = Date.now()

        try {
            const stats = await this.payrollService.getReportStats({})

            if (!stats || stats.length === 0) {
                const summary = { skipped: true, reason: 'No payroll periods with payslips found' }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            const latestPeriod = stats[0]
            const summary = {
                periodId: latestPeriod.periodId,
                label: latestPeriod.label,
                totalGross: latestPeriod.gross,
                totalNet: latestPeriod.net,
                totalDeductions: latestPeriod.deductions,
                payslipCount: latestPeriod.count,
                departmentSummary: latestPeriod.departmentSummary,
            }

            return await this.finishRun(run.id, 'success', Date.now() - t0, summary)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('dept-report job failed', { error: msg })
            return await this.finishRun(run.id, 'failed', Date.now() - t0, {}, msg)
        }
    }

    // ─── Job Run Lifecycle ────────────────────────────────────────────────────

    async getRecentRuns(limit = 20): Promise<object[]> {
        return prisma.schedulerJobRun.findMany({
            orderBy: { startedAt: 'desc' },
            take: limit,
        })
    }

    private async startRun(jobType: JobType, triggeredBy: TriggerSource) {
        return prisma.schedulerJobRun.create({
            data: { jobType, triggeredBy, status: 'running' },
        })
    }

    private async finishRun(
        id: string,
        status: JobStatus,
        durationMs: number,
        summary: Record<string, unknown>,
        errorMsg?: string,
    ): Promise<JobResult> {
        const run = await prisma.schedulerJobRun.update({
            where: { id },
            data: {
                status,
                finishedAt: new Date(),
                durationMs,
                resultJson: JSON.stringify(summary),
                errorMsg: errorMsg ?? null,
            },
        })

        return {
            jobRunId: run.id,
            jobType: run.jobType as JobType,
            status: run.status as JobStatus,
            durationMs,
            summary,
            errorMsg,
        }
    }
}
