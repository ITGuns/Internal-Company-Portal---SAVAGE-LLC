import express, { Request, Response, Router } from 'express'
import { ChatService } from './chat.service'
import { authenticateToken, AuthRequest } from '../auth/auth.middleware'
import { notificationService } from '../notifications/socket.service'

export class ChatController {
    private service = new ChatService()

    router(): Router {
        const router = express.Router()

        // Get all conversations for current user
        router.get('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore - user is added by middleware
                const userId = (req as AuthRequest).user.userId
                const conversations = await this.service.getUserConversations(userId)
                res.json(conversations)
            } catch (error) {
                console.error(error)
                res.status(500).json({ error: 'Failed to fetch conversations' })
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
                console.error(error)
                res.status(500).json({ error: 'Failed to count unread messages' })
            }
        })

        // Create a new conversation
        router.post('/', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const { type, participantIds, name } = req.body // type: 'direct' | 'group' | 'channel'

                // Ensure current user is in participants
                const allParticipants = Array.from(new Set([...(participantIds || []), userId]))

                if (allParticipants.length < 2) {
                    return res.status(400).json({ error: 'At least 2 participants required' })
                }

                const conversation = await this.service.createConversation(type || 'direct', allParticipants, name)

                // Notify participants
                conversation.participants.forEach((p: any) => {
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
                console.error(error)
                res.status(500).json({ error: 'Failed to create conversation' })
            }
        })

        // Get conversation messages
        router.get('/:id/messages', authenticateToken, async (req: Request, res: Response) => {
            try {
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
                const cursor = req.query.cursor as string

                // Verify user is participant of conversation (security)
                const isParticipant = await this.service.isParticipant(conversationId, userId)
                if (!isParticipant) {
                    return res.status(403).json({ error: 'Access denied' })
                }

                const messages = await this.service.getMessages(conversationId, limit, cursor)
                res.json(messages)
            } catch (error) {
                console.error(error)
                res.status(500).json({ error: 'Failed to fetch messages' })
            }
        })

        // Send a message
        router.post('/:id/messages', authenticateToken, async (req: Request, res: Response) => {
            try {
                // @ts-ignore
                const userId = (req as AuthRequest).user.userId
                const conversationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
                const { content, attachment } = req.body

                // Verify user is participant
                const isParticipant = await this.service.isParticipant(conversationId, userId)
                if (!isParticipant) {
                    return res.status(403).json({ error: 'Access denied' })
                }

                if (!content && !attachment) {
                    return res.status(400).json({ error: 'Content or attachment required' })
                }

                const message = await this.service.sendMessage(conversationId, userId, content, attachment)

                // Broadcast to conversation room (real-time chat update)
                notificationService.emitToRoom(`conversation:${conversationId}`, 'chat:message', message);

                // Also notify offline/online users via user room (for push notifications/badges)
                const conversation = await this.service.getConversationById(conversationId);
                if (conversation) {
                    conversation.participants.forEach((p: any) => {
                        if (p.userId !== userId) {
                            notificationService.notifyUser(p.userId, {
                                type: 'info',
                                title: 'New Message',
                                message: `New message from ${message.sender.name || 'someone'}`,
                                link: `/chat/${conversationId}`,
                                id: message.id
                            });
                        }
                    });
                }

                res.status(201).json(message)
            } catch (error: any) {
                const fs = require('fs');
                const logMsg = `\n[${new Date().toISOString()}] ERROR SENDING MESSAGE:\n${error.stack || error}\n`;
                fs.appendFileSync('chat_error.log', logMsg);
                console.error(error)
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

                await this.service.markAsRead(conversationId, userId)
                res.sendStatus(200)
            } catch (error) {
                res.status(500).json({ error: 'Failed to mark as read' })
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
                console.error(error)
                res.status(500).json({ error: 'Failed to delete message' })
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
                console.error(error)
                res.status(500).json({ error: 'Failed to delete conversation' })
            }
        })

        return router
    }
}
