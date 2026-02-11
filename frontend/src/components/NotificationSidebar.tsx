"use client"

import React from 'react'
import { Notification } from '@/context/SocketContext'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import Button from './Button'

interface NotificationSidebarProps {
    isOpen: boolean
    onClose: () => void
    notifications: Notification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onClear: () => void
}

export default function NotificationSidebar({
    isOpen,
    onClose,
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClear
}: NotificationSidebarProps) {
    if (!isOpen) return null

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                style={{ zIndex: 9998 }}
            />

            {/* Sidebar */}
            <div 
                className="fixed top-0 right-0 h-full w-[420px] bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                style={{ zIndex: 10000, isolation: 'isolate' }}
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] bg-[var(--card-surface)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--background)] flex items-center justify-center">
                                <Bell className="w-5 h-5 text-[var(--accent)]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Notifications</h2>
                                {unreadCount > 0 && (
                                    <p className="text-xs text-[var(--muted)]">{unreadCount} unread</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                            aria-label="Close notifications"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Action buttons */}
                    {notifications.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                onClick={onMarkAllAsRead}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8"
                            >
                                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                                Mark all read
                            </Button>
                            <Button
                                onClick={onClear}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs h-8 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
                            >
                                <X className="w-3.5 h-3.5 mr-1.5" />
                                Clear all
                            </Button>
                        </div>
                    )}
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--card-surface)] flex items-center justify-center mb-4">
                                <Bell className="w-8 h-8 opacity-30 text-[var(--muted)]" />
                            </div>
                            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No notifications yet</p>
                            <p className="text-xs text-[var(--muted)] max-w-[280px]">
                                We&apos;ll let you know when something important happens.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 hover:bg-[var(--card-surface)] transition group ${
                                        !notification.read ? 'bg-[rgba(var(--accent-rgb),0.05)]' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Unread indicator */}
                                        <div
                                            className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                                !notification.read ? 'bg-blue-500' : 'bg-transparent'
                                            }`}
                                        />

                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    className={`text-sm leading-snug ${
                                                        !notification.read
                                                            ? 'font-semibold text-[var(--foreground)]'
                                                            : 'font-medium text-[var(--muted-foreground)]'
                                                    }`}
                                                >
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                                                    {new Date(notification.createdAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <p className="text-xs text-[var(--muted)] leading-relaxed">
                                                {notification.message}
                                            </p>

                                            <div className="flex items-center gap-2 pt-1">
                                                {notification.link && (
                                                    <a
                                                        href={notification.link}
                                                        className="text-xs text-blue-500 hover:underline font-medium"
                                                        onClick={onClose}
                                                    >
                                                        View Details →
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {!notification.read && (
                                            <button
                                                onClick={() => onMarkAsRead(notification.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                                                title="Mark as read"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="p-4 border-t border-[var(--border)] bg-[var(--card-surface)]">
                        <button
                            onClick={onClose}
                            className="w-full text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition py-2"
                        >
                            View All Notifications
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
