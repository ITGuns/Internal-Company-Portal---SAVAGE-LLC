"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { APP_CONFIG } from '@/lib/config'
import { STORAGE_KEYS, SOCKET_EVENTS } from '@/lib/constants'
import { apiFetch } from '@/lib/api'

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
    unreadCount: number        // total: notifications + chat
    unreadChatCount: number    // chat messages only — for sidebar badge
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

    // Persist/retrieve read state via localStorage
    const getReadIds = (): Set<string> => {
        try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('notification_read_ids') : null
            return new Set(raw ? JSON.parse(raw) : [])
        } catch { return new Set() }
    }
    const saveReadIds = (ids: Set<string>) => {
        try {
            if (typeof window !== 'undefined')
                localStorage.setItem('notification_read_ids', JSON.stringify(Array.from(ids)))
        } catch { }
    }

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
        // Persist read state
        const ids = getReadIds()
        ids.add(id)
        saveReadIds(ids)
    }

    const markAllAsRead = () => {
        setNotifications(prev => {
            const updated = prev.map(n => ({ ...n, read: true }))
            const ids = getReadIds()
            updated.forEach(n => ids.add(n.id))
            saveReadIds(ids)
            return updated
        })
    }

    const clearNotifications = () => {
        setNotifications([])
        if (typeof window !== 'undefined') localStorage.removeItem('notification_read_ids')
    }

    const clearChatBadge = () => setUnreadChatCount(0)


    // Fetch historical notifications from REST API on mount
    useEffect(() => {
        const loadHistorical = async () => {
            try {
                const res = await apiFetch('/notifications')
                if (!res.ok) return
                const data: Notification[] = await res.json()
                const readIds = getReadIds()
                const shaped = data.map(n => ({ ...n, read: readIds.has(n.id) }))
                setNotifications(prev => {
                    // Merge: keep existing socket ones on top, add historical below without duplicates
                    const existingIds = new Set(prev.map(n => n.id))
                    const newOnes = shaped.filter(n => !existingIds.has(n.id))
                    return [...prev, ...newOnes]
                })
            } catch {
                // Silently ignore — user still gets live socket notifications
            }
        }
        loadHistorical()
    }, [])

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
            unreadChatCount,
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
