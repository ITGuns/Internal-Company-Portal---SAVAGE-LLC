import { PrismaClient, User } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateEmployeeDto {
    email: string
    name: string
    role: string
    department: string
    salary: number
    passwordHash?: string
}

export class EmployeesService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Get all pending applications
     */
    async getPending(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: {
                status: 'pending',
            },
            include: {
                employeeProfile: true
            },
            orderBy: {
                appliedDate: 'desc',
            },
        })
    }

    /**
     * Get all deployed employees with their current-week hours computed
     */
    async getDeployed() {
        const users = await this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave'],
                },
            },
            include: { employeeProfile: true },
            orderBy: { name: 'asc' },
        })

        // Compute current week boundaries (Mon–Sun)
        const now = new Date()
        const dayOfWeek = now.getDay() // 0 = Sunday
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() + diffToMonday)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        // Fetch all relevant time entries in one query (more efficient than N+1)
        const allEntries = await this.prisma.timeEntry.findMany({
            where: {
                userId: { in: users.map(u => u.id) },
                start: { gte: weekStart, lt: weekEnd },
                duration: { not: null }
            },
            select: { userId: true, duration: true }
        })

        // Build a map: userId -> total minutes this week
        const minutesByUser: Record<string, number> = {}
        for (const entry of allEntries) {
            minutesByUser[entry.userId] = (minutesByUser[entry.userId] || 0) + (entry.duration || 0)
        }

        // Merge computed fields into each user object
        // Note: EmployeeProfile has no Department relation in schema — department comes from UserRole
        return users.map(u => ({
            ...u,
            hoursThisWeek: parseFloat(((minutesByUser[u.id] || 0) / 60).toFixed(2)),
            role: u.employeeProfile?.jobTitle || null,
            salary: u.employeeProfile?.baseSalary || 0,
            performance: 0, // placeholder — no performance model yet
        }))
    }

    /**
     * Create a pending employee application
     */
    async createPending(data: CreateEmployeeDto): Promise<User> {
        // Create user with pending status
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: data.passwordHash,
                status: 'pending',
                appliedDate: new Date(),
                // Store role/department info
            },
        })

        // Also create an EmployeeProfile if needed
        await this.prisma.employeeProfile.create({
            data: {
                userId: user.id,
                jobTitle: data.role,
                baseSalary: data.salary,
                // We could map department too if we had the ID
            },
        })

        return user
    }

    /**
     * Approve a pending employee
     */
    async approve(id: string): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                status: 'active',
                isApproved: true,
            },
        })

        // Auto-add to General channel if it exists
        try {
            const generalChannel = await this.prisma.conversation.findFirst({
                where: { name: 'General', type: 'group' }
            })

            if (generalChannel) {
                await this.prisma.participant.upsert({
                    where: {
                        conversationId_userId: {
                            conversationId: generalChannel.id,
                            userId: user.id
                        }
                    },
                    update: {},
                    create: {
                        conversationId: generalChannel.id,
                        userId: user.id
                    }
                })
            }
        } catch (err) {
            console.error('Failed to auto-add user to General channel:', err)
        }

        return user
    }

    /**
     * Reject a pending employee
     */
    async reject(id: string): Promise<User> {
        // We could just delete them or mark as rejected. 
        // For now, let's delete to keep the DB clean, or update status to 'rejected'
        return this.prisma.user.update({
            where: { id },
            data: {
                status: 'rejected',
            },
        })
    }
}
