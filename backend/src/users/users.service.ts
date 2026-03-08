import { PrismaClient, User } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateUserDto {
    email: string
    name?: string
    avatar?: string
}

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
}

export class UsersService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Get all users
     */
    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany({
            where: {
                status: {
                    in: ['active', 'vacation', 'leave', 'verified'],
                },
            },
            include: {
                roles: {
                    include: {
                        department: true,
                    },
                },
                tasks: true,
                employeeProfile: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
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
                tasks: {
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

    /**
     * Update user profile
     * Supports: name, avatar, birthday, phone, address, city, citizenship
     */
    async update(id: string, data: UpdateUserDto): Promise<User> {
        // Prepare update data
        const updateData: any = {}

        if (data.name !== undefined) updateData.name = data.name
        if (data.email !== undefined) updateData.email = data.email
        if (data.avatar !== undefined) updateData.avatar = data.avatar
        if (data.phone !== undefined) updateData.phone = data.phone
        if (data.address !== undefined) updateData.address = data.address
        if (data.city !== undefined) updateData.city = data.city
        if (data.citizenship !== undefined) updateData.citizenship = data.citizenship
        if (data.status !== undefined) updateData.status = data.status

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
    async search(query: string): Promise<User[]> {
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
