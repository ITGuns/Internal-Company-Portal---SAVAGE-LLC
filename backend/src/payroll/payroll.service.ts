import { PrismaClient, TimeEntry, PayrollEvent } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { emailService } from '../email/email.service'

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

export class PayrollService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    // PayrollEvent methods
    async getEvents(type?: string, startDate?: Date, endDate?: Date) {
        const where: any = {}

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

    async clockIn(userId: string) {
        // Check if already clocked in
        const openEntry = await this.prisma.timeEntry.findFirst({
            where: { userId, end: null }
        })
        if (openEntry) throw new Error('Already clocked in')

        return this.prisma.timeEntry.create({
            data: {
                userId,
                start: new Date()
            }
        })
    }

    async clockOut(userId: string) {
        const openEntry = await this.prisma.timeEntry.findFirst({
            where: { userId, end: null }
        })
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

    async addManualEntry(userId: string, start: Date, end: Date | null, notes?: string) {
        let duration = null
        if (end) {
            duration = Math.round((end.getTime() - start.getTime()) / 60000)
        }
        return this.prisma.timeEntry.create({
            data: {
                userId,
                start,
                end,
                duration,
                notes
            }
        })
    }

    async deleteTimeEntry(id: string, userId: string) {
        // Ensure user owns entry (or is admin, but simplified here)
        return this.prisma.timeEntry.delete({
            where: { id, userId } // Safety check
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
    async updateEmployeeProfile(userId: string, data: any) {
        const updateData: any = {}
        if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle
        if (data.employmentType !== undefined) updateData.employmentType = data.employmentType
        if (data.baseSalary !== undefined) updateData.baseSalary = parseFloat(data.baseSalary)
        if (data.currency !== undefined) updateData.currency = data.currency
        if (data.paymentFrequency !== undefined) updateData.paymentFrequency = data.paymentFrequency
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

        console.log(`[PayrollService] Auto-created payroll period: ${period.id} (${startDate.toDateString()} – ${endDate.toDateString()})`)
        return period.id
    }

    /**
     * Calculate total hours for an employee in a given period
     */
    async calculateEmployeeHours(userId: string, startDate: Date, endDate: Date) {
        // 1. Try fetching TimeEntries (Clock In/Out)
        const timeEntries = await this.prisma.timeEntry.findMany({
            where: {
                userId,
                start: { gte: startDate, lte: endDate },
                duration: { not: null }
            }
        })

        let totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
        let totalHours = totalMinutes / 60
        let source = 'Time Entries'

        // 2. Fallback to Daily Logs
        if (totalHours === 0) {
            const logs = await this.prisma.dailyLog.findMany({
                where: {
                    authorId: userId,
                    logType: 'daily',
                    date: { gte: startDate, lte: endDate }
                }
            })
            totalHours = logs.reduce((sum, log) => sum + (log.hoursLogged || 0), 0)
            if (totalHours > 0) source = 'Daily Logs'
        }

        return {
            totalHours,
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
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                weekdays++
            }
        }
        return weekdays
    }

    /**
     * Preview a payslip calculation
     */
    async previewPayslip(userId: string, startDate: Date, endDate: Date) {
        const profile = await this.getEmployeeProfile(userId)
        const { totalHours, source } = await this.calculateEmployeeHours(userId, startDate, endDate)

        // Calculate dynamically based on exact number of weekdays in the month
        const weekdaysInMonth = this.getWeekdaysInMonth(startDate)
        const dailyRate = profile.baseSalary / weekdaysInMonth
        const hourlyRate = dailyRate / 8 // Standard 8 hour workday assumption
        const grossPay = totalHours * hourlyRate

        return {
            totalHours,
            source,
            hourlyRate,
            grossPay,
            monthlySalary: profile.baseSalary
        }
    }

    /**
     * Generate Payslip for a User in a Period
     */
    async generatePayslip(periodId: string, userId: string) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')

        const profile = await this.getEmployeeProfile(userId)
        const { totalHours, source } = await this.calculateEmployeeHours(userId, period.startDate, period.endDate)

        // Calculate dynamically based on exact number of weekdays in the month
        const weekdaysInMonth = this.getWeekdaysInMonth(period.startDate)
        const dailyRate = profile.baseSalary / weekdaysInMonth
        const hourlyRate = dailyRate / 8
        const grossPay = totalHours * hourlyRate
        const items = []

        items.push({
            type: 'earning',
            description: `Work Hours (${totalHours} hrs @ ₱${hourlyRate.toFixed(2)}/hr) - via ${source}`,
            amount: grossPay
        })

        // No hard-coded deductions per user request
        const netPay = grossPay

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
                console.error('Failed to send payslip email:', error);
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

        // Fetch all active employees (users with an 'active', 'vacation', or 'leave' status)
        const employees = await this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave'],
                },
            }
        })

        const results = []
        for (const emp of employees) {
            try {
                const payslip = await this.generatePayslip(periodId, emp.id)
                results.push({ userId: emp.id, success: true, payslipId: payslip.id })
            } catch (err: any) {
                console.error(`Failed to generate bulk payslip for ${emp.id}:`, err.message)
                results.push({ userId: emp.id, success: false, error: err.message })
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
                ps.items.forEach((item: any) => {
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
        const payslips = await (this.prisma.payslip.findMany({
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
        }) as any)

        return (payslips as any[]).map((ps: any) => ({
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
            deductions: (ps.items as any[])
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

