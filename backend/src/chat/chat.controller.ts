import express, { Request, Response, Router } from 'express'
import { ChatService } from './chat.service'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'
import { prisma } from '../database/prisma.service'
import { isAdminEmail } from '../config/env.config'
import { hasEmployeeManagementAccess } from '../employees/employees.security'
import { canCreateConversation } from './chat.permissions'
import {
    normalizeAttachment,
    normalizeChatCursor,
    normalizeChatLimit,
    normalizeConversationArchiveView,
    normalizeMessageContent,
    normalizeReactionEmoji,
    normalizeSearchQuery,
} from './chat.limits'
import { createLogger } from '../observability/logger'

const logger = createLogger('chat.chat.controller')


export class ChatController {
    private service = new ChatService()

    router(): Router {
        const router = express.Router()

        // Get all conversations for current user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore - user is added by middleware
                const userId = (req as AuthRequest).user.userId
                const archiveView = normalizeConversationArchiveView(req.query.view)
                const conversations = await this.service.getUserConversations(userId, archiveView)
                res.json(conversations)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to fetch conversations' })
            }
        })

        // Archive a conversation for the current user without deleting history
        router.post('/:id/archive', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                const participant = await this.service.setConversationArchived(conversationId, userId, true)

                if (!participant) {
                    return res.status(404).json({ error: 'Conversation not found or not a participant' })
                }

                res.json({ conversationId, archivedAt: participant.archivedAt })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to archive conversation' })
            }
        })

        // Restore an archived conversation for the current user
        router.post('/:id/unarchive', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                const participant = await this.service.setConversationArchived(conversationId, userId, false)

                if (!participant) {
                    return res.status(404).json({ error: 'Conversation not found or not a participant' })
                }

                res.json({ conversationId, archivedAt: null })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to restore conversation' })
            }
        })

        // Get total unread message count
        router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const count = await this.service.getUnreadCount(userId)
                res.json({ count })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to count unread messages' })
            }
        })

        // Search messages across user's conversations
        router.get('/search', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const query = normalizeSearchQuery(req.query.q)

                if (!query) {
                    return res.json([])
                }

                const results = await this.service.searchMessages(userId, query)
                res.json(results)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to search messages' })
            }
        })

        // Create a new conversation
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const { type, participantIds, name } = req.body // type: 'direct' | 'group' | 'channel'
                const requestedType = typeof type === 'string' ? type : 'direct'
                const requestedParticipants = Array.isArray(participantIds)
                    ? participantIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
                    : []

                // Ensure current user is in participants
                const allParticipants = Array.from(new Set([...requestedParticipants, userId]))

                if (allParticipants.length < 2) {
                    return res.status(400).json({ error: 'At least 2 participants required' })
                }

                if (requestedType === 'direct' && allParticipants.length !== 2) {
                    return res.status(400).json({ error: 'Direct conversations require exactly 2 participants' })
                }

                if (allParticipants.length > 50) {
                    return res.status(400).json({ error: 'Conversation cannot exceed 50 participants' })
                }

                const roles = await prisma.userRole.findMany({ where: { userId } })
                const isPrivileged = hasEmployeeManagementAccess(roles, isAdminEmail((req as AuthRequest).user?.email))
                if (!canCreateConversation(
                    { requesterId: userId, isPrivileged },
                    { type: requestedType, participantIds: allParticipants, name },
                )) {
                    return res.status(403).json({ error: 'Only authorized managers can create channels or company-wide conversations' })
                }

                const conversation = await this.service.createConversation(requestedType, allParticipants, name)

                // Notify participants
                conversation.participants.forEach((p: { userId: string }) => {
                    // Send notification
                    notificationService.notifyUser(p.userId, {
                        type: 'info',
                        title: 'New Conversation',
                        message: `You were added to a ${type} conversation`,
                        link: `/chat/${conversation.id}`
                    });
                    // Emit full conversation object to participant room for UI update
                    notificationService.emitToRoom(`user:${p.userId}`, 'chat:conversation_created', conversation);
                });

                res.status(201).json(conversation)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to create conversation' })
            }
        })

        // Get conversation messages
        router.get('/:id/messages', authenticateToken, async (req: Request, res: Response) => {
            try {
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const limit = normalizeChatLimit(req.query.limit)
                const cursor = normalizeChatCursor(req.query.cursor)

                // Verify user is participant of conversation (security)
                const isParticipant = await this.service.isParticipant(conversationId, userId)
                if (!isParticipant) {
                    return res.status(403).json({ error: 'Access denied' })
                }

                const messages = await this.service.getMessages(conversationId, limit, cursor)
                res.json(messages)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to fetch messages' })
            }
        })

        // Send a message
        router.post('/:id/messages', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const content = normalizeMessageContent(req.body?.content)
                const attachment = normalizeAttachment(req.body?.attachment)

                // Verify user is participant
                const isParticipant = await this.service.isParticipant(conversationId, userId)
                if (!isParticipant) {
                    return res.status(403).json({ error: 'Access denied' })
                }

                if (!content && !attachment) {
                    return res.status(400).json({ error: 'Content or attachment required' })
                }

                const { message, participantIds } = await this.service.sendMessage(conversationId, userId, content, attachment)

                // Broadcast to conversation room (real-time chat update)
                notificationService.emitToRoom(`conversation:${conversationId}`, 'chat:message', message);

                // Also notify offline/online users via user room (for push notifications/badges)
                participantIds.forEach((participantId) => {
                    if (participantId === userId) return

                    notificationService.emitToRoom(`user:${participantId}`, 'chat:message_notification', {
                        conversationId,
                        messageId: message.id,
                        senderId: userId,
                        createdAt: message.createdAt,
                    })
                    notificationService.notifyUser(participantId, {
                        type: 'info',
                        title: 'New Message',
                        message: `New message from ${message.sender.name || 'someone'}`,
                        link: `/chat/${conversationId}`,
                        id: message.id
                    });
                });

                res.status(201).json(message)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to send message' })
            }
        })

        // Mark as read
        router.post('/:id/read', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                const isParticipant = await this.service.isParticipant(conversationId, userId)
                if (!isParticipant) {
                    return res.status(403).json({ error: 'Access denied' })
                }

                const readAt = await this.service.markAsRead(conversationId, userId)

                // Broadcast read receipt to conversation participants
                if (readAt) {
                    notificationService.emitToRoom(`conversation:${conversationId}`, 'chat:read', {
                        conversationId,
                        userId,
                        readAt: readAt.toISOString(),
                    })
                }

                res.sendStatus(200)
            } catch (error) {
                res.status(500).json({ error: 'Failed to mark as read' })
            }
        })

        // Delete message
        router.post('/messages/:id/reactions', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const emoji = normalizeReactionEmoji(req.body?.emoji)

                if (!emoji) {
                    return res.status(400).json({ error: 'Unsupported reaction' })
                }

                const result = await this.service.toggleReaction(messageId, userId, emoji)

                if (!result) {
                    return res.status(403).json({ error: 'Not found or not authorized' })
                }

                notificationService.emitToRoom(`conversation:${result.conversationId}`, 'chat:reaction_updated', result)

                res.json(result)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to update reaction' })
            }
        })

        // Delete message
        router.delete('/messages/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                const deletedMessage = await this.service.deleteMessage(messageId, userId)

                if (!deletedMessage) {
                    return res.status(403).json({ error: 'Not found or not authorized' })
                }

                notificationService.emitToRoom(`conversation:${deletedMessage.conversationId}`, 'chat:message_deleted', {
                    messageId: deletedMessage.id,
                    conversationId: deletedMessage.conversationId
                });

                res.json({ success: true, messageId: deletedMessage.id })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to delete message' })
            }
        })

        // Edit message (sender only)
        router.patch('/messages/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const messageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { content } = req.body

                if (!content || typeof content !== 'string' || !content.trim()) {
                    return res.status(400).json({ error: 'Message content is required' })
                }

                const updatedMessage = await this.service.editMessage(messageId, userId, content.trim())

                if (!updatedMessage) {
                    return res.status(403).json({ error: 'Not found or not authorized' })
                }

                notificationService.emitToRoom(`conversation:${updatedMessage.conversationId}`, 'chat:message_edited', {
                    messageId: updatedMessage.id,
                    conversationId: updatedMessage.conversationId,
                    content: updatedMessage.content,
                    editedAt: updatedMessage.editedAt,
                })

                res.json(updatedMessage)
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to edit message' })
            }
        })

        // Leave/Delete conversation
        router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

                const success = await this.service.leaveConversation(conversationId, userId)

                if (!success) {
                    return res.status(404).json({ error: 'Conversation not found or not a participant' })
                }

                // Notify others that user left?
                // For direct messages, this might be handled by frontend filtering participants
                // But broadcasting is good practice
                notificationService.emitToRoom(`conversation:${conversationId}`, 'chat:user_left', {
                    userId,
                    conversationId
                });

                res.json({ success: true })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to delete conversation' })
            }
        })

        // Get online users
        router.get('/online', authenticateToken, async (_req: Request, res: Response) => {
            try {
                const onlineUserIds = notificationService.getOnlineUserIds()
                res.json({ onlineUserIds })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: 'Failed to get online users' })
            }
        })

        return router
    }
}
