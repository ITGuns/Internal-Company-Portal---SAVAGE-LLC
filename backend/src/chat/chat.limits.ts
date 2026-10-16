import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '../uploads/upload.validation'

export const CHAT_DEFAULT_MESSAGE_LIMIT = 50
export const CHAT_MAX_MESSAGE_LIMIT = 100
export const CHAT_MAX_SEARCH_QUERY_LENGTH = 120
export const CHAT_MAX_MESSAGE_LENGTH = 2000
export const CHAT_MAX_ID_LENGTH = 128
export const CHAT_ARCHIVE_VIEWS = new Set(['active', 'archived', 'all'])
export type ChatArchiveView = 'active' | 'archived' | 'all'
export const CHAT_ALLOWED_REACTIONS = new Set([
  '\u{1F44D}',
  '\u2705',
  '\u{1F602}',
  '\u{1F525}',
  '\u2764\uFE0F',
  '\u{1F440}',
])

const SAFE_CHAT_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export function normalizeChatLimit(value: unknown): number {
  if (typeof value !== 'string') return CHAT_DEFAULT_MESSAGE_LIMIT

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return CHAT_DEFAULT_MESSAGE_LIMIT

  return Math.min(parsed, CHAT_MAX_MESSAGE_LIMIT)
}

export function normalizeChatCursor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const cursor = value.trim()
  if (!cursor || cursor.length > CHAT_MAX_ID_LENGTH) return undefined
  if (!SAFE_CHAT_ID_PATTERN.test(cursor)) return undefined

  return cursor
}

export function normalizeSearchQuery(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, CHAT_MAX_SEARCH_QUERY_LENGTH)
}

export function normalizeMessageContent(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, CHAT_MAX_MESSAGE_LENGTH)
}

/**
 * New messages store this in Message.attachment as a JSON string; the file itself lives in the
 * uploads service. Older rows hold the file inline as a data URI and are returned unchanged.
 */
export interface ChatAttachment {
  name: string
  type: string
  size: number
  uploadId: string
}

export interface StoredUploadFacts {
  originalName: string
  contentType: string
  sizeBytes: number
}

export const CHAT_INLINE_ATTACHMENT_ERROR =
  'Inline file data is not accepted. Upload the file with POST /api/uploads, then send its name, type, size and uploadId.'

/** Reads the attachment of a new message. Inline file data (a data URI or a data field) is refused. */
export function normalizeAttachment(value: unknown): { attachment?: ChatAttachment; error?: string } {
  if (value === undefined || value === null) return {}
  if (typeof value === 'string') return value.trim() ? { error: CHAT_INLINE_ATTACHMENT_ERROR } : {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Attachment must be an object with name, type, size and uploadId' }
  }

  const input = value as Record<string, unknown>
  if ('data' in input) return { error: CHAT_INLINE_ATTACHMENT_ERROR }

  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const type = typeof input.type === 'string' ? input.type.trim().toLowerCase() : ''
  const uploadId = typeof input.uploadId === 'string' ? input.uploadId.trim() : ''
  const size = input.size
  if (
    !name
    || !type
    || !uploadId
    || uploadId.length > CHAT_MAX_ID_LENGTH
    || !SAFE_CHAT_ID_PATTERN.test(uploadId)
    || typeof size !== 'number'
    || !Number.isInteger(size)
    || size < 1
  ) {
    return { error: 'Attachment must be an object with name, type, size and uploadId' }
  }
  if (size > MAX_UPLOAD_BYTES) return { error: `Attachment too large (max ${MAX_UPLOAD_LABEL})` }

  return { attachment: { name, type, size, uploadId } }
}

/** Name and type must match the stored record where it has them; size must equal it. */
export function matchesStoredUpload(attachment: ChatAttachment, upload: StoredUploadFacts): boolean {
  return (!upload.originalName || attachment.name === upload.originalName)
    && (!upload.contentType || attachment.type === upload.contentType.toLowerCase())
    && attachment.size === upload.sizeBytes
    && upload.sizeBytes <= MAX_UPLOAD_BYTES
}

/** The stored-upload shape of a saved Message.attachment, or null for older inline values. */
export function parseStoredChatAttachment(value: string | null | undefined): ChatAttachment | null {
  if (typeof value !== 'string' || !value.startsWith('{')) return null

  try {
    const parsed = JSON.parse(value) as Partial<ChatAttachment> | null
    if (
      parsed
      && typeof parsed.uploadId === 'string' && parsed.uploadId
      && typeof parsed.name === 'string'
      && typeof parsed.type === 'string'
      && typeof parsed.size === 'number'
    ) {
      return { name: parsed.name, type: parsed.type, size: parsed.size, uploadId: parsed.uploadId }
    }
  } catch {
    // Not JSON: an older inline value.
  }
  return null
}

export function normalizeReactionEmoji(value: unknown): string {
  if (typeof value !== 'string') return ''

  const emoji = value.trim()
  return CHAT_ALLOWED_REACTIONS.has(emoji) ? emoji : ''
}

export function normalizeConversationArchiveView(value: unknown): ChatArchiveView {
  if (typeof value !== 'string') return 'active'

  const view = value.trim().toLowerCase()
  return CHAT_ARCHIVE_VIEWS.has(view) ? view as ChatArchiveView : 'active'
}
