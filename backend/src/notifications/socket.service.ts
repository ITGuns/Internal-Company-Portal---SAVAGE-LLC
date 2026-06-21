import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { JwtPayload, JwtService } from '../auth/jwt.service'
import { config } from '../config/env.config'
import { prisma } from '../database/prisma.service'
import {
    buildAuthorizedTypingPayload,
    isAuthorizedConversationParticipant,
    normalizeSocketConversationId,
} from './socket.authorization'
import { createLogger } from '../observability/logger'

const logger = createLogger('notifications.socket')

export interface NotificationPayload {
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    link?: string
    createdAt?: string
    id?: string
}

class NotificationService {
    private io: SocketIOServer | null = null
    private userSockets: Map<string, Set<string>> = new Map()

    private logDebug(message: string) {
        if (config.nodeEnv !== 'production' || config.logLevel.toLowerCase() === 'debug') {
            logger.info(message)
        }
    }

    initialize(httpServer: HttpServer) {
        logger.info('Initializing Socket.io')
        this.io = new SocketIOServer(httpServer, {
            path: '/api/socket',
            addTrailingSlash: false,
            cors: {
                origin: config.corsOrigins,
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Authorization', 'Content-Type'],
            },
            allowEIO3: true,
        })

        this.io.use((socket, next) => {
            const authToken = socket.handshake.auth?.token
            const authHeader = socket.handshake.headers.authorization
            const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                ? authHeader.slice('Bearer '.length)
                : undefined
            const token = typeof authToken === 'string' ? authToken : bearerToken

            if (!token) {
                next(new Error('Unauthorized socket connection'))
                return
            }

            try {
                socket.data.user = JwtService.verifyAccessToken(token)
                next()
            } catch {
                next(new Error('Invalid socket token'))
            }
        })

        this.io.on('connection', (socket: Socket) => {
            const socketUser = socket.data.user as JwtPayload | undefined

            if (!socketUser?.userId) {
                socket.disconnect(true)
                return
            }

            this.logDebug(`Client connected: ${socket.id}`)

            socket.on('authenticate', () => {
                this.registerUserSocket(socketUser.userId, socket.id)
                this.logDebug(`User authenticated on socket: ${socketUser.userId}`)
            })

            socket.on('join:conversation', async (conversationId: string) => {
                const normalizedConversationId = normalizeSocketConversationId(conversationId)

                try {
                    const isAuthorized = await isAuthorizedConversationParticipant(
                        prisma.participant,
                        normalizedConversationId,
                        socketUser.userId,
                    )

                    if (!normalizedConversationId || !isAuthorized) {
                        socket.emit('error', { message: 'Not authorized to join this conversation' })
                        return
                    }

                    socket.join(`conversation:${normalizedConversationId}`)
                    this.logDebug(`Socket ${socket.id} joined conversation room: ${normalizedConversationId}`)
                } catch (error) {
                    logger.error('Socket conversation join failed', error)
                    socket.emit('error', { message: 'Unable to join conversation' })
                }
            })

            socket.on('typing:start', async (data: { conversationId?: unknown }) => {
                const payload = buildAuthorizedTypingPayload(data, socketUser)
                if (!payload) return

                try {
                    const isAuthorized = await isAuthorizedConversationParticipant(
                        prisma.participant,
                        payload.conversationId,
                        socketUser.userId,
                    )

                    if (!isAuthorized) return

                    socket.to(`conversation:${payload.conversationId}`).emit('typing:start', payload)
                } catch (error) {
                    logger.error('Socket typing:start authorization failed', error)
                }
            })

            socket.on('typing:stop', async (data: { conversationId?: unknown }) => {
                const conversationId = normalizeSocketConversationId(data?.conversationId)
                if (!conversationId) return

                try {
                    const isAuthorized = await isAuthorizedConversationParticipant(
                        prisma.participant,
                        conversationId,
                        socketUser.userId,
                    )

                    if (!isAuthorized) return

                    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                        conversationId,
                        userId: socketUser.userId,
                    })
                } catch (error) {
                    logger.error('Socket typing:stop authorization failed', error)
                }
            })

            socket.on('disconnect', () => {
                this.logDebug(`Client disconnected: ${socket.id}`)
                this.removeSocket(socket.id)
            })
        })

        logger.info('Notification Service (Socket.io) initialized')
    }

    private registerUserSocket(userId: string, socketId: string) {
        const isNewUser = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 0
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set())
        }
        this.userSockets.get(userId)?.add(socketId)

        this.io?.sockets.sockets.get(socketId)?.join(`user:${userId}`)

        if (isNewUser) {
            this.io?.emit('presence:online', { userId })
        }
    }

    private removeSocket(socketId: string) {
        this.userSockets.forEach((sockets, userId) => {
            if (sockets.has(socketId)) {
                sockets.delete(socketId)
                if (sockets.size === 0) {
                    this.userSockets.delete(userId)
                    this.io?.emit('presence:offline', { userId })
                }
            }
        })
    }

    getOnlineUserIds(): string[] {
        return Array.from(this.userSockets.keys())
    }

    notifyUser(userId: string, payload: NotificationPayload) {
        if (!this.io) {
            logger.warn('Cannot send notification: Socket.io not initialized')
            return
        }

        const notification = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }

        this.io.to(`user:${userId}`).emit('notification', notification)
        this.logDebug(`Notification sent to user ${userId}: ${payload.title}`)
    }

    broadcast(payload: NotificationPayload) {
        if (!this.io) return

        const notification = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }

        this.io.emit('notification', notification)
        this.logDebug(`Broadcast sent: ${payload.title}`)
    }

    emitToRoom(room: string, event: string, payload: unknown) {
        if (!this.io) return
        this.io.to(room).emit(event, payload)
    }

    broadcastDataChange(resource: string) {
        if (!this.io) return
        this.io.emit('data:changed', { resource, timestamp: Date.now() })
    }

    joinRoom(userId: string, room: string) {
        if (!this.io) return

        const sockets = this.userSockets.get(userId)
        if (sockets) {
            sockets.forEach(socketId => {
                this.io?.sockets.sockets.get(socketId)?.join(room)
            })
        }
    }
}

export const notificationService = new NotificationService()
