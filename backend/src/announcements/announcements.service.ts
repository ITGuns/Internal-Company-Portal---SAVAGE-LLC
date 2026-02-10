import { PrismaClient, Announcement } from '@prisma/client'
import { prisma } from '../database/prisma.service'
import { notificationService } from '../notifications/socket.service'

export interface CreateAnnouncementDto {
    title: string
    content: string
    category?: string
    priority?: string
    isImportant?: boolean
    authorId?: string
    eventDate?: string
    eventLocation?: string
    birthdayDate?: string
}

export interface UpdateAnnouncementDto {
    title?: string
    content?: string
    category?: string
    priority?: string
    isImportant?: boolean
    eventDate?: string
    eventLocation?: string
    birthdayDate?: string
}

export class AnnouncementsService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    async findAll(category?: string, important?: boolean) {
        const where: any = {}

        if (category) {
            where.category = category
        }

        if (important !== undefined) {
            where.isImportant = important
        }

        return this.prisma.announcement.findMany({
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
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                rsvps: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            },
            orderBy: [
                { isImportant: 'desc' },
                { createdAt: 'desc' }
            ]
        })
    }

    async findById(id: string) {
        return this.prisma.announcement.findUnique({
            where: { id },
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
                },
                comments: {
                    include: {
                        author: {
                            select: { id: true, name: true, avatar: true }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                },
                rsvps: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true }
                        }
                    }
                }
            }
        })
    }

    async create(data: CreateAnnouncementDto) {
        const announcement = await this.prisma.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category || 'company-news',
                priority: data.priority || 'Normal',
                isImportant: data.isImportant || false,
                authorId: data.authorId,
                eventDate: data.eventDate ? new Date(data.eventDate) : null,
                eventLocation: data.eventLocation,
                birthdayDate: data.birthdayDate ? new Date(data.birthdayDate) : null
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true,
                comments: true,
                rsvps: true
            }
        })

        // Broadcast notification
        notificationService.broadcast({
            type: data.isImportant ? 'warning' : 'info',
            title: `New ${data.category === 'company-news' ? 'Announcement' : data.category === 'shoutouts' ? 'Shoutout' : data.category === 'events' ? 'Event' : 'Birthday'}: ${announcement.title}`,
            message: data.isImportant ? `IMPORTANT: ${announcement.title}` : 'Check the dashboard for details.',
            link: '/announcements'
        })

        return announcement
    }

    async update(id: string, data: UpdateAnnouncementDto) {
        return this.prisma.announcement.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.content && { content: data.content }),
                ...(data.category && { category: data.category }),
                ...(data.priority && { priority: data.priority }),
                ...(data.isImportant !== undefined && { isImportant: data.isImportant }),
                ...(data.eventDate && { eventDate: new Date(data.eventDate) }),
                ...(data.eventLocation && { eventLocation: data.eventLocation }),
                ...(data.birthdayDate && { birthdayDate: new Date(data.birthdayDate) })
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                },
                likes: true,
                comments: true,
                rsvps: true
            }
        })
    }

    async delete(id: string) {
        return this.prisma.announcement.delete({
            where: { id }
        })
    }

    // Like functionality
    async toggleLike(announcementId: string, userId: string) {
        const existing = await this.prisma.announcementLike.findUnique({
            where: {
                announcementId_userId: {
                    announcementId,
                    userId
                }
            }
        })

        if (existing) {
            // Unlike
            await this.prisma.announcementLike.delete({
                where: { id: existing.id }
            })
            return { liked: false }
        } else {
            // Like
            await this.prisma.announcementLike.create({
                data: {
                    announcementId,
                    userId
                }
            })
            return { liked: true }
        }
    }

    // Comment functionality
    async addComment(announcementId: string, authorId: string, text: string) {
        const comment = await this.prisma.announcementComment.create({
            data: {
                announcementId,
                authorId,
                text
            },
            include: {
                author: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        })

        // Notify announcement author
        const announcement = await this.prisma.announcement.findUnique({
            where: { id: announcementId },
            select: { authorId: true, title: true }
        })

        if (announcement?.authorId && announcement.authorId !== authorId) {
            notificationService.notifyUser(announcement.authorId, {
                type: 'info',
                title: 'New Comment',
                message: `Someone commented on your announcement: ${announcement.title}`,
                link: '/announcements'
            })
        }

        return comment
    }

    async deleteComment(commentId: string, userId: string) {
        const comment = await this.prisma.announcementComment.findUnique({
            where: { id: commentId }
        })

        if (!comment) {
            throw new Error('Comment not found')
        }

        if (comment.authorId !== userId) {
            throw new Error('Unauthorized to delete this comment')
        }

        return this.prisma.announcementComment.delete({
            where: { id: commentId }
        })
    }

    // RSVP functionality
    async toggleRSVP(announcementId: string, userId: string, status: string = 'going') {
        const existing = await this.prisma.announcementRSVP.findUnique({
            where: {
                announcementId_userId: {
                    announcementId,
                    userId
                }
            }
        })

        if (existing) {
            if (existing.status === status) {
                // Remove RSVP
                await this.prisma.announcementRSVP.delete({
                    where: { id: existing.id }
                })
                return { rsvp: null }
            } else {
                // Update RSVP status
                const updated = await this.prisma.announcementRSVP.update({
                    where: { id: existing.id },
                    data: { status }
                })
                return { rsvp: updated.status }
            }
        } else {
            // Create RSVP
            const rsvp = await this.prisma.announcementRSVP.create({
                data: {
                    announcementId,
                    userId,
                    status
                }
            })
            return { rsvp: rsvp.status }
        }
    }
}
