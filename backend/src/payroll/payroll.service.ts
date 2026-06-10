import { PrismaClient, TimeEntry, PayrollEvent, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'
import { createLogger } from '../observability/logger'
import { isInternalEmployeeAccount } from '../employees/employees.security'

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

type PayrollScheme = 'weekdays' | 'flat_30' | 'flat_20' | 'flat_160_hours'

interface TimeEntryAccessOptions {
    requesterId: string
    canManageAny?: boolean
}

export class PayrollForbiddenError extends Error { }
export class PayrollNotFoundError extends Error { }

const DEFAULT_MAX_BILLABLE_HOURS_PER_DAY = 8
const DEFAULT_PAYROLL_SCHEME: PayrollScheme = 'weekdays'
const PAYROLL_SCHEME_LABELS: Record<PayrollScheme, string> = {
    weekdays: 'Weekdays of month',
    flat_30: 'Flat 30 days',
    flat_20: 'Flat 20 days',
    flat_160_hours: 'Flat 160 hours',
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

    private normalizePositiveNumber(value: unknown, fallback: number): number {
        const parsed = typeof value === 'number' ? value : parseFloat(String(value))
        if (!Number.isFinite(parsed) || parsed <= 0) return fallback
        return parsed
    }

    private normalizePayrollScheme(value: unknown): PayrollScheme {
        if (value === 'flat_30' || value === 'flat_20' || value === 'flat_160_hours' || value === 'weekdays') {
            return value
        }
        return DEFAULT_PAYROLL_SCHEME
    }

    private getPayrollRateContext(profile: {
        baseSalary?: number | null
        payrollScheme?: string | null
        maxBillableHoursPerDay?: number | null
    }, startDate: Date, endDate: Date) {
        const monthlySalary = profile.baseSalary || 0
        const maxBillableHoursPerDay = this.normalizePositiveNumber(
            profile.maxBillableHoursPerDay,
            DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
        )
        const payrollScheme = this.normalizePayrollScheme(profile.payrollScheme)
        const midpointDate = this.getMidpointDate(startDate, endDate)

        if (payrollScheme === 'flat_160_hours') {
            return {
                monthlySalary,
                payrollScheme,
                payrollSchemeLabel: PAYROLL_SCHEME_LABELS[payrollScheme],
                maxBillableHoursPerDay,
                divisorHours: 160,
                hourlyRate: monthlySalary / 160,
                dailyRate: (monthlySalary / 160) * maxBillableHoursPerDay,
            }
        }

        const divisorDays = payrollScheme === 'flat_30'
            ? 30
            : payrollScheme === 'flat_20'
                ? 20
                : this.getWeekdaysInMonth(midpointDate)
        const dailyRate = divisorDays > 0 ? monthlySalary / divisorDays : 0

        return {
            monthlySalary,
            payrollScheme,
            payrollSchemeLabel: PAYROLL_SCHEME_LABELS[payrollScheme],
            maxBillableHoursPerDay,
            divisorDays,
            hourlyRate: maxBillableHoursPerDay > 0 ? dailyRate / maxBillableHoursPerDay : 0,
            dailyRate,
        }
    }

    private summarizeDailyHours(
        dailyHours: Map<string, number>,
        maxBillableHoursPerDay: number,
    ) {
        let totalHours = 0
        let billableHours = 0
        let pendingOvertimeHours = 0

        dailyHours.forEach((hours) => {
            totalHours += hours
            billableHours += Math.min(hours, maxBillableHoursPerDay)
            pendingOvertimeHours += Math.max(0, hours - maxBillableHoursPerDay)
        })

        return {
            totalHours,
            billableHours,
            pendingOvertimeHours,
        }
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
        await this.getEmployeeProfile(userId)

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
        if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount
        if (data.taxId !== undefined) updateData.taxId = data.taxId

        return this.prisma.employeeProfile.update({
            where: { userId },
            data: updateData
        })
    }

    /**
     * Create Payroll Period
     */
    async createPayrollPeriod(startDate: Date, endDate: Date, payDate: Date) {
        return this.prisma.payrollPeriod.create({
            data: {
                startDate,
                endDate,
                payDate,
                status: 'draft'
            }
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

        // Create a semi-monthly period: 1st–15 or 16th–end-of-month
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth()
        const day = now.getDate()

        let startDate: Date
        let endDate: Date
        if (day <= 15) {
            startDate = new Date(year, month, 1)
            endDate = new Date(year, month, 15, 23, 59, 59)
        } else {
            startDate = new Date(year, month, 16)
            endDate = new Date(year, month + 1, 0, 23, 59, 59) // last day of month
        }

        const payDate = new Date(endDate)
        payDate.setDate(payDate.getDate() + 5)

        const period = await this.prisma.payrollPeriod.create({
            data: { startDate, endDate, payDate, status: 'draft' }
        })

        logger.info('Auto-created payroll period', {
            periodId: period.id,
            startDate,
            endDate,
        })
        return period.id
    }

    /**
     * Calculate total hours for an employee in a given period
     */
    async calculateEmployeeHours(userId: string, startDate: Date, endDate: Date) {
        const profile = await this.getEmployeeProfile(userId)
        const maxBillableHoursPerDay = this.normalizePositiveNumber(
            profile.maxBillableHoursPerDay,
            DEFAULT_MAX_BILLABLE_HOURS_PER_DAY,
        )

        // 1. Try fetching TimeEntries (Clock In/Out)
        const timeEntries = await this.prisma.timeEntry.findMany({
            where: {
                userId,
                start: { gte: startDate, lte: endDate },
                duration: { not: null }
            }
        })

        const dailyHours = new Map<string, number>()
        timeEntries.forEach((entry) => {
            const dateKey = entry.start.toISOString().slice(0, 10)
            dailyHours.set(dateKey, (dailyHours.get(dateKey) || 0) + ((entry.duration || 0) / 60))
        })

        let summary = this.summarizeDailyHours(dailyHours, maxBillableHoursPerDay)
        let source = 'Time Entries'

        // 2. Fallback to Daily Logs
        if (summary.totalHours === 0) {
            const logs = await this.prisma.dailyLog.findMany({
                where: {
                    authorId: userId,
                    logType: 'daily',
                    date: { gte: startDate, lte: endDate }
                }
            })
            const logDailyHours = new Map<string, number>()
            logs.forEach((log) => {
                const dateKey = log.date.toISOString().slice(0, 10)
                logDailyHours.set(dateKey, (logDailyHours.get(dateKey) || 0) + (log.hoursLogged || 0))
            })
            summary = this.summarizeDailyHours(logDailyHours, maxBillableHoursPerDay)
            if (summary.totalHours > 0) source = 'Daily Logs'
        }

        return {
            totalHours: summary.totalHours,
            billableHours: summary.billableHours,
            pendingOvertimeHours: summary.pendingOvertimeHours,
            maxBillableHoursPerDay,
            source
        }
    }

    /**
     * Calculate number of weekdays in a given month
     */
    private getWeekdaysInMonth(date: Date): number {
        const year = date.getFullYear()
        const month = date.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        let weekdays = 0
        for (let d = 1; d <= daysInMonth; d++) {
            const dayOfWeek = new Date(year, month, d).getDay()
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Saturday (6) and Sunday (0)
                weekdays++
            }
        }
        return weekdays
    }

    /**
     * Get midpoint of two dates
     */
    private getMidpointDate(start: Date, end: Date): Date {
        const midTime = start.getTime() + (end.getTime() - start.getTime()) / 2
        return new Date(midTime)
    }

    /**
     * Preview a payslip calculation
     */
    async previewPayslip(userId: string, startDate: Date, endDate: Date) {
        const profile = await this.getEmployeeProfile(userId)
        const {
            totalHours,
            billableHours,
            pendingOvertimeHours,
            maxBillableHoursPerDay,
            source,
        } = await this.calculateEmployeeHours(userId, startDate, endDate)
        const rateContext = this.getPayrollRateContext(profile, startDate, endDate)
        const grossPay = billableHours * rateContext.hourlyRate

        return {
            totalHours,
            billableHours,
            pendingOvertimeHours,
            source,
            hourlyRate: rateContext.hourlyRate,
            dailyRate: rateContext.dailyRate,
            grossPay,
            monthlySalary: profile.baseSalary,
            payrollScheme: rateContext.payrollScheme,
            payrollSchemeLabel: rateContext.payrollSchemeLabel,
            maxBillableHoursPerDay,
        }
    }

    /**
     * Generate Payslip for a User in a Period
     */
    async generatePayslip(periodId: string, userId: string, overrideData?: {
        hoursWorked?: number,
        grossPay?: number,
        netPay?: number,
        deductions?: Array<{ name: string, amount: number, type: string }>
    }) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')

        const profile = await this.getEmployeeProfile(userId)

        let totalHours: number;
        let grossPay: number;
        let netPay: number;
        const items = [];

        if (overrideData && overrideData.hoursWorked !== undefined) {
            // Manual path
            totalHours = overrideData.hoursWorked;
            grossPay = overrideData.grossPay ?? 0;
            netPay = overrideData.netPay ?? grossPay;

            items.push({
                type: 'earning',
                description: `Work Hours (${totalHours} hrs) - Manual`,
                amount: grossPay
            });

            if (overrideData.deductions) {
                for (const d of overrideData.deductions) {
                    items.push({
                        type: 'deduction',
                        description: d.name || d.type,
                        amount: -Math.abs(d.amount)
                    });
                }
            }
        } else {
            // Automatic path
            const {
                totalHours: trackedHours,
                billableHours,
                pendingOvertimeHours,
            } = await this.calculateEmployeeHours(userId, period.startDate, period.endDate)
            const rateContext = this.getPayrollRateContext(profile, period.startDate, period.endDate)
            totalHours = billableHours;
            grossPay = billableHours * rateContext.hourlyRate

            items.push({
                type: 'earning',
                description: `Billable Work Hours (${billableHours} hrs, ${trackedHours} tracked) - ${rateContext.payrollSchemeLabel}`,
                amount: grossPay
            })

            if (pendingOvertimeHours > 0) {
                items.push({
                    type: 'overtime_pending',
                    description: `Pending overtime (${pendingOvertimeHours} hrs) - not billable until approved`,
                    amount: 0,
                })
            }

            netPay = grossPay;
        }

        // Gather EOD notes/shiftNotes for this period
        const logsWithNotes = await this.prisma.dailyLog.findMany({
            where: {
                authorId: userId,
                logType: 'daily',
                date: {
                    gte: period.startDate,
                    lte: period.endDate
                },
                OR: [
                    { shiftNotes: { not: "" } },
                    { content: { not: "" } }
                ]
            }
        })

        const aggregatedNotes = logsWithNotes.map(log =>
            `[${log.date.toLocaleDateString()}] ${log.shiftNotes || log.content}`
        ).join('\n')

        // Create or Update Payslip
        // Check existing
        const existing = await this.prisma.payslip.findFirst({
            where: { periodId, userId },
            include: { items: true }
        })

        if (existing) {
            // Update
            await this.prisma.payrollItem.deleteMany({ where: { payslipId: existing.id } })
            return this.prisma.payslip.update({
                where: { id: existing.id },
                data: {
                    grossPay,
                    netPay,
                    notes: aggregatedNotes || null,
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
                        periodDateRange: `${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}`,
                        grossPay: `${profile.currency} ${grossPay.toFixed(2)}`,
                        netPay: `${profile.currency} ${netPay.toFixed(2)}`,
                        payDate: period.payDate ? period.payDate.toLocaleDateString() : 'N/A',
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

        // Fetch active internal employees only; client-only accounts stay out of payroll generation.
        const employeeAccounts = await this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'verified', 'vacation', 'leave'],
                },
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

        const results = []
        for (const emp of employees) {
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
    async getReportStats() {
        const periods = await this.prisma.payrollPeriod.findMany({
            include: {
                payslips: {
                    include: { items: true }
                }
            },
            orderBy: { startDate: 'desc' },
            take: 5
        })

        const stats = periods.map(p => {
            const totalGross = p.payslips.reduce((sum, ps) => sum + ps.grossPay, 0)
            const totalNet = p.payslips.reduce((sum, ps) => sum + ps.netPay, 0)
            const totalDeductions = totalGross - totalNet

            // Aggregated breakdown
            const breakdown = {
                tax: 0,
                benefits: 0
            }

            p.payslips.forEach(ps => {
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
                label: `${p.startDate.toLocaleDateString()} - ${p.endDate.toLocaleDateString()}`,
                gross: totalGross,
                net: totalNet,
                deductions: totalDeductions,
                breakdown,
                count: p.payslips.length
            }
        })

        return stats
    }

    /**
     * Get ALL payslips across all employees (admin/manager use - Payslip Archive)
     */
    async getAllPayslips() {
        const payslips = await this.prisma.payslip.findMany({
            include: {
                period: true,
                items: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        })

        return payslips.map((ps) => ({
            id: ps.id,
            employeeId: ps.userId,
            employeeName: ps.user?.name ?? 'Unknown',
            payPeriodStart: ps.period?.startDate?.toISOString().split('T')[0] ?? null,
            payPeriodEnd: ps.period?.endDate?.toISOString().split('T')[0] ?? null,
            issueDate: ps.generatedAt?.toISOString().split('T')[0] ?? null,
            status: (ps.status ?? 'issued').toLowerCase(),
            hoursWorked: 0,
            grossPay: ps.grossPay,
            netPay: ps.netPay,
            deductions: ps.items
                .filter(i => i.amount < 0)
                .map(i => ({
                    id: i.id,
                    type: 'other' as const,
                    name: i.description,
                    amount: Math.abs(i.amount),
                })),
        }))
    }
}

