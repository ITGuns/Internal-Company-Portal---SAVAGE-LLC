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
    shiftNotes?: string
    logType?: string
}

export interface UpdateDailyLogDto {
    content?: string
    department?: string
    status?: string
    hoursLogged?: number
    tasks?: any[]
    shiftNotes?: string
    logType?: string
}

export class DailyLogsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll(department?: string, status?: string, logType?: string) {
        const where: any = {}

        if (department) {
            where.department = department
        }

        if (status) {
            where.status = status
        }

        if (logType) {
            where.logType = logType
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
                ...(data.tasks && { tasks: data.tasks }),
                ...('shiftNotes' in data && { shiftNotes: data.shiftNotes ?? null }),
                ...(data.logType && { logType: data.logType })
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

