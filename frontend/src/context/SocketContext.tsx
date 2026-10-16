"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { APP_CONFIG } from '@/lib/config'
import { apiFetch, getAuthToken } from '@/lib/api'
import { useUser } from '@/contexts/UserContext'
import { getQueryClient } from '@/lib/queryClient'
import { resolveSocketUrl } from '@/lib/socket-url'
import { getFallbackPollInterval } from '@/lib/realtime-fallback'
import { useVisiblePolling } from '@/hooks/useVisiblePolling'
import type { SocketNotificationPayload } from '@/lib/types/api'
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    createBrowserNotification,
    getBrowserNotificationPermission,
    pickPolledPopups,
    readNotificationPreferences,
    requestBrowserNotificationPermission as requestBrowserNotificationPermissionState,
    shouldShowNotification,
    updateNotificationPreferences as mergeNotificationPreferences,
    writeNotificationPreferences,
    type BrowserNotificationPermissionState,
    type NotificationPreferencePatch,
    type NotificationPreferences,
} from '@/lib/notification-preferences'

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
    notificationPreferences: NotificationPreferences
    browserNotificationPermission: BrowserNotificationPermissionState
    notificationError: string | null
    connect: (userId: string, token?: string) => void
    disconnect: () => void
    markAsRead: (id: string) => void
    markAllAsRead: () => void
    clearNotifications: () => void
    clearChatBadge: () => void
    updateNotificationPreferences: (patch: NotificationPreferencePatch) => void
    requestBrowserNotifications: () => Promise<BrowserNotificationPermissionState>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

function createClientNotificationId() {
    return globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getPermissionError(permission: BrowserNotificationPermissionState) {
    switch (permission) {
        case 'denied':
            return 'Browser notifications are blocked in your browser settings.'
        case 'default':
            return 'Browser notifications were not enabled.'
        case 'unsupported':
            return 'Browser notifications are not supported in this browser.'
        default:
            return null
    }
}

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: userLoading } = useUser()
    const [socket, setSocket] = useState<Socket | null>(null)
    const socketRef = React.useRef<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
    const notificationPreferencesRef = React.useRef<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
    const [browserNotificationPermission, setBrowserNotificationPermission] =
        useState<BrowserNotificationPermissionState>('unsupported')
    const [notificationError, setNotificationError] = useState<string | null>(null)
    // Notification ids this tab has already seen, per user, so a poll can tell which ones are new.
    const seenNotificationIdsRef = React.useRef<{ userId: string; ids: Set<string> } | null>(null)

    const [unreadChatCount, setUnreadChatCount] = useState(0)

    const unreadCount = notifications.filter(n => !n.read).length + unreadChatCount

    useEffect(() => {
        notificationPreferencesRef.current = notificationPreferences
    }, [notificationPreferences])

    useEffect(() => {
        setBrowserNotificationPermission(getBrowserNotificationPermission())
    }, [])

    useEffect(() => {
        const savedPreferences = readNotificationPreferences(user?.id)
        notificationPreferencesRef.current = savedPreferences
        setNotificationPreferences(savedPreferences)
        setNotificationError(null)
    }, [user?.id])

    useEffect(() => {
        setNotifications(prev => prev.filter(notification => shouldShowNotification(notification, notificationPreferences)))
    }, [notificationPreferences])

    const updateNotificationPreferences = useCallback((patch: NotificationPreferencePatch) => {
        setNotificationPreferences(prev => {
            const updated = mergeNotificationPreferences(prev, patch)
            notificationPreferencesRef.current = updated
            writeNotificationPreferences(user?.id, updated)
            return updated
        })
        setNotificationError(null)
    }, [user?.id])

    const requestBrowserNotifications = useCallback(async () => {
        const permission = await requestBrowserNotificationPermissionState()
        setBrowserNotificationPermission(permission)

        if (permission === 'granted') {
            updateNotificationPreferences({ browserAlerts: true })
            setNotificationError(null)
        } else {
            updateNotificationPreferences({ browserAlerts: false })
            setNotificationError(getPermissionError(permission))
        }

        return permission
    }, [updateNotificationPreferences])

    // The browser pop-up for one notification when browser alerts are on. Socket events and polls share it.
    const showBrowserPopup = useCallback((notification: Notification) => {
        if (!notificationPreferencesRef.current.browserAlerts) return

        const displayed = createBrowserNotification(notification)
        const permission = getBrowserNotificationPermission()
        setBrowserNotificationPermission(permission)

        if (!displayed) {
            setNotificationError(getPermissionError(permission) || 'Browser notification could not be displayed.')
        }
    }, [])

    const handleSocketNotification = useCallback((payload: SocketNotificationPayload) => {
        const newNotification: Notification = {
            ...payload,
            id: payload.id || createClientNotificationId(),
            read: false,
            createdAt: payload.createdAt || new Date().toISOString()
        }

        if (!shouldShowNotification(newNotification, notificationPreferencesRef.current)) return

        setNotifications(prev => [newNotification, ...prev])

        // A later REST load must not pop this one up a second time.
        const seen = seenNotificationIdsRef.current
        if (seen) seenNotificationIdsRef.current = { ...seen, ids: new Set(seen.ids).add(newNotification.id) }

        showBrowserPopup(newNotification)
    }, [showBrowserPopup])

    const connect = useCallback((userId: string, token = getAuthToken() || "") => {
        if (!APP_CONFIG.enableRealtime) return
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
        })

        newSocket.on('reconnect', () => {
            setIsConnected(true)
        })

        newSocket.on('disconnect', () => {
            setIsConnected(false)
        })

        newSocket.on('connect_error', (err) => {
            console.warn('[SocketContext] Socket connection warning:', err.message)
        })

        newSocket.on('notification', handleSocketNotification)

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
    }, [handleSocketNotification])

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

    // Stable identity: the chat page lists it in effect deps, so a new function per render
    // (every badge poll) would refetch the open conversation and jump its scroll.
    const clearChatBadge = useCallback(() => setUnreadChatCount(0), [])


    // Notifications and the chat badge from the REST API: once on sign-in, then on a timer
    // while realtime is off, because nothing pushes them without a socket.
    const loadNotifications = useCallback(async () => {
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
                const shaped = data
                    .map(n => ({ ...n, read: readIds.has(n.id) }))
                    .filter(n => shouldShowNotification(n, notificationPreferences))

                // Without a socket nothing else raises browser pop-ups: pop up the unread ones this
                // tab has not seen before. The first load for a user only records what is there.
                const userKey = String(user?.id)
                const seen = seenNotificationIdsRef.current
                const previousIds = seen?.userId === userKey ? seen.ids : null
                seenNotificationIdsRef.current = {
                    userId: userKey,
                    ids: new Set([...(previousIds ?? []), ...data.map(n => n.id)]),
                }
                pickPolledPopups(shaped, previousIds).forEach(showBrowserPopup)

                setNotifications(prev => {
                    // Merge by id so local read state survives; newest first; no re-render when nothing is new.
                    const existingIds = new Set(prev.map(n => n.id))
                    const newOnes = shaped.filter(n => !existingIds.has(n.id))
                    if (newOnes.length === 0) return prev
                    return [...prev, ...newOnes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
                })
            }

            if (chatRes.ok) {
                const chatData = await chatRes.json()
                if (typeof chatData.count === 'number') {
                    // Socket events keep a live badge current; without them the server count is the truth.
                    setUnreadChatCount(prev => (APP_CONFIG.enableRealtime && prev > 0 ? prev : chatData.count))
                }
            }
        } catch {
            // Ignore: the next poll or socket event brings the bell up to date.
        }
    }, [notificationPreferences, showBrowserPopup, user, userLoading])

    useEffect(() => {
        void loadNotifications()
    }, [loadNotifications])

    useVisiblePolling(
        loadNotifications,
        getFallbackPollInterval(APP_CONFIG.enableRealtime, APP_CONFIG.notificationPollInterval),
    )

    // Auto-connect and monitor user changes
    useEffect(() => {
        const checkUserAndConnect = () => {
            const accessToken = getAuthToken()

            if (!APP_CONFIG.enableRealtime || userLoading || !user || !accessToken) {
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
            notificationPreferences,
            browserNotificationPermission,
            notificationError,
            connect,
            disconnect,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            clearChatBadge,
            updateNotificationPreferences,
            requestBrowserNotifications
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
