"use client"

import React from 'react'
import { Notification } from '@/context/SocketContext'
import { Bell, X, Check, CheckCheck } from 'lucide-react'

interface NotificationListProps {
    notifications: Notification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onClear: () => void
    onClose: () => void
}

export default function NotificationList({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClear,
    onClose
}: NotificationListProps) {

    if (notifications.length === 0) {
        return (
            <div className="absolute top-16 right-6 w-80 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 p-6 flex flex-col items-center justify-center text-[var(--muted)] animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-full bg-[var(--card-surface)] flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 opacity-30" />
                </div>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1 opacity-70">We'll let you know when something important happens.</p>
            </div>
        )
    }

    return (
        <div className="absolute top-16 right-6 w-96 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--card-surface)]">
                <h3 className="font-semibold text-sm pl-1">Notifications ({notifications.filter(n => !n.read).length})</h3>
                <div className="flex gap-1">
                    <button
                        onClick={onMarkAllAsRead}
                        title="Mark all as read"
                        className="p-1.5 rounded hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                    >
                        <CheckCheck className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClear}
                        title="Clear all"
                        className="p-1.5 rounded hover:bg-[var(--background)] text-[var(--muted)] hover:text-red-500 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[400px] chat-scroll">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-surface)] transition group ${!notification.read ? 'bg-[rgba(var(--accent-rgb),0.05)]' : ''}`}
                    >
                        <div className="flex items-start gap-3">
                            {/* Icon based on type */}
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`} />

                            <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-sm ${!notification.read ? 'font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--muted-foreground)]'}`}>
                                        {notification.title}
                                    </p>
                                    <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <p className="text-xs text-[var(--muted)] leading-relaxed">
                                    {notification.message}
                                </p>

                                {notification.link && (
                                    <a
                                        href={notification.link}
                                        className="text-xs text-blue-500 hover:underline inline-block mt-1 font-medium"
                                        onClick={onClose}
                                    >
                                        View Details →
                                    </a>
                                )}
                            </div>

                            {!notification.read && (
                                <button
                                    onClick={() => onMarkAsRead(notification.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-[var(--border)] text-[var(--muted)] transition"
                                    title="Mark as read"
                                >
                                    <Check className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
