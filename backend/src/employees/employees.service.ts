import crypto from 'node:crypto'
import { PrismaClient, User } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import {
    MissingSignupRoleAssignmentError,
    buildPendingSignupProfile,
    getApprovedRoleAssignment,
} from '../auth/signup.requests'
import { createLogger } from '../observability/logger'
import { isInternalEmployeeAccount } from './employees.security'

const logger = createLogger('employees.service')
const APPROVED_EMPLOYEE_SETUP_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export interface CreateEmployeeDto {
    email: string
    name: string
    role: string
    department: string
    salary: number
    passwordHash?: string
    avatar?: string
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
                employeeProfile: true,
                roles: {
                    include: {
                        department: true,
                    },
                },
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
        const accounts = await this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave', 'verified'],
                },
            },
            include: {
                employeeProfile: true,
                roles: {
                    include: {
                        department: true,
                    },
                },
                clientMemberships: {
                    select: {
                        status: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        })
        const users = accounts.filter(isInternalEmployeeAccount)

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
            performance: null,
        }))
    }

    /**
     * Create a pending employee application
     */
    async createPending(data: CreateEmployeeDto): Promise<User> {
        const department = data.department
            ? await this.prisma.department.findFirst({
                where: {
                    name: {
                        equals: data.department,
                        mode: 'insensitive',
                    },
                },
            })
            : null

        // Create user with pending status
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: data.passwordHash,
                status: 'pending',
                appliedDate: new Date(),
                avatar: data.avatar,
                // Store role/department info
            },
        })

        // Also create an EmployeeProfile if needed
        await this.prisma.employeeProfile.create({
            data: {
                userId: user.id,
                ...buildPendingSignupProfile({
                    role: data.role,
                    departmentId: department?.id || null,
                }),
                baseSalary: data.salary,
                // We could map department too if we had the ID
            },
        })

        return user
    }

    /**
     * Approve a pending employee
     */
    async approve(id: string): Promise<{
        user: User
        onboarding: {
            setupUrl: string
            expiresAt: Date
        }
    }> {
        const setupToken = crypto.randomBytes(32).toString('hex')
        const hashedSetupToken = crypto.createHash('sha256').update(setupToken).digest('hex')
        const setupExpiresAt = new Date(Date.now() + APPROVED_EMPLOYEE_SETUP_TOKEN_EXPIRY_MS)

        const user = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.user.findUniqueOrThrow({
                where: { id },
                include: {
                    employeeProfile: true,
                    roles: {
                        include: {
                            department: true,
                        },
                    },
                },
            })

            const existingAssignment = existing.roles.find((role) => role.role?.trim() && role.departmentId)
            const assignment = getApprovedRoleAssignment(existing.employeeProfile) ?? (
                existingAssignment
                    ? { role: existingAssignment.role, departmentId: existingAssignment.departmentId as string }
                    : null
            )

            if (!assignment) {
                throw new MissingSignupRoleAssignmentError()
            }

            const updated = await tx.user.update({
                where: { id },
                data: {
                    status: 'verified',
                    isApproved: true,
                    passwordResetToken: hashedSetupToken,
                    passwordResetExpiry: setupExpiresAt,
                },
                include: {
                    employeeProfile: true,
                    roles: {
                        include: {
                            department: true,
                        },
                    },
                },
            })

            await tx.userRole.upsert({
                where: {
                    userId_departmentId_role: {
                        userId: updated.id,
                        departmentId: assignment.departmentId,
                        role: assignment.role,
                    },
                },
                update: {},
                create: {
                    userId: updated.id,
                    departmentId: assignment.departmentId,
                    role: assignment.role,
                },
            })

            return tx.user.findUniqueOrThrow({
                where: { id: updated.id },
                include: {
                    employeeProfile: true,
                    roles: {
                        include: {
                            department: true,
                        },
                    },
                },
            })
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
            logger.error('Failed to auto-add user to General channel', err)
        }

        const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${setupToken}&email=${encodeURIComponent(user.email)}`

        return {
            user,
            onboarding: {
                setupUrl,
                expiresAt: setupExpiresAt,
            },
        }
    }

    /**
     * Reject a pending employee
     */
    async reject(id: string): Promise<User> {
        // We could just delete them or mark as rejected. 
        // For now, let's delete to keep the DB clean, or update status to 'rejected'
        return this.prisma.user.delete({
            where: { id },
        })
    }
}
