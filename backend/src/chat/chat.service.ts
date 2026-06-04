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
        const conversations = await this.prisma.conversation.findMany({
            where: {
                type: 'direct',
                AND: [
                    { participants: { some: { userId: user1Id } } },
                    { participants: { some: { userId: user2Id } } },
                ],
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
     * Get all conversations for a user (with unread counts)
     */
    async getUserConversations(userId: string) {
        const conversations = await this.prisma.conversation.findMany({
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

        const unreadCounts = await this.getUnreadCountsByConversation(conversations, userId)

        return conversations.map((conv) => ({
            ...conv,
            unreadCount: unreadCounts.get(conv.id) || 0,
        }))
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
        const [message, conversation] = await this.prisma.$transaction([
            this.prisma.message.create({
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
            }),
            this.prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
                select: {
                    participants: {
                        select: {
                            userId: true,
                        },
                    },
                },
            }),
        ])

        return {
            message,
            participantIds: conversation.participants.map((participant) => participant.userId),
        }
    }

    /**
     * Mark conversation as read for a user. Returns the updated lastReadAt timestamp.
     */
    async markAsRead(conversationId: string, userId: string): Promise<Date | null> {
        const now = new Date()
        const result = await this.prisma.participant.updateMany({
            where: { conversationId, userId },
            data: { lastReadAt: now },
        })

        return result.count > 0 ? now : null
    }

    /**
     * Check if user is a participant of a conversation
     */
    async isParticipant(conversationId: string, userId: string): Promise<boolean> {
        const participant = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId,
                },
            },
            select: { id: true },
        })
        return Boolean(participant)
    }

    /**
     * Delete a message
     * Only sender or admin can delete
     */
    async deleteMessage(messageId: string, userId: string): Promise<Message | null> {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            select: { id: true, senderId: true },
        })

        if (!message) return null

        if (message.senderId !== userId) {
            return null
        }

        return this.prisma.message.delete({
            where: { id: messageId }
        })
    }

    /**
     * Edit a message (sender only)
     */
    async editMessage(messageId: string, userId: string, content: string): Promise<Message | null> {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
        })

        if (!message || message.senderId !== userId) return null

        return this.prisma.message.update({
            where: { id: messageId },
            data: { content, editedAt: new Date() },
        })
    }

    /**
     * Search messages across user's conversations
     */
    async searchMessages(userId: string, query: string, limit = 20) {
        return this.prisma.message.findMany({
            where: {
                content: { contains: query, mode: 'insensitive' },
                conversation: {
                    participants: { some: { userId } },
                },
            },
            include: {
                sender: { select: { id: true, name: true, avatar: true, email: true } },
                conversation: { select: { id: true, name: true, type: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })
    }

    /**
     * Leave/Delete a conversation for a user
     * Removes the participant entry.
     */
    async leaveConversation(conversationId: string, userId: string) {
        // Find participant record
        const participant = await this.prisma.participant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        })

        if (!participant) return false

        // Remove participant
        await this.prisma.participant.delete({
            where: { id: participant.id }
        })

        // Cleanup: If conversation has 0 participants, delete it?
        // Or specific logic for direct messages?
        // For now, let's keep it simple. If valid participants remain, they keep the history.
        return true
    }

    /**
     * Get total unread messages count across all conversations
     */
    async getUnreadCount(userId: string): Promise<number> {
        const participants = await this.prisma.participant.findMany({
            where: { userId },
            select: { conversationId: true, lastReadAt: true }
        });

        if (participants.length === 0) return 0;

        const unreadCounts = await this.getUnreadCountsByParticipantReadState(participants, userId)

        return Array.from(unreadCounts.values()).reduce((total, count) => total + count, 0);
    }

    private async getUnreadCountsByConversation(
        conversations: Array<{ id: string; participants: Array<{ userId: string; lastReadAt: Date }> }>,
        userId: string,
    ): Promise<Map<string, number>> {
        const participantReadState = conversations.flatMap((conversation) => {
            const participant = conversation.participants.find((item) => item.userId === userId)
            return participant
                ? [{ conversationId: conversation.id, lastReadAt: participant.lastReadAt }]
                : []
        })

        return this.getUnreadCountsByParticipantReadState(participantReadState, userId)
    }

    private async getUnreadCountsByParticipantReadState(
        participantReadState: Array<{ conversationId: string; lastReadAt: Date }>,
        userId: string,
    ): Promise<Map<string, number>> {
        if (participantReadState.length === 0) return new Map()

        const unreadFilters = participantReadState.map((participant) => ({
            conversationId: participant.conversationId,
            createdAt: { gt: participant.lastReadAt },
            senderId: { not: userId },
        }))

        const unreadCounts = await this.prisma.message.groupBy({
            by: ['conversationId'],
            where: { OR: unreadFilters },
            _count: { _all: true },
        })

        return new Map(
            unreadCounts.map((item) => [item.conversationId, item._count._all]),
        )
    }
}
