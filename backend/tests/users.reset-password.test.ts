import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { AuthController } from '../src/auth/auth.controller'
import { JwtService } from '../src/auth/jwt.service'
import { UsersController } from '../src/users/users.controller'
import { MemberPasswordResetError, memberPasswordError, UsersService } from '../src/users/users.service'

/**
 * Administrator password reset (POST /users/:id/reset-password). The rules are
 * pure; the service and the route run against the test database like
 * users.onboarding.test.ts.
 */

const OLD_PASSWORD = 'OldPassword1'
const NEW_PASSWORD = 'NewPassword2'
const OPS_PASSWORD = 'OpsChosen3'
const ROUTE_PASSWORD = 'RoutePassword4'
const HOUR_MS = 60 * 60 * 1000

type JsonRecord = Record<string, any>
type TestUser = { id: string; email: string; name: string | null }

function testPasswordRules() {
  const email = 'member@example.test'
  assert.equal(memberPasswordError('Abcdefg1', email), null)
  assert.equal(memberPasswordError(`A1${'x'.repeat(70)}`, email), null, '72 characters is allowed')
  assert.equal(memberPasswordError(undefined, email), 'New password is required')
  assert.equal(memberPasswordError(12345678, email), 'New password is required')
  assert.equal(memberPasswordError('', email), 'New password is required')
  assert.equal(memberPasswordError('Abcde12', email), 'Password must be at least 8 characters')
  assert.equal(memberPasswordError(`A1${'x'.repeat(71)}`, email), 'Password must be at most 72 characters')
  assert.equal(memberPasswordError('abcdefg1', email), 'Password must contain at least one uppercase letter')
  assert.equal(memberPasswordError('Abcdefgh', email), 'Password must contain at least one number')
  assert.equal(
    memberPasswordError('Member1@Example.TEST', 'member1@example.test'),
    'Password must not be the same as the email address',
  )
}

async function createUser(email: string, name: string, role: string, password?: string): Promise<TestUser> {
  return prisma.user.create({
    data: {
      email,
      name,
      status: 'active',
      isApproved: true,
      ...(password ? { password: await bcrypt.hash(password, 4) } : {}),
      roles: { create: { role } },
    },
    select: { id: true, email: true, name: true },
  })
}

function tokenFor(user: TestUser): string {
  return JwtService.generateAccessToken({ userId: user.id, email: user.email, name: user.name || undefined })
}

async function liveSessionCount(userId: string): Promise<number> {
  return prisma.refreshSession.count({ where: { userId, revokedAt: null } })
}

async function storedCredentials(userId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { password: true, passwordResetToken: true, passwordResetExpiry: true },
  })
}

async function expectRefusal(promise: Promise<unknown>, httpStatus: number, message: RegExp) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof MemberPasswordResetError, 'refusals are MemberPasswordResetError')
    assert.equal(error.httpStatus, httpStatus)
    assert.match(error.message, message)
    return true
  })
}

async function testService(admin: TestUser, ops: TestUser, member: TestUser, otherAdmin: TestUser, suffix: string) {
  const service = new UsersService()
  const asAdmin = { requesterId: admin.id, requesterEmail: admin.email }
  const asOps = { requesterId: ops.id, requesterEmail: ops.email }

  await expectRefusal(
    service.resetMemberPassword({ ...asAdmin, targetId: admin.id, newPassword: NEW_PASSWORD }),
    400,
    /cannot reset your own password/,
  )
  await expectRefusal(
    service.resetMemberPassword({ ...asAdmin, targetId: `missing-${suffix}`, newPassword: NEW_PASSWORD }),
    404,
    /User not found/,
  )
  await expectRefusal(
    service.resetMemberPassword({ ...asAdmin, targetId: member.id, newPassword: 'Short12' }),
    400,
    /at least 8 characters/,
  )
  // Same guard as deactivate: an operations manager cannot change a full-access account.
  await expectRefusal(
    service.resetMemberPassword({ ...asOps, targetId: otherAdmin.id, newPassword: NEW_PASSWORD }),
    403,
    /Only an administrator/,
  )

  const untouched = await storedCredentials(member.id)
  assert.equal(await bcrypt.compare(OLD_PASSWORD, untouched.password ?? ''), true, 'refusals keep the old password')
  assert.equal(untouched.passwordResetToken, 'pending-reset-hash')
  assert.equal(await liveSessionCount(member.id), 2, 'refusals keep sessions')

  const result = await service.resetMemberPassword({ ...asAdmin, targetId: member.id, newPassword: NEW_PASSWORD })
  assert.deepEqual(result, { revokedSessions: 2 })

  const stored = await storedCredentials(member.id)
  assert.equal(await bcrypt.compare(NEW_PASSWORD, stored.password ?? ''), true, 'new password works')
  assert.equal(await bcrypt.compare(OLD_PASSWORD, stored.password ?? ''), false, 'old password stops working')
  assert.equal(stored.passwordResetToken, null, 'pending reset link cleared')
  assert.equal(stored.passwordResetExpiry, null)
  assert.equal(await liveSessionCount(member.id), 0, 'every refresh session revoked')

  // An operations manager can reset a member who is not full access.
  const byOps = await service.resetMemberPassword({ ...asOps, targetId: member.id, newPassword: OPS_PASSWORD })
  assert.deepEqual(byOps, { revokedSessions: 0 })
}

async function requestJson(baseUrl: string, path: string, options: { token?: string; body?: JsonRecord } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify(options.body ?? {}),
  })
  const text = await response.text()
  return { status: response.status, body: (text ? JSON.parse(text) : {}) as JsonRecord }
}

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express()
  app.use(express.json())
  app.use('/auth', new AuthController().router())
  app.use('/api/users', new UsersController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

async function testRoute(admin: TestUser, member: TestUser, otherAdmin: TestUser) {
  await withServer(async (baseUrl) => {
    const memberPath = `/api/users/${member.id}/reset-password`

    const anonymous = await requestJson(baseUrl, memberPath, { body: { newPassword: ROUTE_PASSWORD } })
    assert.equal(anonymous.status, 401)

    const notAllowed = await requestJson(baseUrl, `/api/users/${otherAdmin.id}/reset-password`, {
      token: tokenFor(member),
      body: { newPassword: ROUTE_PASSWORD },
    })
    assert.equal(notAllowed.status, 403, 'members without deactivate rights cannot reset')

    const weak = await requestJson(baseUrl, memberPath, { token: tokenFor(admin), body: { newPassword: 'nouppercase1' } })
    assert.equal(weak.status, 400)
    assert.match(weak.body.error, /uppercase/)

    const done = await requestJson(baseUrl, memberPath, { token: tokenFor(admin), body: { newPassword: ROUTE_PASSWORD } })
    assert.equal(done.status, 200)
    assert.deepEqual(done.body, { ok: true, revokedSessions: 0 })

    const login = await requestJson(baseUrl, '/auth/login', { body: { email: member.email, password: ROUTE_PASSWORD } })
    assert.equal(login.status, 200, 'the member signs in with the new password')
    const stale = await requestJson(baseUrl, '/auth/login', { body: { email: member.email, password: OPS_PASSWORD } })
    assert.equal(stale.status, 401, 'the previous password is refused')

    // The session that sign-in just opened is revoked by the next reset.
    const again = await requestJson(baseUrl, memberPath, { token: tokenFor(admin), body: { newPassword: NEW_PASSWORD } })
    assert.deepEqual(again.body, { ok: true, revokedSessions: 1 })
  })
}

async function main() {
  testPasswordRules()

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const emails = ['admin', 'ops', 'member', 'other-admin'].map((label) => `reset-${label}-${suffix}@example.com`)
  try {
    const admin = await createUser(emails[0], 'Reset Admin', 'admin')
    const ops = await createUser(emails[1], 'Reset Ops', 'operations_manager')
    const member = await createUser(emails[2], 'Reset Member', 'employee', OLD_PASSWORD)
    const otherAdmin = await createUser(emails[3], 'Other Admin', 'admin', OLD_PASSWORD)

    const expiresAt = new Date(Date.now() + HOUR_MS)
    await prisma.user.update({
      where: { id: member.id },
      data: { passwordResetToken: 'pending-reset-hash', passwordResetExpiry: expiresAt },
    })
    await prisma.refreshSession.createMany({
      data: [
        { userId: member.id, tokenHash: `reset-live-1-${suffix}`, expiresAt },
        { userId: member.id, tokenHash: `reset-live-2-${suffix}`, expiresAt },
        { userId: member.id, tokenHash: `reset-revoked-${suffix}`, expiresAt, revokedAt: new Date() },
      ],
    })

    await testService(admin, ops, member, otherAdmin, suffix)
    await testRoute(admin, member, otherAdmin)
  } finally {
    await prisma.user.deleteMany({ where: { email: { in: emails } } })
  }
  console.log('users.reset-password tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
