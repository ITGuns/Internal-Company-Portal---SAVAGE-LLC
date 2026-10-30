import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { UsersController } from '../src/users/users.controller'

// DELETE /api/users/:id/avatar (2026-10-30) removes a profile photo. It shares the upload's
// rule (POST /api/users/:id/avatar): your own photo, or a full-access role for anyone else's.

type JsonRecord = Record<string, any>

const PNG_AVATAR = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString('base64')}`
const REFUSED = 'Unauthorized to update another user\'s avatar'

async function requestJson(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; body?: JsonRecord } = {},
): Promise<{ status: number; body: JsonRecord }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/api/users', new UsersController().router())

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo

  try {
    return await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

function createMember(email: string, name: string, role: string, avatar: string | null) {
  return prisma.user.create({
    data: { email, name, avatar, status: 'verified', isApproved: true, roles: { create: { role } } },
  })
}

function tokenFor(user: { id: string; email: string; name: string | null }) {
  return JwtService.generateAccessToken({ userId: user.id, email: user.email, name: user.name || undefined })
}

async function storedAvatar(id: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { id } })).avatar
}

async function runUserAvatarTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const admin = await createMember(`users-avatar-admin-${suffix}@example.com`, 'Avatar Admin', 'admin', null)
  const employee = await createMember(`users-avatar-employee-${suffix}@example.com`, 'Avatar Employee', 'employee', null)
  const coworker = await createMember(`users-avatar-coworker-${suffix}@example.com`, 'Avatar Coworker', 'employee', PNG_AVATAR)
  // Management without full access: may not change another member's photo.
  const manager = await createMember(`users-avatar-manager-${suffix}@example.com`, 'Avatar Manager', 'project_manager', null)
  const adminToken = tokenFor(admin)
  const employeeToken = tokenFor(employee)
  const managerToken = tokenFor(manager)
  const avatarPath = (id: string) => `/api/users/${id}/avatar`

  try {
    await withServer(async (baseUrl) => {
      // The upload still passes through the shared rule.
      const upload = await requestJson(baseUrl, avatarPath(employee.id), {
        method: 'POST',
        token: employeeToken,
        body: { avatar: PNG_AVATAR },
      })
      assert.equal(upload.status, 200)
      assert.equal(await storedAvatar(employee.id), PNG_AVATAR)

      // Own photo: cleared to null, and the record comes back through the auth serializer.
      const removeOwn = await requestJson(baseUrl, avatarPath(employee.id), { method: 'DELETE', token: employeeToken })
      assert.equal(removeOwn.status, 200)
      assert.equal(removeOwn.body.success, true)
      assert.equal(removeOwn.body.user.avatar, null)
      assert.equal(removeOwn.body.user.id, employee.id)
      assert.deepEqual(removeOwn.body.user.roles, ['employee'])
      assert.equal('password' in removeOwn.body.user, false)
      assert.equal(await storedAvatar(employee.id), null)

      // Already empty: a 200 without a write.
      const beforeNoOp = await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })
      const removeAgain = await requestJson(baseUrl, avatarPath(employee.id), { method: 'DELETE', token: employeeToken })
      assert.equal(removeAgain.status, 200)
      assert.equal(removeAgain.body.user.avatar, null)
      const afterNoOp = await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })
      assert.equal(afterNoOp.updatedAt.getTime(), beforeNoOp.updatedAt.getTime(), 'no write when there is no photo')

      // An empty string (PATCH /api/users/:id stores one for an empty avatar) is cleared to null.
      await prisma.user.update({ where: { id: employee.id }, data: { avatar: '' } })
      const removeLegacyEmpty = await requestJson(baseUrl, avatarPath(employee.id), { method: 'DELETE', token: employeeToken })
      assert.equal(removeLegacyEmpty.status, 200)
      assert.equal(await storedAvatar(employee.id), null)

      // Someone else's photo: refused for an employee and for a manager without full access.
      for (const token of [employeeToken, managerToken]) {
        const refused = await requestJson(baseUrl, avatarPath(coworker.id), { method: 'DELETE', token })
        assert.equal(refused.status, 403)
        assert.equal(refused.body.error, REFUSED)
      }
      const refusedUpload = await requestJson(baseUrl, avatarPath(coworker.id), {
        method: 'POST',
        token: employeeToken,
        body: { avatar: PNG_AVATAR },
      })
      assert.equal(refusedUpload.status, 403)
      assert.equal(refusedUpload.body.error, REFUSED)
      assert.equal(await storedAvatar(coworker.id), PNG_AVATAR, 'a refused removal leaves the photo')

      // A full-access admin may remove it; another member's record uses the directory serializer.
      const adminRemove = await requestJson(baseUrl, avatarPath(coworker.id), { method: 'DELETE', token: adminToken })
      assert.equal(adminRemove.status, 200)
      assert.equal(adminRemove.body.user.id, coworker.id)
      assert.equal(adminRemove.body.user.avatar, null)
      assert.equal(adminRemove.body.user.roles[0].role, 'employee')
      assert.equal(await storedAvatar(coworker.id), null)

      const missing = await requestJson(baseUrl, avatarPath(`missing-${suffix}`), { method: 'DELETE', token: adminToken })
      assert.equal(missing.status, 404)

      const anonymous = await requestJson(baseUrl, avatarPath(employee.id), { method: 'DELETE' })
      assert.equal(anonymous.status, 401)
    })
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [admin.id, employee.id, coworker.id, manager.id] } },
    })
  }
}

runUserAvatarTests()
  .then(() => console.log('users.avatar tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
