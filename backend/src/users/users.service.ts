import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { PrismaClient, User, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import { hasFullAccess } from '../org/org-access-policy'
import { revokeAllRefreshSessionsForUser } from '../auth/refresh-session.service'
import { clearAccountStatusCache } from '../auth/account-status'
import { payrollOptionsService } from '../payroll/payroll-options.service'
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

/** Refusal from resetMemberPassword. httpStatus is the status the route answers with. */
export class MemberPasswordResetError extends Error {
    constructor(readonly httpStatus: 400 | 403 | 404, message: string) {
        super(message)
    }
}

/** Same bcrypt cost as signup and POST /auth/reset-password in auth.controller.ts. */
const PASSWORD_HASH_ROUNDS = 10
const PASSWORD_MIN_LENGTH = 8
/** bcrypt ignores everything past 72 bytes. */
const PASSWORD_MAX_LENGTH = 72

/**
 * Rules for a password an administrator sets for a member: the signup and
 * POST /auth/reset-password rules (length, an uppercase letter, a number),
 * the bcrypt length cap, and never the member's own email address.
 * Returns the refusal message, or null when the password is acceptable.
 */
export function memberPasswordError(password: unknown, email: string): string | null {
    if (typeof password !== 'string' || password.length === 0) return 'New password is required'
    if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    if (password.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters`
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/\d/.test(password)) return 'Password must contain at least one number'
    if (password.toLowerCase() === email.toLowerCase()) return 'Password must not be the same as the email address'
    return null
}

/**
 * Statuses PATCH /users/:id may set (2026-10-28): the working states of an
 * approved member. 'pending' blocks sign-in and belongs to the approval flow
 * (POST /employees/approve/:id); 'inactive' belongs to POST /:id/deactivate
 * and /:id/reactivate, which carry the full-access target guard.
 */
export const PATCHABLE_MEMBER_STATUSES: readonly string[] = ['active', 'verified', 'vacation', 'leave']

/**
 * Why PATCH /users/:id refuses a status change, or null when it may be saved.
 * Sending the current status is always fine (the edit dialog sends the form).
 */
export function memberStatusPatchError(requested: unknown, currentStatus: string | null | undefined): string | null {
    if (typeof requested !== 'string') return 'Status must be a string'
    if (requested === currentStatus) return null
    if (requested === 'inactive') return 'Use deactivate to make a member inactive'
    if (!PATCHABLE_MEMBER_STATUSES.includes(requested)) {
        return `Status must be one of: ${PATCHABLE_MEMBER_STATUSES.join(', ')}`
    }
    if (currentStatus === 'inactive') return 'Reactivate the member before changing their status'
    if (!PATCHABLE_MEMBER_STATUSES.includes(currentStatus ?? '')) {
        return 'Approve the member before changing their status'
    }
    return null
}

/**
 * Records a hard delete would cascade away with the member (review fix
 * 2026-10-28). DELETE /users/:id refuses while any exist; deactivation keeps them.
 */
export interface KeptMemberRecords {
    payslips: number
    /** PayrollRosterSnapshot rows (employee history). */
    historyRows: number
    /** Concerns the member raised, was assigned or replied to. */
    concerns: number
}

/** The 409 message for a hard delete with records to keep, or null when nothing stands in the way. */
export function keptRecordsRefusal(kept: KeptMemberRecords): string | null {
    const found = [
        kept.payslips > 0 ? 'payslips' : null,
        kept.historyRows > 0 ? 'employee history' : null,
        kept.concerns > 0 ? 'concerns' : null,
    ].filter((label): label is string => label !== null)
    if (found.length === 0) return null
    const list = found.length === 1 ? found[0] : `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`
    return `This member has ${list}, so their records must be kept. Deactivate them instead.`
}

export interface ResetMemberPasswordInput {
    requesterId: string
    requesterEmail?: string
    targetId: string
    newPassword: unknown
}

export interface UpdateUserDto {
    name?: string
    avatar?: string | null // null removes the photo (DELETE /users/:id/avatar)
    email?: string       // Recovery/Primary email
    birthday?: string    // ISO date string (YYYY-MM-DD)
    phone?: string       // Phone number with country code
    address?: string     // Street address
    city?: string        // City name
    citizenship?: string // Country of citizenship
    status?: string      // PATCH /users/:id: active, verified, vacation, leave (memberStatusPatchError)
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
        // setup=1: onboarding refuses a user who already has a password (above),
        // so this is always a first-time setup - the page words it as one.
        const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${setupToken}&email=${encodeURIComponent(normalizedEmail)}&setup=1`
        const fallbackName = normalizedEmail.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || normalizedEmail
        // Default payroll scheme and options for a new profile; read outside the transaction.
        const payrollDefaults = await payrollOptionsService.newProfileDefaults()

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
                    ...payrollDefaults,
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
     * Deactivate or reactivate a member (payroll v2, Rule 6). Deactivation keeps
     * all data, blocks sign-in and revokes refresh sessions.
     */
    async setActivation(id: string, active: boolean): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: { status: active ? 'active' : 'inactive' },
        })
        if (!active) await revokeAllRefreshSessionsForUser(id)
        clearAccountStatusCache(id)
        return user
    }

    /**
     * Administrator sets a new password for a member (POST /users/:id/reset-password).
     * Production has no email, so Forgot password sends members to an administrator.
     * Same guard as deactivate: never your own account, and only a full-access
     * requester may change a full-access account. Any pending reset or setup link
     * stops working and every refresh session of the member is revoked.
     */
    async resetMemberPassword(input: ResetMemberPasswordInput): Promise<{ revokedSessions: number }> {
        if (input.requesterId === input.targetId) {
            throw new MemberPasswordResetError(400, 'You cannot reset your own password here. Ask another administrator.')
        }

        const target = await this.prisma.user.findUnique({
            where: { id: input.targetId },
            select: { id: true, email: true },
        })
        if (!target) throw new MemberPasswordResetError(404, 'User not found')

        const [targetRoles, requesterRoles] = await Promise.all([
            this.getUserRoles(target.id),
            this.getUserRoles(input.requesterId),
        ])
        const targetIsAdmin = hasFullAccess(targetRoles, isAdminEmail(target.email))
        if (targetIsAdmin && !hasFullAccess(requesterRoles, isAdminEmail(input.requesterEmail))) {
            throw new MemberPasswordResetError(403, 'Only an administrator can change this account')
        }

        const refusal = memberPasswordError(input.newPassword, target.email)
        if (refusal) throw new MemberPasswordResetError(400, refusal)

        // memberPasswordError returned null, so newPassword is a string.
        const password = await bcrypt.hash(input.newPassword as string, PASSWORD_HASH_ROUNDS)
        await this.prisma.user.update({
            where: { id: target.id },
            data: { password, passwordResetToken: null, passwordResetExpiry: null },
        })
        return { revokedSessions: await revokeAllRefreshSessionsForUser(target.id) }
    }

    /** What a hard delete would cascade away (payslips, employee history, concerns). */
    async countKeptRecords(userId: string): Promise<KeptMemberRecords> {
        const [payslips, historyRows, concerns] = await Promise.all([
            this.prisma.payslip.count({ where: { userId } }),
            this.prisma.payrollRosterSnapshot.count({ where: { userId } }),
            this.prisma.internalTicket.count({
                where: { OR: [{ requesterId: userId }, { assigneeId: userId }, { messages: { some: { authorId: userId } } }] },
            }),
        ])
        return { payslips, historyRows, concerns }
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
