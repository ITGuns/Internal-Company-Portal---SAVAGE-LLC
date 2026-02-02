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
            include: {
                roles: {
                    include: {
                        department: true,
                    },
                },
                tasks: true,
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
     * Update user
     */
    async update(id: string, data: UpdateUserDto): Promise<User> {
        return this.prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                avatar: data.avatar,
            },
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
            },
        })
    }
}
