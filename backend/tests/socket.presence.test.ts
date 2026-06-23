import assert from 'node:assert/strict'
import { collectOnlineUserIds } from '../src/notifications/socket.presence'

function runSocketPresenceTests() {
  assert.deepEqual(collectOnlineUserIds([
    { data: { user: { userId: 'user-2' } } },
    { data: { user: { userId: 'user-1' } } },
    { data: { user: { userId: 'user-2' } } },
    { data: {} },
  ]), ['user-1', 'user-2'])
}

runSocketPresenceTests()
console.log('socket.presence tests passed')
