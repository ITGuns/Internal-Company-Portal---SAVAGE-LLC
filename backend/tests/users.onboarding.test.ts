import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { AuthController } from '../src/auth/auth.controller'
import { JwtService } from '../src/auth/jwt.service'
import { UsersController } from '../src/users/users.controller'

type JsonRecord = Record<string, any>

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    token?: string
    body?: JsonRecord
  } = {},
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
  const body = text ? JSON.parse(text) : {}

  return {
    status: response.status,
    body,
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/auth', new AuthController().router())
  app.use('/api/users', new UsersController().router())

  const server = http.createServer(app)

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    return await run(baseUrl)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function runUserOnboardingTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const adminEmail = `onboarding-admin-${suffix}@example.com`
  const employeeEmail = `onboarding-employee-${suffix}@example.com`
  const blockedEmail = `onboarding-blocked-${suffix}@example.com`

  const department = await prisma.department.create({
    data: {
      name: `Onboarding Dept ${suffix}`,
      driveId: `drive-${suffix}`,
    },
  })
  const role = await prisma.availableRole.create({
    data: {
      name: `Onboarding Specialist ${suffix}`,
      departmentId: department.id,
    },
  })

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Onboarding Admin',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'admin',
        },
      },
    },
  })
  const nonAdmin = await prisma.user.create({
    data: {
      email: `onboarding-nonadmin-${suffix}@example.com`,
      name: 'Onboarding Non Admin',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'employee',
          departmentId: department.id,
        },
      },
    },
  })
  await prisma.user.create({
    data: {
      email: blockedEmail,
      name: 'Existing User',
      password: 'existing-hash',
      status: 'verified',
      isApproved: true,
    },
  })

  const adminToken = JwtService.generateAccessToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name || undefined,
  })
  const nonAdminToken = JwtService.generateAccessToken({
    userId: nonAdmin.id,
    email: nonAdmin.email,
    name: nonAdmin.name || undefined,
  })

  try {
    await withServer(async (baseUrl) => {
      const missingToken = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        body: {
          email: employeeEmail,
          roleId: role.id,
        },
      })
      assert.equal(missingToken.status, 401)

      const forbidden = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        token: nonAdminToken,
        body: {
          email: employeeEmail,
          roleId: role.id,
        },
      })
      assert.equal(forbidden.status, 403)

      const invalidEmail = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        token: adminToken,
        body: {
          email: 'not-an-email',
          roleId: role.id,
        },
      })
      assert.equal(invalidEmail.status, 400)

      const invalidRole = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        token: adminToken,
        body: {
          email: employeeEmail,
          roleId: 'missing-role',
        },
      })
      assert.equal(invalidRole.status, 400)

      const existingUser = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        token: adminToken,
        body: {
          email: blockedEmail,
          roleId: role.id,
        },
      })
      assert.equal(existingUser.status, 409)

      const invitation = await requestJson(baseUrl, '/api/users/onboarding-invitations', {
        method: 'POST',
        token: adminToken,
        body: {
          email: ` ${employeeEmail.toUpperCase()} `,
          roleId: role.id,
          isApproved: false,
          password: 'ignored',
        },
      })
      assert.equal(invitation.status, 201)
      assert.equal(invitation.body.user.email, employeeEmail)
      assert.equal(invitation.body.user.status, 'verified')
      assert.equal(invitation.body.user.isApproved, true)
      assert.equal('password' in invitation.body.user, false)
      assert.equal('passwordResetToken' in invitation.body.user, false)
      assert.equal(invitation.body.onboarding.role.name, role.name)
      assert.equal(invitation.body.onboarding.role.department.id, department.id)

      const setupUrl = new URL(invitation.body.onboarding.setupUrl)
      const token = setupUrl.searchParams.get('token')
      const email = setupUrl.searchParams.get('email')
      assert.ok(token)
      assert.equal(email, employeeEmail)

      const reset = await requestJson(baseUrl, '/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          email: employeeEmail,
          password: 'Welcome123',
        },
      })
      assert.equal(reset.status, 200)

      const login = await requestJson(baseUrl, '/auth/login', {
        method: 'POST',
        body: {
          email: employeeEmail,
          password: 'Welcome123',
        },
      })
      assert.equal(login.status, 200)
      assert.equal(login.body.user.email, employeeEmail)
      assert.deepEqual(login.body.user.roles, [role.name])
    })
  } finally {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminEmail, employeeEmail, blockedEmail, nonAdmin.email],
        },
      },
    })
    await prisma.availableRole.deleteMany({ where: { id: role.id } })
    await prisma.department.deleteMany({ where: { id: department.id } })
  }
}

runUserOnboardingTests()
  .then(() => console.log('users.onboarding tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
