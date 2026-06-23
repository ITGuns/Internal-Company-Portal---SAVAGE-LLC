import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import {
  hashLoginRateLimitAccount,
  createAuthRateLimiters,
  resolveAuthRateLimitStoreMode,
  type AuthRateLimitSettings,
} from '../src/security/rate-limits'
import { createSecurityHeadersMiddleware } from '../src/security/security-headers'

type JsonRecord = Record<string, any>

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    body?: JsonRecord
  } = {},
): Promise<{ status: number; body: JsonRecord; headers: Headers }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : {}

  return {
    status: response.status,
    body,
    headers: response.headers,
  }
}

async function withServer<T>(
  app: express.Express,
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.equal(typeof address, 'object')
  assert.ok(address)
  const port = (address as AddressInfo).port

  try {
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

function buildTestAuthApp(settings: AuthRateLimitSettings): express.Express {
  const app = express()
  app.use(express.json())

  const limiters = createAuthRateLimiters({
    settings,
    storeFactory: undefined,
  })

  app.post('/auth/login', limiters.login, (_req, res) => res.json({ ok: true }))
  app.post('/auth/signup', limiters.signup, (_req, res) => res.json({ ok: true }))
  app.post('/auth/forgot-password', limiters.forgotPassword, (_req, res) => res.json({ ok: true }))
  app.post('/auth/reset-password', limiters.resetPassword, (_req, res) => res.json({ ok: true }))

  return app
}

const strictTestLimits: AuthRateLimitSettings = {
  login: { limit: 2, windowMs: 60_000 },
  signup: { limit: 1, windowMs: 60_000 },
  forgotPassword: { limit: 1, windowMs: 60_000 },
  resetPassword: { limit: 1, windowMs: 60_000 },
}

async function runSecurityMiddlewareTests() {
  const firstAccountDigest = hashLoginRateLimitAccount('Employee@Example.com ')
  const normalizedAccountDigest = hashLoginRateLimitAccount('employee@example.com')
  const otherAccountDigest = hashLoginRateLimitAccount('another@example.com')
  assert.equal(firstAccountDigest, normalizedAccountDigest)
  assert.notEqual(firstAccountDigest, otherAccountDigest)
  assert.equal(firstAccountDigest.includes('employee@example.com'), false)

  await withServer(buildTestAuthApp(strictTestLimits), async (baseUrl) => {
    const firstLogin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'employee@example.com', password: 'Password123' },
    })
    assert.equal(firstLogin.status, 200)
    assert.equal(firstLogin.headers.has('ratelimit'), true)

    const secondLogin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'employee@example.com', password: 'Password123' },
    })
    assert.equal(secondLogin.status, 200)

    const blockedLogin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'employee@example.com', password: 'Password123' },
    })
    assert.equal(blockedLogin.status, 429)
    assert.equal(blockedLogin.body.error, 'Too many login attempts. Please try again later.')

    const differentAccountLogin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'another-employee@example.com', password: 'Password123' },
    })
    assert.equal(differentAccountLogin.status, 200)

    const signupStillAllowed = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: { email: 'new@example.com', password: 'Password123', name: 'New User' },
    })
    assert.equal(signupStillAllowed.status, 200)

    const blockedSignup = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: { email: 'new@example.com', password: 'Password123', name: 'New User' },
    })
    assert.equal(blockedSignup.status, 429)
    assert.equal(blockedSignup.body.error, 'Too many signup attempts. Please try again later.')
  })

  assert.equal(resolveAuthRateLimitStoreMode('production'), 'redis')
  assert.equal(resolveAuthRateLimitStoreMode('development'), 'memory')
  assert.equal(resolveAuthRateLimitStoreMode('test'), 'memory')
  assert.equal(resolveAuthRateLimitStoreMode('production', 'memory'), 'memory')
  assert.equal(resolveAuthRateLimitStoreMode('development', 'redis'), 'redis')

  const productionApp = express()
  productionApp.use(createSecurityHeadersMiddleware({ nodeEnv: 'production' }))
  productionApp.get('/health', (_req, res) => res.json({ status: 'healthy' }))

  await withServer(productionApp, async (baseUrl) => {
    const response = await requestJson(baseUrl, '/health')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'none'/)
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/)
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
  })

  const developmentApp = express()
  developmentApp.use(createSecurityHeadersMiddleware({ nodeEnv: 'development' }))
  developmentApp.get('/health', (_req, res) => res.json({ status: 'healthy' }))

  await withServer(developmentApp, async (baseUrl) => {
    const response = await requestJson(baseUrl, '/health')

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('strict-transport-security'), null)
  })
}

runSecurityMiddlewareTests()
  .then(() => {
    console.log('security.middleware tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
