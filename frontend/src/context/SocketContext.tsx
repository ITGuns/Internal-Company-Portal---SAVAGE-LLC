"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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
            transports: ['websocket', 'polling']
        })

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id)
            setIsConnected(true)
            newSocket.emit('authenticate', userId)
        })

        newSocket.on('disconnect', () => {
            console.log('❌ Socket disconnected')
            setIsConnected(false)
        })

        newSocket.on('connect_error', (err) => {
            console.error('⚠️ Socket connection error:', err)
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

    // Auto-connect if userId exists in localStorage
    useEffect(() => {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser)
                if (user.id) {
                    connect(user.id)
                }
            } catch (e) {
                console.error('Failed to parse user from local storage', e)
            }
        }

        return () => {
            if (socket) {
                socket.disconnect()
            }
        }
    }, []) // Run once on mount

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
