"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

const getSocketUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname
        return `http://${host}:4000`
    }
    return 'http://localhost:4000'
}

const SOCKET_URL = getSocketUrl()

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
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])

    const unreadCount = notifications.filter(n => !n.read).length

    const connect = useCallback((userId: string) => {
        if (socket?.connected) return

        console.log('🔌 Connecting to socket...', SOCKET_URL)

        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['polling', 'websocket'], // Try polling first for better compatibility
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        newSocket.on('connect', () => {
            console.log('✅ Socket connected via', newSocket.io.engine.transport.name, 'ID:', newSocket.id)
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        // Force connected state if we have a transport (fallback for some poll cases)
        newSocket.io.engine.on('packet', () => {
            if (!isConnected) setIsConnected(true)
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
            // Still try to authenticate if we're in a polling state that works
            if (newSocket.id) setIsConnected(true)
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

        setSocket(newSocket)
    }, [socket])

    const disconnect = useCallback(() => {
        if (socket) {
            socket.disconnect()
            setSocket(null)
            setIsConnected(false)
        }
    }, [socket])

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

    // Auto-connect and monitor user changes
    useEffect(() => {
        const checkUserAndConnect = () => {
            const storedUser = typeof window !== 'undefined' ? (localStorage.getItem('currentUser') || localStorage.getItem('user')) : null
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser)
                    const uid = user.id || user.userId || user.uuid
                    // If we have a user but no socket, or socket is disconnected, try to connect
                    if (uid && (!socket || !socket.connected)) {
                        console.log('🔄 Auto-connecting socket for user:', uid)
                        connect(uid)
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }

        checkUserAndConnect()
        const interval = setInterval(checkUserAndConnect, 3000)

        return () => {
            clearInterval(interval)
        }
    }, [connect, socket]) // Trigger on mount or if socket object changes

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
            clearNotifications
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
