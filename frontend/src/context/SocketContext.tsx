"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { APP_CONFIG } from '@/lib/config'
import { STORAGE_KEYS, SOCKET_EVENTS } from '@/lib/constants'

const SOCKET_URL = APP_CONFIG.wsUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://');

export interface Notification {
    id: string
    type: 'info' | 'success' | 'warning' | 'error'
    title: string
    message: string
    link?: string
    createdAt: string
    read: boolean
}

interface SocketContextType {
    socket: Socket | null
    isConnected: boolean
    notifications: Notification[]
    unreadCount: number
    connect: (userId: string) => void
    disconnect: () => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
    clearChatBadge: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const socketRef = React.useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])

    const [unreadChatCount, setUnreadChatCount] = useState(0)

    const unreadCount = notifications.filter(n => !n.read).length + unreadChatCount

    const connect = useCallback((userId: string) => {
        if (socketRef.current?.connected) return

        if (socketRef.current) {
            socketRef.current.disconnect()
        }

        console.log('🔌 Connecting to socket...', SOCKET_URL)

        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token: typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null
            }
        })

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('✅ Socket connected via', newSocket.io.engine.transport.name, 'ID:', newSocket.id)
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        newSocket.on('reconnect', (attempt) => {
            console.log('🔄 Socket reconnected after', attempt, 'attempts')
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        newSocket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason)
            setIsConnected(false)
        })

        newSocket.on('connect_error', (err) => {
            console.error('⚠️ Socket connection error:', err.message)
        })

        newSocket.on('notification', (payload: any) => {
            console.log('🔔 New notification received:', payload)
            const newNotification: Notification = {
                ...payload,
                read: false,
                createdAt: payload.createdAt || new Date().toISOString()
            }
            setNotifications(prev => [newNotification, ...prev])
        })

        // Listen for chat messages globally to show badges
        newSocket.on('chat:message', (msg: any) => {
            if (String(msg.senderId) !== String(userId)) {
                // Only increment if we are not on the chat page OR message is for a different conversation
                // For simplicity, we increment globally and the chat page will clear it when viewed
                setUnreadChatCount(prev => prev + 1)
            }
        })

        setSocket(newSocket)
    }, [])

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect()
            socketRef.current = null
            setSocket(null)
            setIsConnected(false)
        }
    }, [])

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const clearNotifications = () => {
        setNotifications([])
    }

    const clearChatBadge = () => setUnreadChatCount(0)

    // Auto-connect and monitor user changes
    useEffect(() => {
        const checkUserAndConnect = () => {
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USER) : null
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser)
                    const uid = user.id || user.userId || user.uuid

                    if (uid && (!socketRef.current || !socketRef.current.connected)) {
                        console.log('🔄 Auto-connecting socket for user:', uid)
                        connect(uid)
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        checkUserAndConnect()
        const interval = setInterval(checkUserAndConnect, APP_CONFIG.userPollInterval)

        return () => {
            clearInterval(interval)
            if (socketRef.current) {
                socketRef.current.disconnect()
            }
        }
    }, [connect])

    return (
        <SocketContext.Provider value={{
            socket,
            isConnected,
            notifications,
            unreadCount,
            connect,
            disconnect,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            clearChatBadge: () => setUnreadChatCount(0)
        }}>
            {children}
        </SocketContext.Provider>
    )
}

export function useSocket() {
    const context = useContext(SocketContext)
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider')
    }
    return context
}
