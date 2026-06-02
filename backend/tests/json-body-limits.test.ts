import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import {
  configureJsonBodyParsers,
  DEFAULT_JSON_BODY_LIMIT,
  LARGE_JSON_BODY_LIMIT,
  shouldUseLargeJsonBodyLimit,
} from '../src/security/json-body-limits'

type JsonRecord = Record<string, unknown>

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

async function postJson(baseUrl: string, path: string, body: JsonRecord): Promise<{ status: number; body: JsonRecord }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  }
}

function buildBodyLimitApp(): express.Express {
  const app = express()
  configureJsonBodyParsers(app)

  app.post('/api/tasks', (req, res) => {
    res.json({ size: String(req.body.payload || '').length })
  })

  app.post('/api/uploads', (req, res) => {
    res.json({ size: String(req.body.payload || '').length })
  })

  app.post('/api/users/:id/avatar', (req, res) => {
    res.json({ size: String(req.body.avatar || '').length })
  })

  app.use((err: Error & { type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Payload too large' })
    }

    return res.status(500).json({ error: 'Unexpected body parser error' })
  })

  return app
}

async function runJsonBodyLimitTests() {
  assert.equal(DEFAULT_JSON_BODY_LIMIT, '1mb')
  assert.equal(LARGE_JSON_BODY_LIMIT, '16mb')

  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/uploads' }), true)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/uploads/avatar' }), true)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/users/user-1/avatar' }), true)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'PATCH', path: '/api/users/user-1' }), true)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/employees/request-verification' }), true)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'GET', path: '/api/uploads' }), false)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/tasks' }), false)
  assert.equal(shouldUseLargeJsonBodyLimit({ method: 'POST', path: '/api/users/user-1/roles' }), false)

  await withServer(buildBodyLimitApp(), async (baseUrl) => {
    const smallPayload = 'a'.repeat(1024)
    const mediumPayload = 'a'.repeat(1_200_000)

    const normalSmall = await postJson(baseUrl, '/api/tasks', { payload: smallPayload })
    assert.equal(normalSmall.status, 200)
    assert.equal(normalSmall.body.size, smallPayload.length)

    const normalLarge = await postJson(baseUrl, '/api/tasks', { payload: mediumPayload })
    assert.equal(normalLarge.status, 413)
    assert.equal(normalLarge.body.error, 'Payload too large')

    const uploadLarge = await postJson(baseUrl, '/api/uploads', { payload: mediumPayload })
    assert.equal(uploadLarge.status, 200)
    assert.equal(uploadLarge.body.size, mediumPayload.length)

    const avatarLarge = await postJson(baseUrl, '/api/users/user-1/avatar', { avatar: mediumPayload })
    assert.equal(avatarLarge.status, 200)
    assert.equal(avatarLarge.body.size, mediumPayload.length)
  })
}

runJsonBodyLimitTests()
  .then(() => {
    console.log('json-body-limits tests passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
