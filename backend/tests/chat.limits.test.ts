import assert from 'node:assert/strict'
import {
  CHAT_DEFAULT_MESSAGE_LIMIT,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_MAX_MESSAGE_LIMIT,
  CHAT_MAX_SEARCH_QUERY_LENGTH,
  normalizeAttachment,
  normalizeChatCursor,
  normalizeChatLimit,
  normalizeConversationArchiveView,
  normalizeMessageContent,
  normalizeReactionEmoji,
  normalizeSearchQuery,
} from '../src/chat/chat.limits'

assert.equal(normalizeChatLimit(undefined), CHAT_DEFAULT_MESSAGE_LIMIT)
assert.equal(normalizeChatLimit('25'), 25)
assert.equal(normalizeChatLimit('0'), CHAT_DEFAULT_MESSAGE_LIMIT)
assert.equal(normalizeChatLimit('999'), CHAT_MAX_MESSAGE_LIMIT)

assert.equal(normalizeChatCursor(' msg_123 '), 'msg_123')
assert.equal(normalizeChatCursor('../secret'), undefined)
assert.equal(normalizeChatCursor('x'.repeat(129)), undefined)

assert.equal(normalizeSearchQuery(` ${'q'.repeat(200)} `).length, CHAT_MAX_SEARCH_QUERY_LENGTH)
assert.equal(normalizeMessageContent(` ${'m'.repeat(2500)} `).length, CHAT_MAX_MESSAGE_LENGTH)
assert.equal(normalizeAttachment('  data:image/png;base64,abc  '), 'data:image/png;base64,abc')
assert.equal(normalizeAttachment('   '), undefined)
assert.equal(normalizeReactionEmoji(' \u{1F44D} '), '\u{1F44D}')
assert.equal(normalizeReactionEmoji('not-emoji'), '')

assert.equal(normalizeConversationArchiveView(undefined), 'active')
assert.equal(normalizeConversationArchiveView(' archived '), 'archived')
assert.equal(normalizeConversationArchiveView('all'), 'all')
assert.equal(normalizeConversationArchiveView('deleted'), 'active')

console.log('chat.limits tests passed')
