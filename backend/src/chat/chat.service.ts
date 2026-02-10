import { PrismaClient, Conversation, Message, Participant, User } from '@prisma/client'
import { prisma } from '../database/prisma.service'

export class ChatService {
    private prisma: PrismaClient

    constructor() {
        this.prisma = prisma
    }

    /**
     * Create a new conversation (Direct, Group, or Channel)
     */
    async createConversation(type: string, participantIds: string[], name?: string) {
        // For direct messages, check if conversation already exists
        if (type === 'direct' && participantIds.length === 2) {
            const existing = await this.findDirectConversation(participantIds[0], participantIds[1])
            if (existing) return existing
        }

        // Special handling for Global/General channels in dev
        if (name === 'General' || name === 'Global') {
            const allUsers = await this.prisma.user.findMany({ select: { id: true } })
            participantIds = Array.from(new Set([...participantIds, ...allUsers.map(u => u.id)]))
        }

        return this.prisma.conversation.create({
            data: {
                type,
                name,
                participants: {
                    create: participantIds.map((id) => ({
                        userId: id,
                    })),
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        })
    }

    /**
     * Find existing direct conversation between two users
     */
    async findDirectConversation(user1Id: string, user2Id: string) {
        // Find conversations where both users are participants and type is 'direct'
        // This is a bit complex in Prisma, simplified approach:
        const conversations = await this.prisma.conversation.findMany({
            where: {
                type: 'direct',
                participants: {
                    every: {
                        userId: { in: [user1Id, user2Id] },
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        })

        // Filter to ensure exact match (both users present)
        return conversations.find(c => c.participants.length === 2 &&
            c.participants.some(p => p.userId === user1Id) &&
            c.participants.some(p => p.userId === user2Id))
    }

    /**
     * Get all conversations for a user
     */
    async getUserConversations(userId: string) {
        return this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })
    }

    /**
   * Get conversation by ID with participants
   */
    async getConversationById(conversationId: string) {
        return this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        })
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: string, limit = 50, cursor?: string) {
        return this.prisma.message.findMany({
            where: {
                conversationId,
            },
            take: limit,
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: {
                createdAt: 'desc', // Valid for pagination, likely need to reverse in UI or backend
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        email: true,
                    },
                },
            },
        })
    }

    /**
     * Add a message to a conversation
     */
    async sendMessage(conversationId: string, senderId: string, content: string, attachment?: string) {
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                senderId,
                content,
                attachment,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        email: true,
                    },
                },
            },
        })

        // Update conversation updatedAt
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        })

        return message
    }

    /**
     * Mark conversation as read for a user
     */
    async markAsRead(conversationId: string, userId: string) {
        // Find the participant entry
        const participant = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
        })

        if (participant) {
            await this.prisma.participant.update({
                where: { id: participant.id },
                data: { lastReadAt: new Date() },
            })
        }
    }

    /**
     * Check if user is a participant of a conversation
     */
    async isParticipant(conversationId: string, userId: string): Promise<boolean> {
        const count = await this.prisma.participant.count({
            where: {
                conversationId,
                userId,
            },
        })
        return count > 0
    }
}
