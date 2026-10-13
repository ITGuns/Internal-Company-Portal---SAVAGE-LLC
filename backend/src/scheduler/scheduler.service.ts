import { prisma } from '../database/prisma.service'
import { PayrollService } from '../payroll/payroll.service'
import { ClientProviderWorkflowsService } from '../clients/client-provider-workflows.service'
import { GemfieldPipelineService } from '../clients/gemfield/gemfield-pipeline.service'
import { createLogger } from '../observability/logger'
import { config } from '../config/env.config'
import { periodEndDayKey, periodStartDayKey } from '../payroll/payroll.calculations'
import {
    computeExpectedPeriodWindow,
    isAutoPayslipDue,
    periodOverlapsWindow,
    selectAutoPayslipPeriod,
} from './scheduler.periods'

const DAY_MS = 24 * 60 * 60 * 1000

const logger = createLogger('scheduler.service')

export type JobType = 'auto-payslip' | 'dept-report' | 'period-advance' | 'client-invoices' | 'gemfield-digest'
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
    private gemfieldPipeline = new GemfieldPipelineService()

    // ─── Run all scheduled jobs ──────────────────────────────────────────────

    async runAll(triggeredBy: TriggerSource = 'cron'): Promise<JobResult[]> {
        const results: JobResult[] = []

        results.push(await this.runPeriodAdvance(triggeredBy))
        results.push(await this.runAutoPayslip(triggeredBy))
        results.push(await this.runDeptReport(triggeredBy))
        results.push(await this.runClientInvoices(triggeredBy))
        results.push(await this.runGemfieldDigest(triggeredBy))

        return results
    }

    async runGemfieldDigest(triggeredBy: TriggerSource = 'cron'): Promise<JobResult> {
        const run = await this.startRun('gemfield-digest', triggeredBy)
        const t0 = Date.now()

        try {
            const result = await this.gemfieldPipeline.runGemfieldDigest()
            const summary = {
                enabled: result.enabled,
                notified: result.notified,
                open: result.digest.openCount,
                devAssist: result.digest.devAssistCount,
                breached: result.digest.breachedCount,
            }
            return await this.finishRun(run.id, result.enabled ? 'success' : 'skipped', Date.now() - t0, summary)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('gemfield-digest job failed', { error: msg })
            return await this.finishRun(run.id, 'failed', Date.now() - t0, {}, msg)
        }
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
            // Determine the expected semi-monthly period window for today.
            const expected = computeExpectedPeriodWindow(new Date(), config.payrollTimezone)
            const { start: expectedStart, end: expectedEnd, payDate } = expected

            // A period already covering any of these calendar days blocks creation.
            // The query is widened by a day because older periods were stored at UTC
            // midnight; the calendar-day comparison makes the final call.
            const nearby = await prisma.payrollPeriod.findMany({
                where: {
                    startDate: { lte: new Date(expectedEnd.getTime() + DAY_MS) },
                    endDate: { gte: new Date(expectedStart.getTime() - DAY_MS) },
                },
            })
            const existing = nearby.find((period) => periodOverlapsWindow(period, expected))

            let summary: Record<string, unknown>
            if (existing) {
                summary = { skipped: true, reason: 'Period already exists', periodId: existing.id }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            const period = await prisma.payrollPeriod.create({
                data: { startDate: expectedStart, endDate: expectedEnd, payDate, status: 'draft' },
            })

            summary = {
                created: true,
                periodId: period.id,
                startDate: periodStartDayKey(period.startDate),
                endDate: periodEndDayKey(period.endDate),
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
            // Target the draft period that most recently ended, not the newest one
            // (the newest is usually still open). Payroll v2, Rule 8.
            const now = new Date()
            const candidates = await prisma.payrollPeriod.findMany({
                where: { status: 'draft', endDate: { lt: now } },
                orderBy: { endDate: 'desc' },
                take: 5,
            })
            const period = selectAutoPayslipPeriod(candidates, now)

            if (!period) {
                const summary = { skipped: true, reason: 'No ended draft period found' }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            // Ended periods generate right away; the pay-date gate only applies to open ones.
            if (!isAutoPayslipDue(period, now)) {
                const summary = {
                    skipped: true,
                    reason: 'Too early: period pay date not yet reached',
                    periodId: period.id,
                    payDate: period.payDate ? periodEndDayKey(period.payDate) : undefined,
                }
                return await this.finishRun(run.id, 'skipped', Date.now() - t0, summary)
            }

            const results = await this.payrollService.bulkGeneratePayslips(period.id)
            const skippedEdited = results.filter((r) => r.skipped).length
            const succeeded = results.filter((r) => r.success && !r.skipped).length
            const failed = results.filter((r) => !r.success).length

            const summary = {
                periodId: period.id,
                startDate: periodStartDayKey(period.startDate),
                endDate: periodEndDayKey(period.endDate),
                total: results.length,
                succeeded,
                skippedEdited,
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

    private runContexts = new Map<string, { jobType: JobType }>()

    async getRecentRuns(limit = 20): Promise<object[]> {
        try {
            return await prisma.schedulerJobRun.findMany({
                orderBy: { startedAt: 'desc' },
                take: limit,
            })
        } catch (err) {
            logger.warn('Failed to fetch recent job runs from database, returning empty list', { error: err })
            return []
        }
    }

    private async startRun(jobType: JobType, triggeredBy: TriggerSource) {
        let runId: string
        let run: any
        try {
            run = await prisma.schedulerJobRun.create({
                data: { jobType, triggeredBy, status: 'running' },
            })
            runId = run.id
        } catch (err) {
            runId = 'mock-run-' + Math.random().toString(36).substring(2, 9)
            logger.warn('Failed to record job start in database, using mock run ID', { error: err, runId })
            run = {
                id: runId,
                jobType,
                triggeredBy,
                status: 'running' as const,
                startedAt: new Date(),
            }
        }
        this.runContexts.set(runId, { jobType })
        return run
    }

    private async finishRun(
        id: string,
        status: JobStatus,
        durationMs: number,
        summary: Record<string, unknown>,
        errorMsg?: string,
    ): Promise<JobResult> {
        const context = this.runContexts.get(id)
        const jobType = context?.jobType || 'auto-payslip'
        this.runContexts.delete(id)

        if (id.startsWith('mock-run-')) {
            return {
                jobRunId: id,
                jobType,
                status,
                durationMs,
                summary,
                errorMsg,
            }
        }

        try {
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
        } catch (err) {
            logger.warn('Failed to update job status in database, returning in-memory status', { error: err, id })
            return {
                jobRunId: id,
                jobType,
                status,
                durationMs,
                summary,
                errorMsg,
            }
        }
    }
}
