export const CHAT_DEFAULT_MESSAGE_LIMIT = 50
export const CHAT_MAX_MESSAGE_LIMIT = 100
export const CHAT_MAX_SEARCH_QUERY_LENGTH = 120
export const CHAT_MAX_MESSAGE_LENGTH = 2000
export const CHAT_MAX_ID_LENGTH = 128
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

export function normalizeAttachment(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const attachment = value.trim()
  return attachment || undefined
}

export function normalizeReactionEmoji(value: unknown): string {
  if (typeof value !== 'string') return ''

  const emoji = value.trim()
  return CHAT_ALLOWED_REACTIONS.has(emoji) ? emoji : ''
}
