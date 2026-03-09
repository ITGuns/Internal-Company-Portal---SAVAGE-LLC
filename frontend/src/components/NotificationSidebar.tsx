"use client"

import React from 'react'
import { Notification } from '@/context/SocketContext'
import { Bell, X, Check, CheckCheck, MessageSquare, Megaphone, ClipboardList, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Button from './Button'
import Link from 'next/link'

interface NotificationSidebarProps {
    isOpen: boolean
    onClose: () => void
    notifications: Notification[]
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onClear: () => void
}

function typeIcon(n: Notification) {
    if (n.id.startsWith('msg-')) return <MessageSquare className="w-4 h-4 text-blue-400" />
    if (n.id.startsWith('ann-')) return <Megaphone className="w-4 h-4 text-purple-400" />
    if (n.id.startsWith('task-')) return <ClipboardList className="w-4 h-4 text-orange-400" />
    switch (n.type) {
        case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />
        case 'error': return <XCircle className="w-4 h-4 text-red-400" />
        default: return <Info className="w-4 h-4 text-blue-400" />
    }
}

function typeBg(n: Notification) {
    if (n.id.startsWith('msg-')) return 'bg-blue-500/10 border-blue-500/20'
    if (n.id.startsWith('ann-')) return 'bg-purple-500/10 border-purple-500/20'
    if (n.id.startsWith('task-')) return 'bg-orange-500/10 border-orange-500/20'
    switch (n.type) {
        case 'success': return 'bg-green-500/10 border-green-500/20'
        case 'warning': return 'bg-yellow-500/10 border-yellow-500/20'
        case 'error': return 'bg-red-500/10 border-red-500/20'
        default: return 'bg-blue-500/10 border-blue-500/20'
    }
}

function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
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
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                style={{ zIndex: 9998 }}
            />

            {/* Sidebar */}
            <div
                className="fixed top-0 right-0 h-full w-[420px] bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl flex flex-col"
                style={{ zIndex: 10000, isolation: 'isolate', animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            >
                {/* Header */}
                <div className="p-5 border-b border-[var(--border)] bg-[var(--card-surface)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-[var(--accent)]" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold">Notifications</h2>
                                <p className="text-xs text-[var(--muted)]">
                                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                                </p>
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
                <div className="flex-1 overflow-y-auto chat-scroll">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--card-surface)] flex items-center justify-center mb-4">
                                <Bell className="w-8 h-8 opacity-30 text-[var(--muted)]" />
                            </div>
                            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No notifications yet</p>
                            <p className="text-xs text-[var(--muted)] max-w-[280px]">
                                We'll let you know when something important happens.
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {notifications.map((notification) => {
                                const content = (
                                    <div
                                        key={notification.id}
                                        className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${typeBg(notification)} ${!notification.read ? 'opacity-100' : 'opacity-60'}`}
                                        onClick={() => !notification.read && onMarkAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Type icon */}
                                            <div className="w-8 h-8 rounded-lg bg-[var(--background)]/80 flex items-center justify-center shrink-0 mt-0.5">
                                                {typeIcon(notification)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <p className={`text-sm leading-snug truncate ${!notification.read ? 'font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--muted-foreground)]'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                        )}
                                                        <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">
                                                            {relativeTime(notification.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Mark as read hover action */}
                                        {!notification.read && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id) }}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition"
                                                title="Mark as read"
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )

                                // Wrap in link if it has one
                                return notification.link ? (
                                    <Link key={notification.id} href={notification.link} onClick={onClose}>
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={notification.id}>{content}</div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </>
    )
}
