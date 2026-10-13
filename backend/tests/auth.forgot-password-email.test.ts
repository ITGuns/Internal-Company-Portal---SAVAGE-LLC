import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'

// DB-free: with email delivery off, /forgot-password must answer honestly
// (503 EMAIL_NOT_CONFIGURED) before any user lookup, and never leak a reset link.
process.env.EMAIL_ENABLED = 'false'

async function run() {
  const { AuthController } = await import('../src/auth/auth.controller')
  const { prisma } = await import('../src/database/prisma.service')

  const originalFindUnique = prisma.user.findUnique
  let lookedUp = false
  ;(prisma.user as any).findUnique = async () => {
    lookedUp = true
    throw new Error('no database in this test')
  }

  const app = express()
  app.use(express.json())
  app.use('/auth', new AuthController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo

  try {
    for (const email of ['someone@example.com', 'nobody-here@example.com']) {
      const response = await fetch(`http://127.0.0.1:${port}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await response.json() as Record<string, unknown>
      assert.equal(response.status, 503, 'email-disabled reset answers 503, not a fake success')
      assert.equal(body.code, 'EMAIL_NOT_CONFIGURED')
      assert.match(String(body.error), /not configured/i, 'message tells the user email is not configured')
      assert.ok(!('success' in body), 'no success flag claiming a link was sent')
      assert.ok(!JSON.stringify(body).includes('token='), 'reset link is never returned on this unauthenticated route')
    }
    assert.equal(lookedUp, false, 'no user lookup happens, so the answer cannot reveal account existence')
  } finally {
    ;(prisma.user as any).findUnique = originalFindUnique
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

run()
  .then(() => console.log('auth.forgot-password-email tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
