"use client"

import React from 'react'
import Card from '@/components/Card'
import Button from '@/components/Button'
import Image from 'next/image'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import { X, Search } from 'lucide-react'
import type { User } from '@/lib/users'
import { buildChatUserPickerSections, getChatUserRoleSummary } from '@/lib/chat-user-picker'

interface CreateChannelModalProps {
    isOpen: boolean
    onClose: () => void
    channelName: string
    onChannelNameChange: (value: string) => void
    selectedUsers: string[]
    onSelectedUsersChange: (users: string[]) => void
    searchQuery: string
    onSearchQueryChange: (value: string) => void
    users: User[]
    currentUserId: string | undefined
    onCreateChannel: () => void
}

export default function CreateChannelModal({
    isOpen,
    onClose,
    channelName,
    onChannelNameChange,
    selectedUsers,
    onSelectedUsersChange,
    searchQuery,
    onSearchQueryChange,
    users,
    currentUserId,
    onCreateChannel,
}: CreateChannelModalProps) {
    const dialogTitleId = React.useId()
    const dialogDescriptionId = React.useId()
    const channelNameId = React.useId()
    const memberSearchId = React.useId()
    const { dialogRef, handleDialogKeyDown } = useDialogA11y({ isOpen, onClose })

    const selectableUsers = users.filter(u => u.id !== currentUserId)
    const userSections = buildChatUserPickerSections(users, currentUserId, searchQuery)
    const filteredUserCount = userSections.reduce((total, section) => total + section.users.length, 0)

    if (!isOpen) return null

    return (
        <div className="portal-form-backdrop absolute inset-0 z-50 flex items-center justify-center p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                tabIndex={-1}
                onKeyDown={handleDialogKeyDown}
                className="w-full max-w-md"
            >
            <Card className="h-[550px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-surface)]">
                    <h2 id={dialogTitleId} className="font-bold text-lg text-[var(--foreground)]">Create Channel</h2>
                    <p id={dialogDescriptionId} className="sr-only">
                        Name a channel and choose the members who should be included.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 hover:bg-[var(--background)] rounded-full transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" aria-hidden="true" />
                    </button>
                </div>

                <div className="p-4 border-b border-[var(--border)] flex flex-col gap-4 bg-[var(--card-surface)]">
                    <div>
                        <label htmlFor={channelNameId} className="block text-sm font-semibold mb-2 text-[var(--foreground)]">
                            Channel Name
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold" aria-hidden="true">#</span>
                            <input
                                id={channelNameId}
                                autoFocus
                                placeholder="e.g. general-discussions"
                                className="w-full pl-8 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                                value={channelName}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                    onChannelNameChange(val)
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor={memberSearchId} className="block text-sm font-semibold mb-2 text-[var(--foreground)]">Search Members</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--muted)]" aria-hidden="true" />
                            <input
                                id={memberSearchId}
                                placeholder="Search people..."
                                className="w-full pl-10 pr-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none"
                                value={searchQuery}
                                onChange={(e) => onSearchQueryChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]/50 text-xs font-semibold text-[var(--muted)] items-center flex justify-between">
                    <span>Select Members ({selectedUsers.length} selected)</span>
                    <button
                        type="button"
                        className={`text-[var(--accent)] hover:underline ${selectedUsers.length === selectableUsers.length ? 'hidden' : ''}`}
                        onClick={() => onSelectedUsersChange(selectableUsers.map(u => u.id))}
                    >
                        Select All
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 chat-scroll">
                    {userSections.map((section) => (
                        <section key={section.id} className="mb-3 last:mb-0">
                            <div className="px-3 py-2">
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">{section.title}</h3>
                                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{section.subtitle}</p>
                            </div>
                            <div className="space-y-1">
                                {section.users.map(u => {
                                    const isSelected = selectedUsers.includes(u.id)
                                    return (
                                        <button
                                            key={u.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() => {
                                                onSelectedUsersChange(
                                                    isSelected
                                                        ? selectedUsers.filter(id => id !== u.id)
                                                        : [...selectedUsers, u.id]
                                                )
                                            }}
                                            className={`w-full text-left p-3 hover:bg-[var(--background)] rounded-xl flex items-center justify-between gap-3 transition-all ${isSelected ? 'bg-[var(--accent)]/10' : ''}`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--card-surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                                                    {u.avatar ? <Image src={u.avatar} alt={u.name || 'User avatar'} width={40} height={40} className="w-full h-full object-cover" /> : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm font-bold">
                                                            {u.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold text-sm text-[var(--foreground)]">{u.name}</p>
                                                    <p className="truncate text-xs text-[var(--muted)]">{getChatUserRoleSummary(u)}</p>
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border flex flex-shrink-0 items-center justify-center transition-colors ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--muted)]'}`}>
                                                {isSelected && <svg className="w-3 h-3 text-[var(--accent-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                    {filteredUserCount === 0 && (
                        <div className="text-center py-10 text-[var(--muted)]">
                            No team members found.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--card-surface)]">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={onCreateChannel}
                        disabled={!channelName.trim() || selectedUsers.length === 0}
                    >
                        Create Channel
                    </Button>
                </div>
            </Card>
            </div>
        </div>
    )
}
