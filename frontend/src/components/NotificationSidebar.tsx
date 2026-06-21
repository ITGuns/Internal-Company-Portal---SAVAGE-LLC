"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Notification } from '@/context/SocketContext'
import { Bell, BellOff, BellRing, X, Check, CheckCheck, MessageSquare, Megaphone, ClipboardList, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Button from './Button'
import Link from 'next/link'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import {
    NOTIFICATION_TYPES,
    type BrowserNotificationPermissionState,
    type NotificationPreferencePatch,
    type NotificationPreferences,
    type NotificationType,
} from '@/lib/notification-preferences'
import { cn } from '@/lib/utils'

interface NotificationSidebarProps {
    isOpen: boolean
    onClose: () => void
    notifications: Notification[]
    preferences: NotificationPreferences
    browserNotificationPermission: BrowserNotificationPermissionState
    notificationError: string | null
    onMarkAsRead: (id: string) => void
    onMarkAllAsRead: () => void
    onClear: () => void
    onUpdatePreferences: (patch: NotificationPreferencePatch) => void
    onRequestBrowserNotifications: () => Promise<BrowserNotificationPermissionState>
}

const notificationTypeLabels: Record<NotificationType, string> = {
    info: 'Info',
    success: 'Success',
    warning: 'Warnings',
    error: 'Errors',
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

function categoryIcon(type: NotificationType, className = 'w-4 h-4') {
    switch (type) {
        case 'success': return <CheckCircle className={cn(className, 'text-green-400')} aria-hidden="true" />
        case 'warning': return <AlertTriangle className={cn(className, 'text-yellow-400')} aria-hidden="true" />
        case 'error': return <XCircle className={cn(className, 'text-red-400')} aria-hidden="true" />
        default: return <Info className={cn(className, 'text-blue-400')} aria-hidden="true" />
    }
}

function permissionLabel(permission: BrowserNotificationPermissionState) {
    switch (permission) {
        case 'granted': return 'Allowed'
        case 'denied': return 'Blocked'
        case 'default': return 'Not set'
        default: return 'Unavailable'
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
    preferences,
    browserNotificationPermission,
    notificationError,
    onMarkAsRead,
    onMarkAllAsRead,
    onClear,
    onUpdatePreferences,
    onRequestBrowserNotifications
}: NotificationSidebarProps) {
    const [isMounted, setIsMounted] = useState(false)
    const { dialogRef, handleDialogKeyDown } = useDialogA11y({ isOpen, onClose })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isOpen || !isMounted) return null

    const unreadCount = notifications.filter(n => !n.read).length
    const browserAlertsEnabled = preferences.browserAlerts && browserNotificationPermission === 'granted'

    const toggleBrowserAlerts = async () => {
        if (browserAlertsEnabled) {
            onUpdatePreferences({ browserAlerts: false })
            return
        }

        if (browserNotificationPermission === 'granted') {
            onUpdatePreferences({ browserAlerts: true })
            return
        }

        await onRequestBrowserNotifications()
    }

    const toggleType = (type: NotificationType) => {
        const mutedTypes = preferences.mutedTypes.includes(type)
            ? preferences.mutedTypes.filter(mutedType => mutedType !== type)
            : [...preferences.mutedTypes, type]

        onUpdatePreferences({ mutedTypes })
    }

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="portal-form-backdrop fixed inset-0 z-[9997] motion-fade-in"
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                ref={dialogRef}
                className="fixed top-0 right-0 z-[9998] flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card-bg)] shadow-2xl motion-drawer-right-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notification-sidebar-title"
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
                style={{ isolation: 'isolate' }}
            >
                {/* Header */}
                <div className="p-5 border-b border-[var(--border)] bg-[var(--card-surface)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-[var(--accent)]" />
                            </div>
                            <div>
                                <h2 id="notification-sidebar-title" className="text-base font-semibold">Notifications</h2>
                                <p className="text-xs text-[var(--muted)]">
                                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="motion-interactive p-2 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
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

                    <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)]/45 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-[var(--foreground)]">Browser alerts</p>
                                <p className="text-[11px] text-[var(--muted)]">{permissionLabel(browserNotificationPermission)}</p>
                            </div>
                            <Button
                                type="button"
                                onClick={toggleBrowserAlerts}
                                variant={browserAlertsEnabled ? 'secondary' : 'outline'}
                                size="sm"
                                className="shrink-0 text-xs"
                            >
                                {browserAlertsEnabled ? (
                                    <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                    <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                                {browserAlertsEnabled ? 'Turn off' : 'Enable'}
                            </Button>
                        </div>

                        {notificationError ? (
                            <p className="mt-2 text-xs leading-relaxed text-[var(--status-blocked)]" role="alert">
                                {notificationError}
                            </p>
                        ) : null}

                        <div className="mt-3">
                            <p className="text-xs font-medium text-[var(--foreground)]">Live categories</p>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {NOTIFICATION_TYPES.map((type) => {
                                    const isActive = !preferences.mutedTypes.includes(type)
                                    const label = notificationTypeLabels[type]

                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            aria-pressed={isActive}
                                            aria-label={`${isActive ? 'Mute' : 'Unmute'} ${label.toLowerCase()} notifications`}
                                            onClick={() => toggleType(type)}
                                            className={cn(
                                                'inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-2.5 text-xs font-medium transition-[background-color,border-color,color,opacity,transform] duration-150 ease-[var(--ease-out)]',
                                                'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:translate-y-px',
                                                isActive
                                                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--foreground)]'
                                                    : 'border-[var(--border)] bg-transparent text-[var(--muted)] opacity-70 hover:opacity-100',
                                            )}
                                        >
                                            {categoryIcon(type, 'w-3.5 h-3.5')}
                                            <span className="truncate">{label}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
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
                                        className={`motion-interactive group relative rounded-xl border p-3.5 cursor-pointer ${typeBg(notification)} ${!notification.read ? 'opacity-100' : 'opacity-60'}`}
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
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity"
                                                aria-label="Mark notification as read"
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

        </>,
        document.body,
    )
}
