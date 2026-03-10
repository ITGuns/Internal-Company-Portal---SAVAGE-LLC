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
        <div className="w-72 border-r border-[var(--border)] bg-[var(--card-surface)] flex flex-col h-full overflow-hidden">
            {/* Channels Section */}
            <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" /> Channels
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
                    </h3>
                    <button
                        onClick={onCreateChannel}
                        className="p-1 hover:bg-[var(--background)] rounded-md text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                        title="Create Channel"
                        aria-label="Create Channel"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-1">
                    {channels.map(c => (
                        <div key={c.id} className="relative group">
                            <button
                                onClick={() => onSelectConversation(c.id)}
                                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-2 ${selectedId === c.id
                                    ? 'bg-[var(--accent)] text-white shadow-sm'
                                    : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <Hash className={`w-4 h-4 ${selectedId === c.id ? 'opacity-100' : 'opacity-40'}`} />
                                <span className="truncate flex-1">{c.name}</span>
                                {unreadCounts[c.id] > 0 && selectedId !== c.id && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                        {unreadCounts[c.id]}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-red-500 text-white transition-opacity ${selectedId === c.id ? 'bg-white text-red-500 hover:bg-red-50' : ''}`}
                                aria-label="Delete channel"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Direct Messages Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> Direct Messages
                    </h3>
                    <button
                        onClick={onNewChat}
                        className="p-1 hover:bg-[var(--background)] rounded-md text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                        title="New Message"
                        aria-label="New Message"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 chat-scroll">
                    {directMessages.map(c => {
                        const other = getOtherParticipant(c)
                        const isActive = selectedId === c.id
                        const isOnline = other?.id ? onlineUserIds.has(other.id) : false
                        return (
                            <button
                                key={c.id}
                                onClick={() => onSelectConversation(c.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 group relative ${isActive
                                    ? 'bg-[var(--accent)] text-white shadow-md'
                                    : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <div className="relative w-8 h-8 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-[var(--background)] border border-[var(--border)] overflow-hidden">
                                    {other?.avatar ? (
                                        <Image src={other.avatar} alt={other.name || 'User avatar'} width={32} height={32} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white text-[10px] font-bold">
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
                                        <div className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-[var(--muted)]'}`}>
                                            {new Date(c.updatedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                {unreadCounts[c.id] > 0 && selectedId !== c.id && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse shadow-sm">
                                        {unreadCounts[c.id]}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteConversation(c.id); }}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-all ${isActive ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-500 text-white shadow-sm'}`}
                                    aria-label="Delete conversation"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </button>
                        )
                    })}
                    {directMessages.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-[var(--muted)] italic">
                            No private chats yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
