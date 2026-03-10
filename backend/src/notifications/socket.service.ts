import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from '../config/env.config';

export interface NotificationPayload {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    link?: string;
    createdAt?: string;
    id?: string;
}

class NotificationService {
    private io: SocketIOServer | null = null;
    // Map userId -> Set<socketId>
    private userSockets: Map<string, Set<string>> = new Map();

    initialize(httpServer: HttpServer) {
        console.log('🔌 Initializing Socket.io...');
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: config.corsOrigin,
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Authorization', 'Content-Type']
            },
            allowEIO3: true // Support older clients just in case
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Handle authentication/user identification
            socket.on('authenticate', (userId: string) => {
                this.registerUserSocket(userId, socket.id);
                console.log(`👤 User authenticated on socket: ${userId}`);
            });

            socket.on('join:conversation', (conversationId: string) => {
                socket.join(`conversation:${conversationId}`);
                console.log(`💬 Socket ${socket.id} joined conversation room: ${conversationId}`);
            });

            // Typing indicator relay — broadcast to other participants in the room
            socket.on('typing:start', (data: { conversationId: string; userId: string; userName: string }) => {
                socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
                    conversationId: data.conversationId,
                    userId: data.userId,
                    userName: data.userName,
                });
            });

            socket.on('typing:stop', (data: { conversationId: string; userId: string }) => {
                socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
                    conversationId: data.conversationId,
                    userId: data.userId,
                });
            });

            socket.on('disconnect', () => {
                console.log(`❌ Client disconnected: ${socket.id}`);
                this.removeSocket(socket.id);
            });
        });

        console.log('✅ Notification Service (Socket.io) initialized');
    }

    private registerUserSocket(userId: string, socketId: string) {
        const isNewUser = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 0;
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)?.add(socketId);

        // Join a room specifically for this user
        this.io?.sockets.sockets.get(socketId)?.join(`user:${userId}`);

        // Broadcast online status if this is their first socket
        if (isNewUser) {
            this.io?.emit('presence:online', { userId });
        }
    }

    private removeSocket(socketId: string) {
        // Iterate through maps to remove socketId (inefficient but safe for now)
        this.userSockets.forEach((sockets, userId) => {
            if (sockets.has(socketId)) {
                sockets.delete(socketId);
                if (sockets.size === 0) {
                    this.userSockets.delete(userId);
                    // Broadcast offline status
                    this.io?.emit('presence:offline', { userId });
                }
            }
        });
    }

    /**
     * Get all currently online user IDs
     */
    getOnlineUserIds(): string[] {
        return Array.from(this.userSockets.keys());
    }

    /**
     * Send a notification to a specific user
     */
    notifyUser(userId: string, payload: NotificationPayload) {
        if (!this.io) {
            console.warn('⚠️ Cannot send notification: Socket.io not initialized');
            return;
        }

        const notification = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        // Emit to the user's room
        this.io.to(`user:${userId}`).emit('notification', notification);
        console.log(`📨 Notification sent to user ${userId}: ${payload.title}`);
    }

    /**
     * Broadcast a notification to all connected users
     */
    broadcast(payload: NotificationPayload) {
        if (!this.io) return;

        const notification = {
            ...payload,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        this.io.emit('notification', notification);
        console.log(`📢 Broadcast sent: ${payload.title}`);
    }

    /**
     * Emit an event to a specific room (e.g. conversation room)
     */
    emitToRoom(room: string, event: string, payload: unknown) {
        if (!this.io) return;
        this.io.to(room).emit(event, payload);
    }

    /**
     * Broadcast a data-change event so connected clients can refetch.
     * This is separate from user-visible notifications — it's a silent cache-bust signal.
     * @param resource - The resource type that changed (e.g. 'announcements', 'tasks', 'daily-logs')
     */
    broadcastDataChange(resource: string) {
        if (!this.io) return;
        this.io.emit('data:changed', { resource, timestamp: Date.now() });
    }

    /**
     * Make a user join a room
     */
    joinRoom(userId: string, room: string) {
        if (!this.io) return;
        // Find sockets for this user
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            sockets.forEach(socketId => {
                this.io?.sockets.sockets.get(socketId)?.join(room);
            });
        }
    }
}

export const notificationService = new NotificationService();
