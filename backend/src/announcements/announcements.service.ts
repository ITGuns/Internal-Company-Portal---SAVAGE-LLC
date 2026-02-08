import { PrismaClient, Announcement } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { notificationService } from '../notifications/socket.service'

export interface CreateAnnouncementDto {
    title: string
    content: string
    priority?: string
    authorId?: string
}

export class AnnouncementsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll() {
        return this.prisma.announcement.findMany({
            include: {
                author: {
                    select: { id: true, name: true, avatar: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
    }

    async create(data: CreateAnnouncementDto) {
        const announcement = await this.prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                priority: data.priority || 'Normal',
                authorId: data.authorId
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        })

        // Broadcast notification
        notificationService.broadcast({
            type: 'info',
            title: `New Announcement: ${announcement.title}`,
            message: announcement.priority === 'High' ? `IMPORTANT: ${announcement.title}` : 'Check the dashboard for details.',
            link: '/announcements'
        })

        return announcement
    }

    async delete(id: string) {
        return this.prisma.announcement.delete({
            where: { id }
        })
    }
}
