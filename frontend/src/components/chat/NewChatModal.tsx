"use client"

import React from 'react'
import Card from '@/components/Card'
import Image from 'next/image'
import { X, Search } from 'lucide-react'
import type { User } from '@/lib/users'

interface NewChatModalProps {
    isOpen: boolean
    onClose: () => void
    searchQuery: string
    onSearchQueryChange: (value: string) => void
    users: User[]
    currentUserId: string | undefined
    onStartChat: (user: User) => void
}

export default function NewChatModal({
    isOpen,
    onClose,
    searchQuery,
    onSearchQueryChange,
    users,
    currentUserId,
    onStartChat,
}: NewChatModalProps) {
    if (!isOpen) return null

    const filteredUsers = users.filter(
        u => u.id !== currentUserId &&
            (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md h-[450px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-surface)]">
                    <h3 className="font-bold text-lg">Send a Message</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--background)] rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-4 bg-[var(--card-surface)]">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--muted)]" />
                        <input
                            autoFocus
                            placeholder="Search people by name or email..."
                            className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                            value={searchQuery}
                            onChange={(e) => onSearchQueryChange(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 chat-scroll">
                    {filteredUsers.map(u => (
                        <button
                            key={u.id}
                            onClick={() => onStartChat(u)}
                            className="w-full text-left p-3 hover:bg-[var(--background)] rounded-xl flex items-center gap-4 transition-all hover:translate-x-1"
                        >
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--card-surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                                {u.avatar ? (
                                    <Image src={u.avatar} alt={u.name || 'User avatar'} width={48} height={48} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm font-bold">
                                        {u.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-[var(--foreground)]">{u.name}</p>
                                <p className="text-xs text-[var(--muted)] truncate">{u.email}</p>
                            </div>
                        </button>
                    ))}
                    {filteredUsers.length === 0 && (
                        <div className="text-center py-10 text-[var(--muted)]">
                            No team members found.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
