import { PrismaClient, DailyLog } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export interface CreateDailyLogDto {
    content: string
    date?: string
    authorId: string
}

export class DailyLogsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll() {
        return this.prisma.dailyLog.findMany({
            include: {
                author: {
                    select: { id: true, name: true, avatar: true, email: true }
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
                }
            },
            orderBy: { date: 'desc' }
        })
    }

    async create(data: CreateDailyLogDto) {
        return this.prisma.dailyLog.create({
            data: {
                content: data.content,
                date: data.date ? new Date(data.date) : new Date(),
                authorId: data.authorId
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        })
    }

    async delete(id: string) {
        return this.prisma.dailyLog.delete({
            where: { id }
        })
    }

    async update(id: string, content: string) {
        return this.prisma.dailyLog.update({
            where: { id },
            data: { content },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        })
    }
}
