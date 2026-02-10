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
        console.log('🔌 Initializing Socket.io with permissive CORS...');
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: (origin, callback) => {
                    // Log the origin attempting to connect
                    console.log(`📡 Socket connection attempt from origin: ${origin || 'unknown'}`);
                    callback(null, true); // Allow all
                },
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

    /**
     * Emit an event to a specific room (e.g. conversation room)
     */
    emitToRoom(room: string, event: string, payload: any) {
        if (!this.io) return;
        this.io.to(room).emit(event, payload);
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
