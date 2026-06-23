import assert from 'node:assert/strict'
import {
  shouldEnableSocketRedisAdapter,
  validateSocketRedisAdapterConfig,
} from '../src/notifications/socket.adapter'

function runSocketAdapterTests() {
  assert.equal(shouldEnableSocketRedisAdapter('production', undefined), true)
  assert.equal(shouldEnableSocketRedisAdapter('development', undefined), false)
  assert.equal(shouldEnableSocketRedisAdapter('production', 'false'), false)
  assert.equal(shouldEnableSocketRedisAdapter('development', 'true'), true)

  assert.doesNotThrow(() => validateSocketRedisAdapterConfig({
    enabled: true,
    redisUrl: 'redis://redis:6379',
  }))

  assert.throws(
    () => validateSocketRedisAdapterConfig({ enabled: true, redisUrl: '' }),
    /REDIS_URL is required/i,
  )

  assert.doesNotThrow(() => validateSocketRedisAdapterConfig({
    enabled: false,
    redisUrl: '',
  }))
}

runSocketAdapterTests()
console.log('socket.adapter tests passed')
