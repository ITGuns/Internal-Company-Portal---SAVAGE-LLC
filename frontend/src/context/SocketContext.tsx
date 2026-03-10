"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { APP_CONFIG } from '@/lib/config'
import { STORAGE_KEYS, SOCKET_EVENTS } from '@/lib/constants'
import { apiFetch } from '@/lib/api'
import { getQueryClient } from '@/lib/queryClient'
import type { SocketNotificationPayload } from '@/lib/types/api'

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
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        newSocket.on('reconnect', () => {
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        newSocket.on('disconnect', () => {
            setIsConnected(false)
        })

        newSocket.on('connect_error', (err) => {
            console.error('⚠️ Socket connection error:', err.message)
        })

        newSocket.on('notification', (payload: SocketNotificationPayload) => {
            const newNotification: Notification = {
                ...payload,
                id: payload.id || crypto.randomUUID(),
                read: false,
                createdAt: payload.createdAt || new Date().toISOString()
            }
            setNotifications(prev => [newNotification, ...prev])
        })

        // Listen for chat messages globally to show badges
        newSocket.on('chat:message', (msg: { senderId: string }) => {
            if (String(msg.senderId) !== String(userId)) {
                // Only increment if we are not on the chat page OR message is for a different conversation
                // For simplicity, we increment globally and the chat page will clear it when viewed
                setUnreadChatCount(prev => prev + 1)
            }
        })

        // Listen for data-change events and invalidate the matching React Query cache
        newSocket.on('data:changed', (payload: { resource: string }) => {
            const queryClient = getQueryClient()
            queryClient.invalidateQueries({ queryKey: [payload.resource] })
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
                // Fetch general notifications AND actual unread chat count in parallel
                const [notifRes, chatRes] = await Promise.all([
                    apiFetch('/notifications'),
                    apiFetch('/chat/unread-count')
                ]);

                if (notifRes.ok) {
                    const data: Notification[] = await notifRes.json()
                    const readIds = getReadIds()
                    const shaped = data.map(n => ({ ...n, read: readIds.has(n.id) }))
                    setNotifications(prev => {
                        // Merge: keep existing socket ones on top, add historical below without duplicates
                        const existingIds = new Set(prev.map(n => n.id))
                        const newOnes = shaped.filter(n => !existingIds.has(n.id))
                        return [...prev, ...newOnes]
                    })
                }

                if (chatRes.ok) {
                    const chatData = await chatRes.json()
                    if (chatData.count !== undefined && chatData.count > 0) {
                        setUnreadChatCount(prev => prev === 0 ? chatData.count : prev)
                    }
                }
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
