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
        return this.prisma.employeeProfile.update({
            where: { userId },
            data: {
                jobTitle: data.jobTitle,
                employmentType: data.employmentType,
                baseSalary: parseFloat(data.baseSalary),
                currency: data.currency,
                paymentFrequency: data.paymentFrequency,
                bankAccount: data.bankAccount,
                taxId: data.taxId
            }
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
     * Generate Payslip for a User in a Period
     */
    async generatePayslip(periodId: string, userId: string) {
        const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } })
        if (!period) throw new Error('Period not found')

        const profile = await this.getEmployeeProfile(userId)

        // Calculate Gross Pay
        let grossPay = 0
        const items = [] // { type, description, amount }

        if (profile.baseSalary && profile.baseSalary > 0) {
            // Salary based? 
            // If Monthly, and period is Semi-Monthly, divide by 2?
            // For MVP, assume Base Salary is PER PERIOD amount if salaried, 
            // OR calculate Hourly if hourly.

            // Heuristic: If < 1000, assumes hourly rate? If > 1000, assumes monthly salary?
            // Let's rely on employmentType.

            if (profile.employmentType === 'Contractor' || profile.baseSalary < 1000) {
                // Hourly Calculation
                // Fetch TimeEntries (or DailyLogs logs)
                const logs = await this.prisma.dailyLog.findMany({
                    where: {
                        authorId: userId,
                        date: {
                            gte: period.startDate,
                            lte: period.endDate
                        }
                    }
                })

                const totalHours = logs.reduce((sum, log) => sum + (log.hoursLogged || 0), 0)
                grossPay = totalHours * profile.baseSalary

                items.push({
                    type: 'earning',
                    description: `Hourly Pay (${totalHours} hrs @ ${profile.baseSalary})`,
                    amount: grossPay
                })
            } else {
                // Fixed Salary (Assume Base Salary is Monthly)
                // If Period is ~15 days (Semi-Monthly), pay Half.
                // If Period is ~30 days, pay Full.

                const daysDiff = (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 3600 * 24)
                let salary = profile.baseSalary

                if (daysDiff < 20) { // Semi-monthly
                    salary = salary / 2
                }

                grossPay = salary
                items.push({
                    type: 'earning',
                    description: 'Base Salary',
                    amount: grossPay
                })
            }
        }

        // Deductions (Placeholder logic)
        // e.g. Tax 10%
        const tax = grossPay * 0.0 // 0% for now
        if (tax > 0) {
            items.push({ type: 'tax', description: 'Withholding Tax', amount: -tax })
        }

        const netPay = grossPay - tax

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
}

