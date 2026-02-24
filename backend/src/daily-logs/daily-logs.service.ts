import { PrismaClient, DailyLog } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateDailyLogDto {
    content: string
    date?: string
    authorId: string
    department: string
    status?: string
    hoursLogged?: number
    tasks?: any[] // Array of {id, text, completed}
}

export interface UpdateDailyLogDto {
    content?: string
    department?: string
    status?: string
    hoursLogged?: number
    tasks?: any[]
}

export class DailyLogsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll(department?: string, status?: string) {
        const where: any = {}

        if (department) {
            where.department = department
        }

        if (status) {
            where.status = status
        }

        return this.prisma.dailyLog.findMany({
            where,
            include: {
                author: {
                    select: { id: true, name: true, avatar: true, email: true }
                },
                likes: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        })
    }

    async findByAuthor(authorId: string) {
        return this.prisma.dailyLog.findMany({
            where: { authorId },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        })
    }

    async findById(id: string) {
        return this.prisma.dailyLog.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            }
        })
    }

    async create(data: CreateDailyLogDto) {
        return this.prisma.dailyLog.create({
            data: {
                content: data.content,
                date: data.date ? new Date(data.date) : new Date(),
                authorId: data.authorId,
                department: data.department,
                status: data.status || 'in-progress',
                hoursLogged: data.hoursLogged || 0,
                tasks: data.tasks || []
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true
            }
        })
    }

    async delete(id: string) {
        return this.prisma.dailyLog.delete({
            where: { id }
        })
    }

    async update(id: string, data: UpdateDailyLogDto) {
        return this.prisma.dailyLog.update({
            where: { id },
            data: {
                ...(data.content && { content: data.content }),
                ...(data.department && { department: data.department }),
                ...(data.status && { status: data.status }),
                ...(data.hoursLogged !== undefined && { hoursLogged: data.hoursLogged }),
                ...(data.tasks && { tasks: data.tasks })
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true
            }
        })
    }

    // Like functionality
    async toggleLike(dailyLogId: string, userId: string) {
        const existing = await this.prisma.dailyLogLike.findUnique({
            where: {
                dailyLogId_userId: {
                    dailyLogId,
                    userId
                }
            }
        })

        if (existing) {
            // Unlike
            await this.prisma.dailyLogLike.delete({
                where: { id: existing.id }
            })
            return { liked: false }
        } else {
            // Like
            await this.prisma.dailyLogLike.create({
                data: {
                    dailyLogId,
                    userId
                }
            })
            return { liked: true }
        }
    }
}

