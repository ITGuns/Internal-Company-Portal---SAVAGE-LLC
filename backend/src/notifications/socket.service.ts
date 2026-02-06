import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

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
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.io.on('connection', (socket: Socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Handle authentication/user identification
            socket.on('authenticate', (userId: string) => {
                this.registerUserSocket(userId, socket.id);
                console.log(`👤 User authenticated on socket: ${userId}`);
            });

            socket.on('disconnect', () => {
                console.log(`❌ Client disconnected: ${socket.id}`);
                this.removeSocket(socket.id);
            });
        });

        console.log('✅ Notification Service (Socket.io) initialized');
    }

    private registerUserSocket(userId: string, socketId: string) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)?.add(socketId);

        // Join a room specifically for this user
        this.io?.sockets.sockets.get(socketId)?.join(`user:${userId}`);
    }

    private removeSocket(socketId: string) {
        // Iterate through maps to remove socketId (inefficient but safe for now)
        this.userSockets.forEach((sockets, userId) => {
            if (sockets.has(socketId)) {
                sockets.delete(socketId);
                if (sockets.size === 0) {
                    this.userSockets.delete(userId);
                }
            }
        });
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
}

export const notificationService = new NotificationService();
