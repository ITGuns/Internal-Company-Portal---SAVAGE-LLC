"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Smile, X } from 'lucide-react'

interface MessageInputProps {
    newMessage: string
    onMessageChange: (value: string) => void
    onSend: (e?: React.FormEvent) => void
    sending: boolean
    attachment: File | null
    attachmentPreview: string | null
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
    onClearAttachment: () => void
    placeholder: string
}

const QUICK_EMOJI = ['\u{1F44D}', '\u2705', '\u{1F602}', '\u{1F525}', '\u2764\uFE0F', '\u{1F440}']

export default function MessageInput({
    newMessage,
    onMessageChange,
    onSend,
    sending,
    attachment,
    attachmentPreview,
    onFileSelect,
    onClearAttachment,
    placeholder,
}: MessageInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)

    useEffect(() => {
        if (!emojiPickerOpen) return

        const handlePointerDown = (event: PointerEvent) => {
            if (emojiPickerRef.current?.contains(event.target as Node)) return
            setEmojiPickerOpen(false)
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setEmojiPickerOpen(false)
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [emojiPickerOpen])

    return (
        <div className="p-4 bg-[var(--card-surface)] border-t border-[var(--border)] shadow-lg">
            {attachmentPreview && (
                <div className="mb-4 flex items-center gap-3 p-2 bg-[var(--background)] rounded-xl border border-[var(--border)] animate-in slide-in-from-bottom-2">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
                        {attachment?.type.startsWith('image/') ? (
                            <img src={attachmentPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--accent)] text-white">
                                <Paperclip className="w-6 h-6" />
                            </div>
                        )}
                        <button
                            onClick={onClearAttachment}
                            className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Remove attachment"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{attachment?.name}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                            {(attachment!.size / 1024).toFixed(1)} KB
                            {attachment?.type === 'image/gif' ? ' GIF' : ''}
                        </p>
                    </div>
                </div>
            )}
            <form onSubmit={onSend} className="flex min-w-0 items-center gap-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileSelect}
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    aria-label="Attach file"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--background)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label="Attach file, image, or GIF"
                    title="Attach file, image, or GIF"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <div ref={emojiPickerRef} className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setEmojiPickerOpen(prev => !prev)}
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${emojiPickerOpen
                            ? 'bg-[var(--accent)]/15 text-[var(--foreground)]'
                            : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--accent)]'
                            }`}
                        aria-label={emojiPickerOpen ? 'Close emoji shortcuts' : 'Open emoji shortcuts'}
                        aria-expanded={emojiPickerOpen}
                        aria-controls="message-emoji-picker"
                        title="Emoji shortcuts"
                    >
                        <Smile className="w-5 h-5" aria-hidden="true" />
                    </button>
                    {emojiPickerOpen && (
                        <div
                            id="message-emoji-picker"
                            role="group"
                            aria-label="Quick emoji"
                            className="absolute bottom-full left-0 z-20 mb-3 flex w-max max-w-[calc(100vw-2rem)] items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card-surface)]/95 p-1 shadow-xl backdrop-blur-md"
                        >
                            {QUICK_EMOJI.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                        onMessageChange(`${newMessage}${emoji}`)
                                        setEmojiPickerOpen(false)
                                    }}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors hover:bg-[var(--background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                    aria-label={`Insert ${emoji}`}
                                >
                                    <span aria-hidden="true">{emoji}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative min-w-0 flex-1">
                    <input
                        value={newMessage}
                        onChange={(e) => onMessageChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                onSend()
                            }
                        }}
                    />
                </div>
                  <button
                      type="submit"
                      disabled={(!newMessage.trim() && !attachment) || sending}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white transition-all hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:scale-95 disabled:scale-100 disabled:opacity-50"
                      aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    )
}
