"use client"

import React from 'react'
import Image from 'next/image'
import { Hash, Users, Plus, Trash2 } from 'lucide-react'
import type { Conversation } from '@/lib/chat'

interface ParticipantUser {
    id: string
    name?: string
    avatar?: string
    email?: string
}

interface ChatSidebarProps {
    channels: Conversation[]
    directMessages: Conversation[]
    selectedId: string | null
    unreadCounts: Record<string, number>
    isConnected?: boolean
    onSelectConversation: (id: string) => void
    onDeleteConversation: (id: string) => void
    onCreateChannel: () => void
    onNewChat: () => void
    getOtherParticipant: (conv: Conversation) => ParticipantUser | undefined
    onlineUserIds?: Set<string>
}

export default function ChatSidebar({
    channels,
    directMessages,
    selectedId,
    unreadCounts,
    isConnected = false,
    onSelectConversation,
    onDeleteConversation,
    onCreateChannel,
    onNewChat,
    getOtherParticipant,
    onlineUserIds = new Set(),
}: ChatSidebarProps) {
    return (
        <aside className="w-72 border-r border-[var(--border)] bg-[var(--card-surface)] flex flex-col h-full overflow-hidden" aria-label="Chat conversations">
            {/* Channels Section */}
            <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" aria-hidden="true" /> Channels
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
                    </h2>
                    <button
                        type="button"
                        onClick={onCreateChannel}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        title="Create Channel"
                        aria-label="Create Channel"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="space-y-1">
                    {channels.map(c => (
                        <div key={c.id} className="relative group">
                            <button
                                type="button"
                                onClick={() => onSelectConversation(c.id)}
                                className={`flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 pr-11 text-left text-sm transition-all ${selectedId === c.id
                                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm'
                                    : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <Hash className={`w-4 h-4 ${selectedId === c.id ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true" />
                                <span className="truncate flex-1">{c.name}</span>
                                {unreadCounts[c.id] > 0 && selectedId !== c.id && (
                                    <span className="bg-red-700 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                        {unreadCounts[c.id]}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                                className={`absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-red-700 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${selectedId === c.id ? 'bg-[var(--accent-foreground)] text-red-700 hover:bg-white' : ''}`}
                                aria-label="Delete channel"
                            >
                                <Trash2 className="w-3 h-3" aria-hidden="true" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Direct Messages Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" /> Direct Messages
                    </h2>
                    <button
                        type="button"
                        onClick={onNewChat}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        title="New Message"
                        aria-label="New Message"
                    >
                        <Plus className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <div tabIndex={0} aria-label="Direct messages" className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 chat-scroll focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                    {directMessages.map(c => {
                        const other = getOtherParticipant(c)
                        const isActive = selectedId === c.id
                        const isOnline = other?.id ? onlineUserIds.has(other.id) : false
                        return (
                            <div key={c.id} className="relative group">
                                <button
                                    type="button"
                                    onClick={() => onSelectConversation(c.id)}
                                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 pr-11 text-left text-sm transition-all ${isActive
                                        ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-md'
                                        : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                        }`}
                                >
                                    <div className="relative w-8 h-8 flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
                                        {other?.avatar ? (
                                            <Image src={other.avatar} alt={other.name || 'User avatar'} width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-[var(--accent-foreground)] text-[10px] font-bold">
                                                {other?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        </div>
                                        {/* Online status dot */}
                                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--card-surface)] ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div>
                                            <div className="font-medium line-clamp-1">{other?.name || 'Unknown User'}</div>
                                            <div className={`text-[10px] truncate ${isActive ? 'text-[var(--accent-foreground)] opacity-70' : 'text-[var(--muted)]'}`}>
                                                {new Date(c.updatedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    {unreadCounts[c.id] > 0 && selectedId !== c.id && (
                                        <span className="bg-red-700 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                            {unreadCounts[c.id]}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                                    className={`absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${isActive ? 'bg-[var(--accent-foreground)]/20 text-[var(--accent-foreground)] hover:bg-[var(--accent-foreground)]/30' : 'bg-red-700 text-white shadow-sm'}`}
                                    aria-label="Delete conversation"
                                >
                                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                                </button>
                            </div>
                        )
                    })}
                    {directMessages.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-[var(--muted)] italic">
                            No private chats yet
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
