import { PrismaClient, TimeEntry, PayrollEvent, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'
import { createLogger } from '../observability/logger'
import { isInternalEmployeeAccount } from '../employees/employees.security'
import { config } from '../config/env.config'
import {
    PayrollConflictError,
    PayrollForbiddenError,
    PayrollNotFoundError,
    PayrollValidationError,
} from './payroll.errors'
import {
    DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
    DEFAULT_OVERTIME_MULTIPLIER,
    HOURLY_RATE_REQUIRED_MESSAGE,
    PAY_BASIS_LABELS,
    bucketEntryHoursByDay,
    computeGrossPay,
    getPayrollRateContext,
    getWeekdaysInMonth,
    isPayBasis,
    normalizePayBasis,
    normalizePayrollScheme,
    normalizePositiveNumber,
    payrollDayKey,
    PeriodBounds,
    payrollPeriodWindow,
    periodEndDayKey,
    periodFraction,
    periodStartDayKey,
    roundMoney,
    semiMonthlyPeriodForDay,
    summarizePayrollHours,
} from './payroll.calculations'
import { computePayslipTotals } from './payslip-edit.service'

const logger = createLogger('payroll.service')

export interface CreatePayrollEventDto {
    title: string
    date: string
    type: string
    description?: string
    createdBy?: string
    isBuiltIn?: boolean
}

export interface UpdatePayrollEventDto {
    title?: string
    date?: string
    type?: string
    description?: string
}

export interface UpdateTimeEntryDto {
    userId?: string
    start?: Date
    end?: Date | null
    notes?: string | null
}

export interface GeneratePayslipOptions {
    /** Regenerate even when the payslip was edited by hand; the edit record is cleared. */
    force?: boolean
}

// The client confirms a regenerate by resending with force: true.
export const EDITED_PAYSLIP_MESSAGE = 'This payslip was edited by hand. Regenerating replaces those edits.'

export interface ManualPayslipInput {
    hoursWorked?: number
    grossPay?: number
    netPay?: number
    deductions?: Array<{ name: string, amount: number, type: string }>
}

type PayslipLine = { type: string; description: string; amount: number }

/** Statuses whose members are always included in bulk generation. */
const PAYROLL_ACTIVE_STATUSES = ['active', 'verified', 'vacation', 'leave']

export interface PayrollReportFilters {
    userId?: string
    department?: string
    status?: string
}

interface TimeEntryAccessOptions {
    requesterId: string
    canManageAny?: boolean
}

type PayslipReportRecord = Prisma.PayslipGetPayload<{
    include: {
        period: true
        items: true
        user: {
            select: {
                id: true
                name: true
                email: true
                employeeProfile: {
                    select: {
                        jobTitle: true
                    }
                }
                roles: {
                    select: {
                        role: true
                        department: {
                            select: {
                                id: true
                                name: true
                            }
                        }
                    }
                }
            }
        }
    }
}>

export { PayrollConflictError, PayrollForbiddenError, PayrollNotFoundError, PayrollValidationError }

function roundHours(value: number): number {
    return Math.round(value * 100) / 100
}

export class PayrollService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    // PayrollEvent methods
    async getEvents(type?: string, startDate?: Date, endDate?: Date) {
        const where: Prisma.PayrollEventWhereInput = {}

        if (type) {
            where.type = type
        }

        if (startDate || endDate) {
            where.date = {}
            if (startDate) where.date.gte = startDate
            if (endDate) where.date.lte = endDate
        }

        return this.prisma.payrollEvent.findMany({
            where,
            orderBy: { date: 'asc' }
        })
    }

    async createEvent(data: CreatePayrollEventDto) {
        return this.prisma.payrollEvent.create({
            data: {
                title: data.title,
                date: new Date(data.date),
                type: data.type,
                description: data.description,
                createdBy: data.createdBy,
                isBuiltIn: data.isBuiltIn || false
            }
        })
    }

    async updateEvent(id: string, data: UpdatePayrollEventDto) {
        return this.prisma.payrollEvent.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.date && { date: new Date(data.date) }),
                ...(data.type && { type: data.type }),
                ...(data.description !== undefined && { description: data.description })
            }
        })
    }

    async deleteEvent(id: string) {
        return this.prisma.payrollEvent.delete({
            where: { id }
        })
    }

    // TimeEntry methods
    async getTimeEntries(userId: string, start?: Date, end?: Date) {
        return this.prisma.timeEntry.findMany({
            where: {
                userId,
                start: {
                    gte: start,
                    lte: end
                }
            },
            orderBy: { start: 'desc' }
        })
    }

    async getActiveTimeEntry(userId: string) {
        return this.prisma.timeEntry.findFirst({
            where: { userId, end: null },
            orderBy: { start: 'desc' },
        })
    }

    async clockIn(userId: string) {
        // Check if already clocked in
        const openEntry = await this.getActiveTimeEntry(userId)
        if (openEntry) throw new Error('Already clocked in')

        return this.prisma.timeEntry.create({
            data: {
                userId,
                start: new Date()
            }
        })
    }

    async clockOut(userId: string) {
        const openEntry = await this.getActiveTimeEntry(userId)
        if (!openEntry) throw new Error('Not clocked in')

        const end = new Date()
        const duration = Math.round((end.getTime() - openEntry.start.getTime()) / 60000)

        return this.prisma.timeEntry.update({
            where: { id: openEntry.id },
            data: {
                end,
                duration
            }
        })
    }

    private calculateDuration(start: Date, end: Date | null): number | null {
        if (!end) return null

        return Math.round((end.getTime() - start.getTime()) / 60000)
    }

    private validateTimeRange(start: Date, end: Date | null) {
        if (Number.isNaN(start.getTime())) {
            throw new Error('Invalid start time')
        }
        if (end && Number.isNaN(end.getTime())) {
            throw new Error('Invalid end time')
        }
        if (end && end <= start) {
            throw new Error('End time must be after start time')
        }
    }

    // Thin wrappers kept for tests/payroll.calculations.test.ts; logic lives in payroll.calculations.ts.
    private normalizePositiveNumber(value: unknown, fallback: number): number {
        return normalizePositiveNumber(value, fallback)
    }

    private normalizePayrollScheme(value: unknown) {
        return normalizePayrollScheme(value)
    }

    private getPayrollRateContext(profile: {
        baseSalary?: number | null
        payrollScheme?: string | null
        maxBillableHoursPerDay?: number | null
    }, startDate: Date, endDate: Date) {
        return getPayrollRateContext(profile, startDate, endDate)
    }

    private summarizeDailyHours(
        dailyHours: Map<string, number>,
        maxBillableHoursPerDay: number,
    ) {
        const summary = summarizePayrollHours(dailyHours, maxBillableHoursPerDay)
        return {
            totalHours: summary.totalHours,
            billableHours: summary.billableHours,
            pendingOvertimeHours: summary.overtimeHours,
        }
    }

    private getPayrollIdentity(user?: PayslipReportRecord['user'] | null) {
        const primaryRole = user?.roles?.find((role) => role.department?.name) || user?.roles?.[0]

        return {
            employeeName: user?.name || user?.email || 'Unknown',
            employeeEmail: user?.email || null,
            employeeDepartment: primaryRole?.department?.name || 'Unassigned',
            employeeRole: primaryRole?.role || user?.employeeProfile?.jobTitle || 'Member',
        }
    }

    private normalizeFilterValue(value?: string) {
        const normalized = String(value || '').trim().toLowerCase()
        return normalized && normalized !== 'all' ? normalized : ''
    }

    private payslipMatchesReportFilters(payslip: PayslipReportRecord, filters: PayrollReportFilters = {}) {
        const departmentFilter = this.normalizeFilterValue(filters.department)
        const statusFilter = this.normalizeFilterValue(filters.status)
        const userFilter = this.normalizeFilterValue(filters.userId)
        const identity = this.getPayrollIdentity(payslip.user)

        if (userFilter && payslip.userId.toLowerCase() !== userFilter) return false
        if (statusFilter && String(payslip.status || 'issued').toLowerCase() !== statusFilter) return false
        if (departmentFilter && identity.employeeDepartment.toLowerCase() !== departmentFilter) return false

        return true
    }

    private getPayslipDeductions(payslip: PayslipReportRecord) {
        return payslip.items
            .filter(i => i.amount < 0)
            .map(i => ({
                id: i.id,
                type: i.description.toLowerCase().includes('tax') ? 'tax' as const : 'other' as const,
                name: i.description,
                amount: Math.abs(i.amount),
            }))
    }

    private getPayslipHoursWorked(payslip: PayslipReportRecord) {
        const earning = payslip.items.find((item) => item.amount >= 0 && /\(\d+(?:\.\d+)?\s+h(?:rs?)?\b/i.test(item.description))
        if (!earning) return 0

        const match = earning.description.match(/\(([\d.]+)\s+h(?:rs?)?\b/i)
        return match ? Number(match[1]) || 0 : 0
    }

    private buildDepartmentSummary(payslips: PayslipReportRecord[]) {
        const summary = new Map<string, {
            department: string
            gross: number
            net: number
            deductions: number
            count: number
        }>()

        payslips.forEach((payslip) => {
            const identity = this.getPayrollIdentity(payslip.user)
            const key = identity.employeeDepartment
            const current = summary.get(key) || {
                department: key,
                gross: 0,
                net: 0,
                deductions: 0,
                count: 0,
            }

            current.gross += payslip.grossPay
            current.net += payslip.netPay
            current.deductions += payslip.grossPay - payslip.netPay
            current.count += 1
            summary.set(key, current)
        })

        return Array.from(summary.values()).sort((left, right) => right.gross - left.gross)
    }

    async addManualEntry(userId: string, start: Date, end: Date | null, notes?: string) {
        this.validateTimeRange(start, end)

        return this.prisma.timeEntry.create({
            data: {
                userId,
                start,
                end,
                duration: this.calculateDuration(start, end),
                notes
            }
        })
    }

    async updateTimeEntry(id: string, data: UpdateTimeEntryDto, options: TimeEntryAccessOptions) {
        const existing = await this.prisma.timeEntry.findUnique({ where: { id } })
        if (!existing) throw new PayrollNotFoundError('Time entry not found')
        if (!options.canManageAny && existing.userId !== options.requesterId) {
            throw new PayrollForbiddenError('Unauthorized to update this time entry')
        }

        const start = data.start ?? existing.start
        const end = data.end === undefined ? existing.end : data.end
        this.validateTimeRange(start, end)

        return this.prisma.timeEntry.update({
            where: { id },
            data: {
                userId: data.userId && options.canManageAny ? data.userId : undefined,
                start,
                end,
                duration: this.calculateDuration(start, end),
                notes: data.notes === undefined ? undefined : data.notes,
            },
        })
    }

    async deleteTimeEntry(id: string, userId: string, options: { canManageAny?: boolean } = {}) {
        const existing = await this.prisma.timeEntry.findUnique({ where: { id } })
        if (!existing) throw new PayrollNotFoundError('Time entry not found')
        if (!options.canManageAny && existing.userId !== userId) {
            throw new PayrollForbiddenError('Unauthorized to delete this time entry')
        }

        return this.prisma.timeEntry.delete({
            where: { id }
        })
    }

    // ==========================================
    // Core Payroll Processing
    // ==========================================

    /**
     * Get or Create Employee Profile
     */
    async getEmployeeProfile(userId: string) {
        let profile = await this.prisma.employeeProfile.findUnique({
            where: { userId }
        })

        if (!profile) {
            profile = await this.prisma.employeeProfile.create({
                data: { userId }
            })
        }
        return profile
    }

    /**
     * Update Employee Profile
     */
    async updateEmployeeProfile(userId: string, data: Record<string, unknown>) {
        const current = await this.getEmployeeProfile(userId)

        const updateData: Prisma.EmployeeProfileUpdateInput = {}
        if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle
        if (data.employmentType !== undefined) updateData.employmentType = data.employmentType
        if (data.baseSalary !== undefined) {
            const baseSalary = parseFloat(String(data.baseSalary))
            if (Number.isNaN(baseSalary)) throw new Error('Invalid base salary')
            updateData.baseSalary = baseSalary
        }
        if (data.currency !== undefined) updateData.currency = data.currency
        if (data.paymentFrequency !== undefined) updateData.paymentFrequency = data.paymentFrequency
        if (data.payrollScheme !== undefined) {
            updateData.payrollScheme = this.normalizePayrollScheme(data.payrollScheme)
        }
        if (data.maxBillableHoursPerDay !== undefined) {
            const maxBillableHoursPerDay = parseFloat(String(data.maxBillableHoursPerDay))
            if (!Number.isFinite(maxBillableHoursPerDay) || maxBillableHoursPerDay <= 0) {
                throw new Error('Invalid max billable hours per day')
            }
            updateData.maxBillableHoursPerDay = maxBillableHoursPerDay
        }
        if (data.payBasis !== undefined) {
            if (!isPayBasis(data.payBasis)) throw new PayrollValidationError('Invalid pay basis')
            updateData.payBasis = data.payBasis
        }
        if (data.hourlyRate !== undefined) {
            updateData.hourlyRate = this.parseOptionalHourlyRate(data.hourlyRate)
        }
        const nextPayBasis = updateData.payBasis !== undefined ? updateData.payBasis : current.payBasis
        const nextHourlyRate = updateData.hourlyRate !== undefined ? updateData.hourlyRate : current.hourlyRate
        const touchesRate = data.payBasis !== undefined || data.hourlyRate !== undefined
        if (touchesRate && nextPayBasis === 'hourly_rate' && !(typeof nextHourlyRate === 'number' && nextHourlyRate > 0)) {
            throw new PayrollValidationError(HOURLY_RATE_REQUIRED_MESSAGE)
        }
        if (data.overtimeMultiplier !== undefined) {
            const multiplier = parseFloat(String(data.overtimeMultiplier))
            if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 5) {
                throw new PayrollValidationError('Overtime multiplier must be between 1 and 5')
            }
            updateData.overtimeMultiplier = multiplier
        }
        if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount
        if (data.taxId !== undefined) updateData.taxId = data.taxId

        return this.prisma.employeeProfile.update({
            where: { userId },
            data: updateData
        })
    }

    private parseOptionalHourlyRate(value: unknown): number | null {
        if (value === null || value === '') return null
        const rate = parseFloat(String(value))
        if (!Number.isFinite(rate) || rate < 0) {
            throw new PayrollValidationError('Hourly rate must be zero or more')
        }
        return rate
    }

    /**
     * Create Payroll Period
     */
    async createPayrollPeriod(bounds: PeriodBounds) {
        return this.prisma.payrollPeriod.create({
            data: {
                startDate: bounds.start,
                endDate: bounds.end,
                payDate: bounds.payDate,
                status: 'draft'
            }
        })
    }

    /**
     * Lock/Finalize a Payroll Period (change status from draft to processed)
     */
    async lockPayrollPeriod(periodId: string) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')
        if (period.status !== 'draft') {
            throw new Error(`Period is already ${period.status}`)
        }

        return this.prisma.payrollPeriod.update({
            where: { id: periodId },
            data: { status: 'processed' }
        })
    }

    /**
     * Get Payroll Periods
     */
    async getPayrollPeriods() {
        return this.prisma.payrollPeriod.findMany({
            orderBy: { startDate: 'desc' },
            include: {
                _count: {
                    select: { payslips: true }
                }
            }
        })
    }

    /**
     * Auto-create a semi-monthly payroll period for right now
     * Called when no periods exist yet (first-time setup convenience)
     */
    async ensureCurrentPeriodExists(): Promise<string> {
        const existing = await this.prisma.payrollPeriod.findFirst({
            orderBy: { startDate: 'desc' }
        })
        if (existing) return existing.id

        // Semi-monthly period (1st-15th or 16th-end) in payroll-timezone days.
        const timeZone = config.payrollTimezone
        const period = await this.createPayrollPeriod(
            semiMonthlyPeriodForDay(payrollDayKey(new Date(), timeZone), timeZone),
        )

        logger.info('Auto-created payroll period', {
            periodId: period.id,
            startDate: period.startDate,
            endDate: period.endDate,
        })
        return period.id
    }

    /**
     * Hours per payroll-timezone day (Rule 1). Time entries first; daily logs
     * are the fallback when no entry was tracked in the window. `window` is the
     * [start, end) UTC range of whole payroll days (payrollPeriodWindow).
     */
    async loadDailyHours(userId: string, window: { start: Date; end: Date }) {
        const timeZone = config.payrollTimezone
        const timeEntries = await this.prisma.timeEntry.findMany({
            where: {
                userId,
                start: { gte: window.start, lt: window.end },
                duration: { not: null },
            },
            select: { start: true, duration: true },
        })
        const entryHours = bucketEntryHoursByDay(timeEntries, timeZone)
        if (Array.from(entryHours.values()).some((hours) => hours > 0)) {
            return { dailyHours: entryHours, source: 'Time Entries' }
        }

        const logs = await this.prisma.dailyLog.findMany({
            where: {
                authorId: userId,
                logType: 'daily',
                date: { gte: window.start, lt: window.end },
            },
            select: { date: true, hoursLogged: true },
        })
        const logHours = new Map<string, number>()
        for (const log of logs) {
            const key = payrollDayKey(log.date, timeZone)
            logHours.set(key, (logHours.get(key) || 0) + (log.hoursLogged || 0))
        }
        const hasLogHours = Array.from(logHours.values()).some((hours) => hours > 0)
        return { dailyHours: logHours, source: hasLogHours ? 'Daily Logs' : 'Time Entries' }
    }

    /**
     * Approved overtime hours per payroll-timezone day. workDate is midnight of
     * the work day in the payroll timezone, so the same [start, end) window as
     * the hours loads each boundary day's approval into exactly one period.
     */
    async loadApprovedOvertimeByDay(userId: string, window: { start: Date; end: Date }) {
        const requests = await this.prisma.overtimeRequest.findMany({
            where: {
                userId,
                status: 'approved',
                workDate: { gte: window.start, lt: window.end },
            },
            select: { workDate: true, hours: true, approvedHours: true },
        })
        const approved = new Map<string, number>()
        for (const request of requests) {
            const key = payrollDayKey(request.workDate, config.payrollTimezone)
            // hours is the original ask; a reviewer may have approved fewer.
            approved.set(key, (approved.get(key) || 0) + (request.approvedHours ?? request.hours))
        }
        return approved
    }

    /**
     * Calculate total hours for an employee in a given period
     */
    async calculateEmployeeHours(userId: string, startDate: Date, endDate: Date) {
        const profile = await this.getEmployeeProfile(userId)
        const maxBillableHoursPerDay = normalizePositiveNumber(
            profile.maxBillableHoursPerDay,
            DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
        )
        const window = payrollPeriodWindow(startDate, endDate, config.payrollTimezone)
        const [{ dailyHours, source }, approvedByDay] = await Promise.all([
            this.loadDailyHours(userId, window),
            this.loadApprovedOvertimeByDay(userId, window),
        ])
        const summary = summarizePayrollHours(dailyHours, maxBillableHoursPerDay, approvedByDay)

        return {
            totalHours: summary.totalHours,
            billableHours: summary.billableHours,
            overtimeHours: summary.overtimeHours,
            overtimeApprovedHours: summary.overtimeApprovedHours,
            overtimePendingHours: summary.overtimePendingHours,
            // Kept for older clients: unpaid overtime (not yet approved).
            pendingOvertimeHours: summary.overtimePendingHours,
            maxBillableHoursPerDay,
            source,
        }
    }

    /**
     * Pay for one employee over a window, per Rules 2 and 3.
     */
    async computePeriodPay(userId: string, startDate: Date, endDate: Date) {
        const profile = await this.getEmployeeProfile(userId)
        const hours = await this.calculateEmployeeHours(userId, startDate, endDate)
        const rateContext = getPayrollRateContext(profile, startDate, endDate)
        const payBasis = normalizePayBasis(profile.payBasis)
        const fraction = periodFraction(startDate, endDate)
        const pay = computeGrossPay({
            payBasis,
            billableHours: hours.billableHours,
            overtimeApprovedHours: hours.overtimeApprovedHours,
            monthlySalary: rateContext.monthlySalary,
            derivedHourlyRate: rateContext.hourlyRate,
            explicitHourlyRate: profile.hourlyRate,
            overtimeMultiplier: profile.overtimeMultiplier,
            periodFraction: fraction,
        })
        return { profile, hours, rateContext, pay, periodFraction: fraction }
    }

    private getWeekdaysInMonth(date: Date): number {
        return getWeekdaysInMonth(date)
    }

    /**
     * Preview a payslip calculation
     */
    async previewPayslip(userId: string, startDate: Date, endDate: Date) {
        const { profile, hours, rateContext, pay, periodFraction: fraction } =
            await this.computePeriodPay(userId, startDate, endDate)

        return {
            totalHours: hours.totalHours,
            billableHours: hours.billableHours,
            pendingOvertimeHours: hours.overtimePendingHours,
            overtimeApprovedHours: hours.overtimeApprovedHours,
            overtimePendingHours: hours.overtimePendingHours,
            source: hours.source,
            payBasis: pay.payBasis,
            payBasisLabel: PAY_BASIS_LABELS[pay.payBasis],
            hourlyRate: pay.hourlyRate,
            dailyRate: rateContext.dailyRate,
            basePay: roundMoney(pay.basePay),
            overtimeRate: pay.overtimeRate,
            overtimeMultiplier: normalizePositiveNumber(profile.overtimeMultiplier, DEFAULT_OVERTIME_MULTIPLIER),
            overtimePay: roundMoney(pay.overtimePay),
            // Same total the generated payslip stores: the sum of the rounded line amounts.
            grossPay: roundMoney(roundMoney(pay.basePay) + roundMoney(pay.overtimePay)),
            periodFraction: fraction,
            monthlySalary: profile.baseSalary,
            payrollScheme: rateContext.payrollScheme,
            payrollSchemeLabel: rateContext.payrollSchemeLabel,
            maxBillableHoursPerDay: hours.maxBillableHoursPerDay,
        }
    }

    /**
     * Line items for an automatic payslip (item types per the v2 spec).
     */
    private buildAutomaticPayslipItems(
        hours: Awaited<ReturnType<PayrollService['calculateEmployeeHours']>>,
        pay: ReturnType<typeof computeGrossPay>,
        schemeLabel: string,
        fraction: number,
        overtimeMultiplier: number,
    ) {
        const billable = roundHours(hours.billableHours)
        const tracked = roundHours(hours.totalHours)
        const rateLabel = pay.payBasis === 'hourly_rate' ? 'Hourly rate' : schemeLabel
        const baseItem = pay.payBasis === 'fixed_monthly'
            ? {
                type: 'fixed_salary',
                description: `Fixed monthly salary (${billable} h billable, ${roundHours(fraction)} of month)`,
                amount: roundMoney(pay.basePay),
            }
            : {
                type: 'regular_hours',
                description: `Billable work hours (${billable} h billable, ${tracked} h tracked) - ${rateLabel}`,
                amount: roundMoney(pay.basePay),
            }
        const approvedItems = hours.overtimeApprovedHours > 0
            ? [{
                type: 'overtime_approved',
                description: `Approved overtime (${roundHours(hours.overtimeApprovedHours)} h at ${overtimeMultiplier}x)`,
                amount: roundMoney(pay.overtimePay),
            }]
            : []
        const pendingItems = hours.overtimePendingHours > 0
            ? [{
                type: 'overtime_pending',
                description: `Unapproved overtime, not paid (${roundHours(hours.overtimePendingHours)} h)`,
                amount: 0,
            }]
            : []
        return [baseItem, ...approvedItems, ...pendingItems]
    }

    /**
     * Base line for a manual payslip. The admin's hours replace the regular
     * hours only: hourly bases pay hours x hourly rate, fixed_monthly keeps the
     * fixed salary. An explicit grossPay replaces the base amount, never the
     * overtime lines.
     */
    private buildManualBaseItem(
        overrideData: ManualPayslipInput,
        pay: ReturnType<typeof computeGrossPay>,
    ): PayslipLine {
        const hoursWorked = Number(overrideData.hoursWorked)
        if (!Number.isFinite(hoursWorked) || hoursWorked < 0) {
            throw new PayrollValidationError('Hours worked must be 0 or more')
        }
        const hasManualAmount = overrideData.grossPay !== undefined && overrideData.grossPay !== null
        const manualAmount = Number(overrideData.grossPay)
        if (hasManualAmount && !Number.isFinite(manualAmount)) {
            throw new PayrollValidationError('Gross pay must be a number')
        }
        const isFixed = pay.payBasis === 'fixed_monthly'
        const computed = isFixed ? pay.basePay : hoursWorked * pay.hourlyRate
        return {
            type: isFixed ? 'fixed_salary' : 'regular_hours',
            description: isFixed
                ? `Fixed monthly salary (${roundHours(hoursWorked)} h entered by hand)`
                : `Work hours (${roundHours(hoursWorked)} h) entered by hand`,
            amount: roundMoney(hasManualAmount ? manualAmount : computed),
        }
    }

    private buildDeductionItems(deductions: ManualPayslipInput['deductions'] = []): PayslipLine[] {
        return deductions.map((deduction) => {
            const amount = Number(deduction.amount)
            if (!Number.isFinite(amount)) throw new PayrollValidationError('Deduction amounts must be numbers')
            return {
                type: 'deduction',
                description: deduction.name || deduction.type,
                amount: -roundMoney(Math.abs(amount)),
            }
        })
    }

    /**
     * Line items for one payslip. The automatic lines always come from the pay
     * basis and approved overtime; a manual override (hoursWorked) replaces only
     * the base (regular hours) line. Deductions are added on either path.
     */
    private async buildPayslipItems(
        userId: string,
        period: { startDate: Date; endDate: Date },
        overrideData?: ManualPayslipInput,
    ): Promise<PayslipLine[]> {
        const { profile, hours, rateContext, pay, periodFraction: fraction } =
            await this.computePeriodPay(userId, period.startDate, period.endDate)
        const [baseItem, ...overtimeItems] = this.buildAutomaticPayslipItems(
            hours,
            pay,
            rateContext.payrollSchemeLabel,
            fraction,
            normalizePositiveNumber(profile.overtimeMultiplier, DEFAULT_OVERTIME_MULTIPLIER),
        )
        const isManual = overrideData?.hoursWorked !== undefined && overrideData?.hoursWorked !== null
        const base = isManual ? this.buildManualBaseItem(overrideData, pay) : baseItem
        return [base, ...overtimeItems, ...this.buildDeductionItems(overrideData?.deductions)]
    }

    /**
     * Generate Payslip for a User in a Period
     */
    async generatePayslip(
        periodId: string,
        userId: string,
        overrideData?: ManualPayslipInput,
        options: GeneratePayslipOptions = {},
    ) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')
        if (period.status !== 'draft') {
            throw new Error(`Cannot run payroll for a ${period.status} cycle. Cycle must be draft.`);
        }

        // Hand edits (PATCH /payslips/:id) are never overwritten silently.
        const existing = await this.prisma.payslip.findFirst({
            where: { periodId, userId },
            select: { id: true, editedAt: true },
        })
        if (existing?.editedAt && !options.force) throw new PayrollConflictError(EDITED_PAYSLIP_MESSAGE)

        const profile = await this.getEmployeeProfile(userId)

        // Totals always come from the line items, never from the request.
        const items = await this.buildPayslipItems(userId, period, overrideData)
        const { grossPay, netPay } = computePayslipTotals(items)

        // Gather EOD notes/shiftNotes for this period (whole payroll-timezone days)
        const noteWindow = payrollPeriodWindow(period.startDate, period.endDate, config.payrollTimezone)
        const logsWithNotes = await this.prisma.dailyLog.findMany({
            where: {
                authorId: userId,
                logType: 'daily',
                date: {
                    gte: noteWindow.start,
                    lt: noteWindow.end
                },
                OR: [
                    { shiftNotes: { not: "" } },
                    { content: { not: "" } }
                ]
            }
        })

        const aggregatedNotes = logsWithNotes.map(log =>
            `[${payrollDayKey(log.date, config.payrollTimezone)}] ${log.shiftNotes || log.content}`
        ).join('\n')

        // Create or Update Payslip
        if (existing) {
            // Update (a forced regenerate also clears the hand-edit record)
            await this.prisma.payrollItem.deleteMany({ where: { payslipId: existing.id } })
            return this.prisma.payslip.update({
                where: { id: existing.id },
                data: {
                    grossPay,
                    netPay,
                    notes: aggregatedNotes || null,
                    ...(existing.editedAt ? { editedById: null, editedAt: null, editNote: null } : {}),
                    items: {
                        create: items
                    }
                },
                include: { items: true }
            })
        } else {

            const payslip = await this.prisma.payslip.create({
                data: {
                    periodId,
                    userId,
                    grossPay,
                    netPay,
                    notes: aggregatedNotes || null,
                    items: {
                        create: items,
                    },
                },
                include: { items: true },
            });

            // Send Email Notification
            try {
                const user = await this.prisma.user.findUnique({ where: { id: userId } });
                if (user && user.email) {
                    await emailService.sendPayslipNotification(user.email, {
                        userName: user.name || 'Employee',
                        periodDateRange: `${periodStartDayKey(period.startDate)} to ${periodEndDayKey(period.endDate)}`,
                        grossPay: `${profile.currency} ${grossPay.toFixed(2)}`,
                        netPay: `${profile.currency} ${netPay.toFixed(2)}`,
                        payDate: period.payDate ? periodEndDayKey(period.payDate) : 'N/A',
                        viewUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-payslips`,
                    });
                }
            } catch (error) {
                logger.error('Failed to send payslip email', error);
                // Don't block the response
            }

            return payslip;
        }
    }

    /**
     * Generate Payslip for all employees for a given period
     */
    async bulkGeneratePayslips(periodId: string) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')

        if (period.status !== 'draft') {
            throw new Error(`Cannot run payroll for a ${period.status} cycle. Cycle must be draft.`);
        }

        // Internal employees only; client-only accounts stay out of payroll generation.
        // Inactive members are included when they tracked time or had overtime approved
        // inside the period, so a mid-period deactivation still gets paid.
        const window = payrollPeriodWindow(period.startDate, period.endDate, config.payrollTimezone)
        const employeeAccounts = await this.prisma.user.findMany({
            where: {
                OR: [
                    { status: { in: PAYROLL_ACTIVE_STATUSES } },
                    {
                        status: 'inactive',
                        OR: [
                            { timeEntries: { some: { start: { gte: window.start, lt: window.end } } } },
                            {
                                overtimeRequests: {
                                    some: { status: 'approved', workDate: { gte: window.start, lt: window.end } },
                                },
                            },
                        ],
                    },
                ],
            },
            include: {
                roles: {
                    select: {
                        role: true,
                    },
                },
                clientMemberships: {
                    select: {
                        status: true,
                    },
                },
            },
        })
        const employees = employeeAccounts.filter(isInternalEmployeeAccount)

        // Hand-edited payslips are kept; they are reported as skipped.
        const edited = await this.prisma.payslip.findMany({
            where: { periodId, editedAt: { not: null } },
            select: { userId: true },
        })
        const editedUserIds = new Set(edited.map((payslip) => payslip.userId))

        const results: Array<{
            userId: string
            success: boolean
            payslipId?: string
            skipped?: boolean
            reason?: string
            error?: string
        }> = []
        for (const emp of employees) {
            if (editedUserIds.has(emp.id)) {
                results.push({ userId: emp.id, success: true, skipped: true, reason: 'Edited by hand; kept as is' })
                continue
            }
            try {
                const payslip = await this.generatePayslip(periodId, emp.id)
                results.push({ userId: emp.id, success: true, payslipId: payslip.id })
            } catch (err) {
                logger.error('Failed to generate bulk payslip', { userId: emp.id, error: err })
                results.push({ userId: emp.id, success: false, error: err instanceof Error ? err.message : String(err) })
            }
        }

        return results
    }

    /**
     * Get Payslips for a User
     */
    async getUserPayslips(userId: string) {
        return this.prisma.payslip.findMany({
            where: { userId },
            include: {
                period: true,
                items: true
            },
            orderBy: { generatedAt: 'desc' }
        })
    }

    /**
     * Get Report Statistics for Admins
     */
    async getReportStats(filters: PayrollReportFilters = {}) {
        const periods = await this.prisma.payrollPeriod.findMany({
            include: {
                payslips: {
                    include: {
                        period: true,
                        items: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                employeeProfile: {
                                    select: {
                                        jobTitle: true,
                                    },
                                },
                                roles: {
                                    select: {
                                        role: true,
                                        department: {
                                            select: {
                                                id: true,
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    }
                }
            },
            orderBy: { startDate: 'desc' },
            take: 5
        })

        const stats = periods.map(p => {
            const filteredPayslips = p.payslips.filter((payslip) => this.payslipMatchesReportFilters(payslip, filters))
            const totalGross = filteredPayslips.reduce((sum, ps) => sum + ps.grossPay, 0)
            const totalNet = filteredPayslips.reduce((sum, ps) => sum + ps.netPay, 0)
            const totalDeductions = totalGross - totalNet

            // Aggregated breakdown
            const breakdown = {
                tax: 0,
                benefits: 0
            }

            filteredPayslips.forEach(ps => {
                ps.items.forEach((item: { amount: number; description: string }) => {
                    const amt = Math.abs(item.amount)
                    if (item.amount < 0) {
                        if (item.description.toLowerCase().includes('tax')) {
                            breakdown.tax += amt
                        } else {
                            breakdown.benefits += amt
                        }
                    }
                })
            })

            return {
                periodId: p.id,
                label: `${periodStartDayKey(p.startDate)} to ${periodEndDayKey(p.endDate)}`,
                gross: totalGross,
                net: totalNet,
                deductions: totalDeductions,
                breakdown,
                count: filteredPayslips.length,
                departmentSummary: this.buildDepartmentSummary(filteredPayslips),
            }
        })

        return stats
    }

    /**
     * Get ALL payslips across all employees (admin/manager use - Payslip Archive)
     */
    async getAllPayslips(filters: PayrollReportFilters = {}) {
        const payslips = await this.prisma.payslip.findMany({
            include: {
                period: true,
                items: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                jobTitle: true,
                            },
                        },
                        roles: {
                            select: {
                                role: true,
                                department: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        })

        return payslips.filter((ps) => this.payslipMatchesReportFilters(ps, filters)).map((ps) => {
            const identity = this.getPayrollIdentity(ps.user)

            return {
            id: ps.id,
            employeeId: ps.userId,
            employeeName: identity.employeeName,
            employeeEmail: identity.employeeEmail,
            employeeDepartment: identity.employeeDepartment,
            employeeRole: identity.employeeRole,
            // Payroll-timezone calendar days, not UTC dates.
            payPeriodStart: ps.period?.startDate ? periodStartDayKey(ps.period.startDate) : null,
            payPeriodEnd: ps.period?.endDate ? periodEndDayKey(ps.period.endDate) : null,
            issueDate: ps.generatedAt ? payrollDayKey(ps.generatedAt, config.payrollTimezone) : null,
            status: (ps.status ?? 'issued').toLowerCase(),
            hoursWorked: this.getPayslipHoursWorked(ps),
            grossPay: ps.grossPay,
            netPay: ps.netPay,
            deductions: this.getPayslipDeductions(ps),
            }
        })
    }
}

