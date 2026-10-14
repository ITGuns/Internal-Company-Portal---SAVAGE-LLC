import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { NotificationsController } from '../src/notifications/notifications.controller'
import { GemfieldPipelineService } from '../src/clients/gemfield/gemfield-pipeline.service'

/**
 * The Gemfield daily digest is stored per recipient (UserNotification) so the bell shows it
 * where sockets never deliver (Vercel). Prisma delegates are stubbed; no database.
 */

type Stubs = Array<[any, string, unknown]>

async function withStubs(stubs: Stubs, run: () => Promise<void>) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    await run()
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

async function testDigestIsStored() {
  process.env.GEMFIELD_DIGEST_ENABLED = 'true'
  const created: any[] = []
  let failWrites = false
  const db = { userRole: { findMany: async () => [{ userId: 'u-dev' }, { userId: 'u-admin' }] } }
  const service = new GemfieldPipelineService(db as never)
  ;(service as any).listPipeline = async () => []

  await withStubs([
    [prisma.userNotification, 'createMany', async (args: any) => {
      if (failWrites) throw new Error('relation "UserNotification" does not exist')
      created.push(...args.data)
      return { count: args.data.length }
    }],
  ], async () => {
    const result = await service.runGemfieldDigest()
    assert.equal(result.enabled, true)
    assert.equal(result.notified, 2)
    assert.equal(result.persisted, 2)
    assert.deepEqual(created.map((row) => row.userId), ['u-dev', 'u-admin'])
    assert.deepEqual(created[0], {
      userId: 'u-dev',
      type: 'info',
      title: result.digest.title,
      message: result.digest.message,
      link: '/operations/clients/gemfield',
    })

    // Before the migration runs the table is missing: the job still succeeds.
    failWrites = true
    const degraded = await service.runGemfieldDigest()
    assert.equal(degraded.notified, 2)
    assert.equal(degraded.persisted, 0)
  })
}

async function testBellShowsStoredRows() {
  const createdAt = new Date()
  let failReads = false
  await withStubs([
    [prisma.user, 'findUnique', async () => ({ id: 'u-dev', email: 'dev@example.test', status: 'active', isApproved: true })],
    [prisma.announcement, 'findMany', async () => []],
    [prisma.task, 'findMany', async () => []],
    [prisma.message, 'findMany', async () => []],
    [prisma.userNotification, 'findMany', async (args: any) => {
      if (failReads) throw new Error('relation "UserNotification" does not exist')
      assert.equal(args.where.userId, 'u-dev', 'only the caller\'s rows')
      return [{ id: 'n1', type: 'warning', title: 'Gemfield: 2 open requests', message: '2 open', link: '/operations/clients/gemfield', createdAt }]
    }],
  ], async () => {
    const app = express()
    app.use('/notifications', new NotificationsController().router())
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/notifications`
    const headers = { Authorization: `Bearer ${JwtService.generateAccessToken({ userId: 'u-dev', email: 'dev@example.test' })}` }
    try {
      const response = await fetch(url, { headers })
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), [{
        id: 'note-n1',
        type: 'warning',
        title: 'Gemfield: 2 open requests',
        message: '2 open',
        link: '/operations/clients/gemfield',
        createdAt: createdAt.toISOString(),
        read: false,
      }])

      // A missing table never breaks the bell.
      failReads = true
      const degraded = await fetch(url, { headers })
      assert.equal(degraded.status, 200)
      assert.deepEqual(await degraded.json(), [])
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
}

async function main() {
  await testDigestIsStored()
  await testBellShowsStoredRows()
  console.log('notifications.persisted tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
