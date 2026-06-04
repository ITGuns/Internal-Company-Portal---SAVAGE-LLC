export const CHAT_DEFAULT_MESSAGE_LIMIT = 50
export const CHAT_MAX_MESSAGE_LIMIT = 100
export const CHAT_MAX_SEARCH_QUERY_LENGTH = 120
export const CHAT_MAX_MESSAGE_LENGTH = 2000
export const CHAT_MAX_ID_LENGTH = 128

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

export function normalizeAttachment(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const attachment = value.trim()
  return attachment || undefined
}
