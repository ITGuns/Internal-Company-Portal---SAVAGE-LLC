import assert from 'node:assert/strict'
import { createLogger } from '../src/observability/logger'

type CapturedLogs = {
  log: string[]
  warn: string[]
  error: string[]
}

function captureConsole(run: (captured: CapturedLogs) => void): void {
  const captured: CapturedLogs = { log: [], warn: [], error: [] }
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = (message?: unknown) => {
    captured.log.push(String(message))
  }
  console.warn = (message?: unknown) => {
    captured.warn.push(String(message))
  }
  console.error = (message?: unknown) => {
    captured.error.push(String(message))
  }

  try {
    run(captured)
  } finally {
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
  }
}

function withEnv(env: Record<string, string | undefined>, run: () => void): void {
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  )

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    run()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function runLoggerTests() {
  withEnv({ LOG_LEVEL: 'info', NODE_ENV: 'production' }, () => {
    captureConsole((captured) => {
      const logger = createLogger('logger.test')
      logger.info('User owner@example.com saved a token', {
        email: 'owner@example.com',
        accessToken: 'raw-token',
        nested: {
          password: 'Password123',
          notes: ['manager@example.com'],
        },
      })

      assert.equal(captured.log.length, 1)
      const payload = JSON.parse(captured.log[0])
      assert.equal(payload.scope, 'logger.test')
      assert.equal(payload.message, 'User [redacted-email] saved a token')
      assert.equal(payload.context.email, '[redacted-email]')
      assert.equal(payload.context.accessToken, '[redacted]')
      assert.equal(payload.context.nested.password, '[redacted]')
      assert.deepEqual(payload.context.nested.notes, ['[redacted-email]'])
      assert.equal(captured.log[0].includes('raw-token'), false)
      assert.equal(captured.log[0].includes('owner@example.com'), false)
    })
  })

  withEnv({ LOG_LEVEL: 'info', NODE_ENV: 'production' }, () => {
    captureConsole((captured) => {
      const logger = createLogger('logger.test')
      logger.error('Failed for support@example.com', new Error('Provider rejected support@example.com'))

      assert.equal(captured.error.length, 1)
      const payload = JSON.parse(captured.error[0])
      assert.equal(payload.message, 'Failed for [redacted-email]')
      assert.equal(payload.context.detail.message, 'Provider rejected [redacted-email]')
      assert.equal(Object.prototype.hasOwnProperty.call(payload.context.detail, 'stack'), false)
    })
  })

  withEnv({ LOG_LEVEL: 'error', NODE_ENV: 'production' }, () => {
    captureConsole((captured) => {
      const logger = createLogger('logger.test')
      logger.info('This should not be emitted')
      logger.error('This should be emitted')

      assert.equal(captured.log.length, 0)
      assert.equal(captured.error.length, 1)
    })
  })
}

runLoggerTests()
console.log('observability.logger tests passed')
