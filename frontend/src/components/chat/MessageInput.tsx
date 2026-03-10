"use client"

import React, { useRef } from 'react'
import { Send, Paperclip, X } from 'lucide-react'

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
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            aria-label="Remove attachment"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{attachment?.name}</p>
                        <p className="text-[10px] text-[var(--muted)]">{(attachment!.size / 1024).toFixed(1)} KB</p>
                    </div>
                </div>
            )}
            <form onSubmit={onSend} className="flex gap-3 items-center">
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
                    className="p-2 text-[var(--muted)] hover:text-[var(--accent)] transition-colors rounded-full hover:bg-[var(--background)]"
                    aria-label="Attach file"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
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
                    className="p-3 bg-[var(--accent)] text-white rounded-full hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    aria-label="Send message"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    )
}
