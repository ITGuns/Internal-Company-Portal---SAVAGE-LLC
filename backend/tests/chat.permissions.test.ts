import assert from 'node:assert/strict'
import { canCreateConversation } from '../src/chat/chat.permissions'

const base = { requesterId: 'u1', isPrivileged: false }

assert.equal(canCreateConversation(base, { type: 'direct', participantIds: ['u1', 'u2'] }), true)
assert.equal(canCreateConversation(base, { type: 'direct', participantIds: ['u2', 'u3'] }), false)
assert.equal(canCreateConversation(base, { type: 'channel', participantIds: ['u1', 'u2'] }), false)
assert.equal(canCreateConversation(base, { type: 'group', participantIds: ['u1', 'u2'], name: 'General' }), false)
assert.equal(canCreateConversation({ ...base, isPrivileged: true }, { type: 'channel', participantIds: ['u1', 'u2'], name: 'General' }), true)

console.log('chat.permissions tests passed')
