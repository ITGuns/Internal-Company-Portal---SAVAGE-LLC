"use client"

import React, { useEffect, useState } from 'react'
import { Download, Paperclip } from 'lucide-react'
import {
    downloadChatAttachment,
    fetchChatAttachmentBlob,
    formatAttachmentSize,
    parseChatAttachment,
    type ChatAttachmentFile,
} from '@/lib/chat'

const FRAME = 'mt-2 rounded-lg overflow-hidden border border-[var(--border)] bg-black/10'

/** A message's file: stored uploads load through the API with the access token; older inline files render as before. */
export default function MessageAttachment({ attachment }: { attachment: string }) {
    const parsed = parseChatAttachment(attachment)
    if (!parsed) return null

    if (parsed.kind === 'inline') {
        const src = parsed.src
        return (
            <div className={FRAME}>
                {src.startsWith('data:image/') || src.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                        src={src}
                        alt="Attachment"
                        className="max-h-60 w-auto object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                        onClick={() => window.open(src, '_blank')}
                    />
                ) : (
                    <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 text-xs bg-[var(--background)] hover:bg-[var(--card-surface)] transition-colors"
                    >
                        <Paperclip className="w-4 h-4" />
                        <span className="truncate max-w-[200px]">View Attachment</span>
                    </a>
                )}
            </div>
        )
    }

    return parsed.file.type.startsWith('image/')
        ? <StoredImage file={parsed.file} />
        : <StoredFile file={parsed.file} />
}

function StoredImage({ file }: { file: ChatAttachmentFile }) {
    const [url, setUrl] = useState<string | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let objectUrl: string | null = null
        let cancelled = false
        fetchChatAttachmentBlob(file.uploadId)
            .then((blob) => {
                if (cancelled) return
                objectUrl = URL.createObjectURL(blob)
                setUrl(objectUrl)
            })
            .catch(() => {
                if (!cancelled) setFailed(true)
            })
        return () => {
            cancelled = true
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [file.uploadId])

    if (failed) {
        return (
            <div className={FRAME}>
                <p className="flex items-center gap-2 p-3 text-xs bg-[var(--background)] text-[var(--muted)]">
                    <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate max-w-[200px]">{file.name} could not be loaded</span>
                </p>
            </div>
        )
    }

    return (
        <div className={FRAME}>
            {url ? (
                <button
                    type="button"
                    onClick={() => window.open(url, '_blank', 'noopener')}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label={`Open ${file.name}`}
                >
                    <img
                        src={url}
                        alt={file.name}
                        className="max-h-60 w-auto object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                    />
                </button>
            ) : (
                <p className="flex h-24 w-48 items-center justify-center bg-[var(--background)] text-xs text-[var(--muted)]" aria-busy="true">
                    Loading image...
                </p>
            )}
        </div>
    )
}

function StoredFile({ file }: { file: ChatAttachmentFile }) {
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDownload = async () => {
        setDownloading(true)
        setError(null)
        try {
            await downloadChatAttachment(file)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not download the file. Try again.')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className={FRAME}>
            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex w-full items-center gap-2 p-3 text-left text-xs bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--card-surface)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-70"
                aria-label={`Download ${file.name}`}
            >
                <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate max-w-[200px] font-medium">{file.name}</span>
                    <span className="block text-[10px] text-[var(--muted)]">
                        {downloading ? 'Downloading...' : formatAttachmentSize(file.size)}
                    </span>
                </span>
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
            {error && (
                <p role="alert" className="px-3 pb-2 text-[10px] font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    )
}
