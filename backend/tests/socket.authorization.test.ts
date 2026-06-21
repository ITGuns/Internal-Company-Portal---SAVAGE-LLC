import assert from 'node:assert/strict'
import {
  buildAuthorizedTypingPayload,
  isAuthorizedConversationParticipant,
  normalizeSocketConversationId,
} from '../src/notifications/socket.authorization'

const socketUser = {
  userId: 'user-1',
  email: 'employee@example.com',
  name: 'Employee Name',
}

async function runSocketAuthorizationTests() {
  assert.equal(normalizeSocketConversationId(' conv_123 '), 'conv_123')
  assert.equal(normalizeSocketConversationId(''), null)
  assert.equal(normalizeSocketConversationId('../secret'), null)
  assert.equal(normalizeSocketConversationId({ conversationId: 'conv_123' }), null)
  assert.equal(normalizeSocketConversationId('x'.repeat(129)), null)

  assert.deepEqual(
    buildAuthorizedTypingPayload(
      {
        conversationId: 'conv_123',
        userId: 'spoofed-user',
        userName: 'Spoofed Name',
      },
      socketUser,
    ),
    {
      conversationId: 'conv_123',
      userId: 'user-1',
      userName: 'Employee Name',
    },
  )

  assert.deepEqual(
    buildAuthorizedTypingPayload({ conversationId: 'conv_123' }, { ...socketUser, name: undefined }),
    {
      conversationId: 'conv_123',
      userId: 'user-1',
      userName: 'employee@example.com',
    },
  )

  assert.equal(buildAuthorizedTypingPayload({ conversationId: '../secret' }, socketUser), null)
  assert.equal(buildAuthorizedTypingPayload(null, socketUser), null)

  let participantLookupCount = 0
  const participantRepository = {
    async findUnique(args: unknown) {
      participantLookupCount += 1
      assert.deepEqual(args, {
        where: {
          conversationId_userId: {
            conversationId: 'conv_123',
            userId: 'user-1',
          },
        },
        select: { id: true },
      })
      return { id: 'participant-1' }
    },
  }

  assert.equal(await isAuthorizedConversationParticipant(participantRepository, 'conv_123', 'user-1'), true)
  assert.equal(participantLookupCount, 1)

  assert.equal(await isAuthorizedConversationParticipant(participantRepository, '../secret', 'user-1'), false)
  assert.equal(participantLookupCount, 1)

  const missingParticipantRepository = {
    async findUnique() {
      return null
    },
  }

  assert.equal(await isAuthorizedConversationParticipant(missingParticipantRepository, 'conv_123', 'user-1'), false)

  console.log('socket.authorization tests passed')
}

runSocketAuthorizationTests().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
