import { PrismaClient, DailyLog, Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateDailyLogDto {
    content: string
    date?: string
    authorId: string
    department: string
    status?: string
    hoursLogged?: number
    tasks?: Prisma.JsonArray // Array of {id, text, completed}
    shiftNotes?: string
    logType?: string
}

export interface UpdateDailyLogDto {
    content?: string
    date?: string
    department?: string
    status?: string
    hoursLogged?: number
    tasks?: Prisma.JsonArray
    shiftNotes?: string
    logType?: string
}

export class DailyLogsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll(department?: string, status?: string, logType?: string, page?: number, limit?: number) {
        const where: Prisma.DailyLogWhereInput = {}

        if (department) {
            where.department = department
        }

        if (status) {
            where.status = status
        }

        if (logType) {
            where.logType = logType
        }

        const include = {
            author: {
                select: { id: true, name: true, avatar: true, email: true }
            },
            likes: {
                include: {
                    user: {
                        select: { id: true, name: true, avatar: true }
                    }
                }
            },
            comments: {
                include: {
                    author: {
                        select: { id: true, name: true, avatar: true, email: true }
                    }
                },
                orderBy: { createdAt: 'asc' as const }
            }
        }

        const orderBy = { date: 'desc' as const }

        if (page !== undefined && limit !== undefined) {
            const [data, total] = await Promise.all([
                this.prisma.dailyLog.findMany({
                    where,
                    include,
                    orderBy,
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                this.prisma.dailyLog.count({ where }),
            ])
            return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
        }

        return this.prisma.dailyLog.findMany({
            where,
            include,
            orderBy,
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
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' as const }
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
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' as const }
                }
            }
        })
    }

    async create(data: CreateDailyLogDto) {
        // Parse the date correctly:
        // If sent as "YYYY-MM-DD" (plain date), construct as noon UTC to prevent
        // day-shift when users in UTC+8 and similar timezones submit.
        // If sent as full ISO string, use as-is.
        let logDate: Date
        if (data.date) {
            // Strip time part if present for plain dates
            const datePart = data.date.split('T')[0]
            // Store as noon UTC so local-date conversions don't drift a day
            logDate = new Date(`${datePart}T12:00:00.000Z`)
        } else {
            logDate = new Date()
        }

        return this.prisma.dailyLog.create({
            data: {
                content: data.content,
                date: logDate,
                authorId: data.authorId,
                department: data.department,
                status: data.status || 'in-progress',
                hoursLogged: data.hoursLogged || 0,
                tasks: data.tasks || [],
                shiftNotes: data.shiftNotes || null,
                logType: data.logType || 'daily'
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true,
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })
    }

    async delete(id: string) {
        return this.prisma.dailyLog.delete({
            where: { id }
        })
    }

    async update(id: string, data: UpdateDailyLogDto) {
        let logDate: Date | undefined
        if (data.date) {
            const datePart = data.date.split('T')[0]
            logDate = new Date(`${datePart}T12:00:00.000Z`)
        }

        return this.prisma.dailyLog.update({
            where: { id },
            data: {
                ...(data.content && { content: data.content }),
                ...(logDate && { date: logDate }),
                ...(data.department && { department: data.department }),
                ...(data.status && { status: data.status }),
                ...(data.hoursLogged !== undefined && { hoursLogged: data.hoursLogged }),
                ...(data.tasks && { tasks: data.tasks }),
                ...('shiftNotes' in data && { shiftNotes: data.shiftNotes ?? null }),
                ...(data.logType && { logType: data.logType })
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true,
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true, email: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
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

    async addComment(dailyLogId: string, authorId: string, text: string) {
        const dailyLog = await this.prisma.dailyLog.findUnique({
            where: { id: dailyLogId },
            select: { id: true },
        })

        if (!dailyLog) {
            throw new Error('Daily log not found')
        }

        return this.prisma.dailyLogComment.create({
            data: {
                dailyLogId,
                authorId,
                text,
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true, email: true },
                },
            },
        })
    }

    async deleteComment(dailyLogId: string, commentId: string, userId: string) {
        const comment = await this.prisma.dailyLogComment.findUnique({
            where: { id: commentId },
        })

        if (!comment || comment.dailyLogId !== dailyLogId) {
            throw new Error('Comment not found')
        }

        if (comment.authorId !== userId) {
            throw new Error('Unauthorized to delete this comment')
        }

        return this.prisma.dailyLogComment.delete({
            where: { id: commentId },
        })
    }
}

