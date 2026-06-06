"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { APP_CONFIG } from '@/lib/config'
import { apiFetch, getAuthToken } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { getQueryClient } from '@/lib/queryClient'
import type { SocketNotificationPayload } from '@/lib/types/api'

const DEFAULT_SOCKET_URL = APP_CONFIG.wsUrl
    .replace('ws://', 'http://')
    .replace('wss://', 'https://');

function resolveSocketUrl(): string {
    if (typeof window === 'undefined') return DEFAULT_SOCKET_URL;

    const configuredUrl = new URL(DEFAULT_SOCKET_URL, window.location.origin);
    const configuredHost = configuredUrl.hostname;
    const isConfiguredLoopback = configuredHost === 'localhost'
        || configuredHost === '127.0.0.1'
        || configuredHost === '::1'
        || configuredHost === '[::1]';
    const isCurrentLoopback = window.location.hostname === 'localhost'
        || window.location.hostname === '127.0.0.1'
        || window.location.hostname === '::1'
        || window.location.hostname === '[::1]';

    return !isCurrentLoopback && isConfiguredLoopback
        ? window.location.origin
        : DEFAULT_SOCKET_URL;
}

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
    connect: (userId: string, token?: string) => void
    disconnect: () => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
    clearChatBadge: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: userLoading } = useUser()
    const [socket, setSocket] = useState<Socket | null>(null)
    const socketRef = React.useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])

    const [unreadChatCount, setUnreadChatCount] = useState(0)

    const unreadCount = notifications.filter(n => !n.read).length + unreadChatCount

    const connect = useCallback((userId: string, token = getAuthToken() || "") => {
        if (!token) return
        if (socketRef.current?.connected) return

        if (socketRef.current) {
            socketRef.current.disconnect()
        }

        const newSocket = io(resolveSocketUrl(), {
            path: '/api/socket',
            addTrailingSlash: false,
            withCredentials: true,
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {
                token
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
            console.warn('[SocketContext] Socket connection warning:', err.message)
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

        // Lightweight user-room event for chat badges, even when the current page has not joined a conversation room.
        newSocket.on('chat:message_notification', (msg: { senderId: string }) => {
            if (String(msg.senderId) !== String(userId)) {
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
            const hasAuthenticatedSession = !userLoading && Boolean(user) && Boolean(getAuthToken())

            if (!hasAuthenticatedSession) return

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
    }, [user, userLoading])

    // Auto-connect and monitor user changes
    useEffect(() => {
        const checkUserAndConnect = () => {
            const accessToken = getAuthToken()

            if (userLoading || !user || !accessToken) {
                if (socketRef.current) disconnect()
                return
            }

            const uid = user.id

            if (uid && (!socketRef.current || !socketRef.current.connected)) {
                connect(String(uid), accessToken)
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
    }, [connect, disconnect, user, userLoading])

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
            clearChatBadge
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
