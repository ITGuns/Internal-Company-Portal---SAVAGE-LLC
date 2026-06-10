import crypto from 'node:crypto'
import { PrismaClient, User, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import {
    findMergedSignupRoleById,
    isDefaultSignupRoleId,
    type SignupRoleOption,
} from '../auth/signup-role-options'

const ONBOARDING_SETUP_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

const directoryUserSelect = {
    id: true,
    email: true,
    name: true,
    avatar: true,
    managerId: true,
    status: true,
    isApproved: true,
    createdAt: true,
    updatedAt: true,
    roles: {
        select: {
            id: true,
            role: true,
            departmentId: true,
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
    employeeProfile: {
      select: {
        jobTitle: true,
        employmentType: true,
      },
    },
    manager: {
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
        },
    },
} satisfies Prisma.UserSelect

type DirectoryUser = Prisma.UserGetPayload<{ select: typeof directoryUserSelect }>

export interface CreateUserDto {
    email: string
    name?: string
    avatar?: string
}

export interface CreateUserOnboardingInvitationDto {
    email: string
    roleId: string
}

export class UserOnboardingValidationError extends Error {}
export class UserOnboardingConflictError extends Error {}

export interface UpdateUserDto {
    name?: string
    avatar?: string
    email?: string       // Recovery/Primary email
    birthday?: string    // ISO date string (YYYY-MM-DD)
    phone?: string       // Phone number with country code
    address?: string     // Street address
    city?: string        // City name
    citizenship?: string // Country of citizenship
    status?: string      // active, pending, vacation, leave
    appliedDate?: string // ISO date string
    isApproved?: boolean
    managerId?: string | null
}

export class UsersService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    private async resolveOnboardingRole(roleId: string): Promise<SignupRoleOption | null> {
        const configuredRole = await this.prisma.availableRole.findUnique({
            where: { id: roleId },
            include: { department: true },
        })

        if (configuredRole) return configuredRole
        if (!isDefaultSignupRoleId(roleId)) return null

        const departments = await this.prisma.department.findMany({
            include: { availableRoles: true },
        })

        return findMergedSignupRoleById(departments, roleId)
    }

    /**
     * Get all users (with optional pagination)
     */
    async findAll(page?: number, limit?: number): Promise<DirectoryUser[] | {
        data: DirectoryUser[]
        total: number
        page: number
        limit: number
        totalPages: number
    }> {
        const where = {
            status: {
                in: ['active', 'vacation', 'leave', 'verified'] as string[],
            },
        }

        const orderBy = { createdAt: 'desc' as const }

        if (page !== undefined && limit !== undefined) {
            const [data, total] = await Promise.all([
                this.prisma.user.findMany({
                    where,
                    select: directoryUserSelect,
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.prisma.user.count({ where }),
            ])
            return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
        }

        return this.prisma.user.findMany({
            where,
            select: directoryUserSelect,
            orderBy,
        })
    }

    /**
     * Get user by ID
     */
    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        department: true,
                    },
                },
                employeeProfile: true,
            },
        })
    }

    /**
     * Get user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        department: true,
                    },
                },
                employeeProfile: true,
            },
        })
    }

    /**
     * Create new user
     */
    async create(data: CreateUserDto): Promise<User> {
        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                avatar: data.avatar,
            },
        })
    }

    async createOnboardingInvitation(data: CreateUserOnboardingInvitationDto) {
        const normalizedEmail = data.email.trim().toLowerCase()
        const role = await this.resolveOnboardingRole(data.roleId)

        if (!role) {
            throw new UserOnboardingValidationError('Invalid onboarding role')
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, password: true },
        })

        if (existingUser?.password) {
            throw new UserOnboardingConflictError('This user already has login access. Use password reset instead.')
        }

        const setupToken = crypto.randomBytes(32).toString('hex')
        const hashedSetupToken = crypto.createHash('sha256').update(setupToken).digest('hex')
        const setupExpiresAt = new Date(Date.now() + ONBOARDING_SETUP_TOKEN_EXPIRY_MS)
        const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${setupToken}&email=${encodeURIComponent(normalizedEmail)}`
        const fallbackName = normalizedEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || normalizedEmail

        const user = await this.prisma.$transaction(async (tx) => {
            const savedUser = existingUser
                ? await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        status: 'verified',
                        isApproved: true,
                        passwordResetToken: hashedSetupToken,
                        passwordResetExpiry: setupExpiresAt,
                    },
                })
                : await tx.user.create({
                    data: {
                        email: normalizedEmail,
                        name: fallbackName,
                        status: 'verified',
                        isApproved: true,
                        passwordResetToken: hashedSetupToken,
                        passwordResetExpiry: setupExpiresAt,
                    },
                })

            await tx.employeeProfile.upsert({
                where: { userId: savedUser.id },
                update: {
                    requestedRole: role.name,
                    requestedDepartmentId: role.departmentId,
                    jobTitle: role.name,
                },
                create: {
                    userId: savedUser.id,
                    requestedRole: role.name,
                    requestedDepartmentId: role.departmentId,
                    jobTitle: role.name,
                },
            })

            const existingAssignment = await tx.userRole.findFirst({
                where: {
                    userId: savedUser.id,
                    role: role.name,
                    departmentId: role.departmentId,
                },
            })

            if (!existingAssignment) {
                await tx.userRole.create({
                    data: {
                        userId: savedUser.id,
                        role: role.name,
                        ...(role.departmentId ? { departmentId: role.departmentId } : {}),
                    },
                })
            }

            return tx.user.findUniqueOrThrow({
                where: { id: savedUser.id },
                include: {
                    roles: {
                        include: { department: true },
                    },
                    employeeProfile: true,
                },
            })
        })

        return {
            user,
            onboarding: {
                setupUrl,
                expiresAt: setupExpiresAt,
                role: {
                    id: role.id,
                    name: role.name,
                    departmentId: role.departmentId,
                    department: role.department ? { id: role.department.id, name: role.department.name } : null,
                },
            },
        }
    }

    /**
     * Update user profile
     * Supports: name, avatar, birthday, phone, address, city, citizenship
     */
    async update(id: string, data: UpdateUserDto): Promise<User> {
        // Prepare update data
        const updateData: Prisma.UserUpdateInput = {}

        if (data.name !== undefined) updateData.name = data.name
        if (data.email !== undefined) updateData.email = data.email
        if (data.avatar !== undefined) updateData.avatar = data.avatar
        if (data.phone !== undefined) updateData.phone = data.phone
        if (data.address !== undefined) updateData.address = data.address
        if (data.city !== undefined) updateData.city = data.city
        if (data.citizenship !== undefined) updateData.citizenship = data.citizenship
        if (data.status !== undefined) updateData.status = data.status
        if (data.isApproved !== undefined) updateData.isApproved = data.isApproved
        if (data.managerId !== undefined) {
            updateData.manager = data.managerId ? { connect: { id: data.managerId } } : { disconnect: true }
        }

        // Handle date conversions
        if (data.birthday !== undefined) {
            updateData.birthday = data.birthday ? new Date(data.birthday) : null
        }
        if (data.appliedDate !== undefined) {
            updateData.appliedDate = data.appliedDate ? new Date(data.appliedDate) : null
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
        })
    }

    async wouldCreateManagerCycle(userId: string, managerId: string): Promise<boolean> {
        if (userId === managerId) return true

        const visited = new Set<string>([userId])
        let currentManagerId: string | null | undefined = managerId

        while (currentManagerId) {
            if (visited.has(currentManagerId)) return true
            visited.add(currentManagerId)

            const manager = await this.prisma.user.findUnique({
                where: { id: currentManagerId },
                select: { managerId: true },
            })
            currentManagerId = manager?.managerId
        }

        return false
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<User> {
        return this.prisma.user.delete({
            where: { id },
        })
    }

    /**
     * Get user's roles
     */
    async getUserRoles(userId: string) {
        return this.prisma.userRole.findMany({
            where: { userId },
            include: {
                department: true,
            },
        })
    }

    /**
     * Get user's tasks
     */
    async getUserTasks(userId: string) {
        return this.prisma.task.findMany({
            where: { assigneeId: userId },
            include: {
                department: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    }

    /**
     * Search users by name or email
     */
    async search(query: string): Promise<DirectoryUser[]> {
        return this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave', 'verified'],
                },
                OR: [
                    { email: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: directoryUserSelect,
        })
    }

    /**
     * Assign role to user
     */
    async assignRole(userId: string, role: string, departmentId?: string) {
        // Check if role exists for user
        const existing = await this.prisma.userRole.findFirst({
            where: {
                userId,
                role,
                departmentId: departmentId || null
            }
        })

        if (existing) return existing

        return this.prisma.userRole.create({
            data: {
                userId,
                role,
                departmentId
            }
        })
    }

    /**
     * Remove role from user
     */
    async removeRole(userId: string, role: string, departmentId?: string) {
        return this.prisma.userRole.deleteMany({
            where: {
                userId,
                role,
                departmentId: departmentId || null
            }
        })
    }
}
