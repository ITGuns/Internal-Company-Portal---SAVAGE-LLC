import assert from 'node:assert/strict'
import {
  CHAT_DEFAULT_MESSAGE_LIMIT,
  CHAT_MAX_MESSAGE_LENGTH,
  CHAT_MAX_MESSAGE_LIMIT,
  CHAT_MAX_SEARCH_QUERY_LENGTH,
  CHAT_INLINE_ATTACHMENT_ERROR,
  matchesStoredUpload,
  normalizeAttachment,
  normalizeChatCursor,
  normalizeChatLimit,
  normalizeConversationArchiveView,
  normalizeMessageContent,
  normalizeReactionEmoji,
  normalizeSearchQuery,
  parseStoredChatAttachment,
} from '../src/chat/chat.limits'
import { MAX_UPLOAD_BYTES } from '../src/uploads/upload.validation'

assert.equal(normalizeChatLimit(undefined), CHAT_DEFAULT_MESSAGE_LIMIT)
assert.equal(normalizeChatLimit('25'), 25)
assert.equal(normalizeChatLimit('0'), CHAT_DEFAULT_MESSAGE_LIMIT)
assert.equal(normalizeChatLimit('999'), CHAT_MAX_MESSAGE_LIMIT)

assert.equal(normalizeChatCursor(' msg_123 '), 'msg_123')
assert.equal(normalizeChatCursor('../secret'), undefined)
assert.equal(normalizeChatCursor('x'.repeat(129)), undefined)

assert.equal(normalizeSearchQuery(` ${'q'.repeat(200)} `).length, CHAT_MAX_SEARCH_QUERY_LENGTH)
assert.equal(normalizeMessageContent(` ${'m'.repeat(2500)} `).length, CHAT_MAX_MESSAGE_LENGTH)
const attachment = { name: 'photo.png', type: 'image/png', size: 1200, uploadId: 'cupload123' }
assert.deepEqual(normalizeAttachment(undefined), {})
assert.deepEqual(normalizeAttachment('   '), {})
assert.deepEqual(normalizeAttachment({ ...attachment, name: ' photo.png ', type: 'IMAGE/PNG' }), { attachment })
assert.equal(normalizeAttachment('  data:image/png;base64,abc  ').error, CHAT_INLINE_ATTACHMENT_ERROR, 'a data URI is refused')
assert.equal(normalizeAttachment({ ...attachment, data: 'data:image/png;base64,abc' }).error, CHAT_INLINE_ATTACHMENT_ERROR, 'a data field is refused')
assert.match(normalizeAttachment({ ...attachment, uploadId: '../x' }).error || '', /uploadId/)
assert.match(normalizeAttachment({ ...attachment, size: '1200' }).error || '', /size/)
assert.match(normalizeAttachment({ ...attachment, size: MAX_UPLOAD_BYTES + 1 }).error || '', /3 MB/)

const record = { originalName: 'photo.png', contentType: 'image/png', sizeBytes: 1200 }
assert.equal(matchesStoredUpload(attachment, record), true)
assert.equal(matchesStoredUpload({ ...attachment, size: 1201 }, record), false, 'size must equal the stored size')
assert.equal(matchesStoredUpload({ ...attachment, name: 'other.png' }, record), false, 'name must match')
assert.equal(matchesStoredUpload({ ...attachment, type: 'application/pdf' }, record), false, 'type must match')

assert.deepEqual(parseStoredChatAttachment(JSON.stringify(attachment)), attachment)
assert.equal(parseStoredChatAttachment('data:image/png;base64,abc'), null, 'older inline values are not the stored shape')
assert.equal(parseStoredChatAttachment('{not json'), null)
assert.equal(parseStoredChatAttachment(null), null)

assert.equal(normalizeReactionEmoji(' \u{1F44D} '), '\u{1F44D}')
assert.equal(normalizeReactionEmoji('not-emoji'), '')

assert.equal(normalizeConversationArchiveView(undefined), 'active')
assert.equal(normalizeConversationArchiveView(' archived '), 'archived')
assert.equal(normalizeConversationArchiveView('all'), 'all')
assert.equal(normalizeConversationArchiveView('deleted'), 'active')

console.log('chat.limits tests passed')
