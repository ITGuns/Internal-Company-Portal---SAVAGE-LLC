import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
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
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
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

async function runUsersRouteSecurityTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const adminEmail = `users-route-admin-${suffix}@example.com`
  const employeeEmail = `users-route-employee-${suffix}@example.com`
  const changedEmployeeEmail = `users-route-employee-new-${suffix}@example.com`

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Users Route Admin',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'admin',
        },
      },
    },
  })

  const employee = await prisma.user.create({
    data: {
      email: employeeEmail,
      name: 'Users Route Employee',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'employee',
        },
      },
    },
  })

  const adminToken = JwtService.generateAccessToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name || undefined,
  })
  const employeeToken = JwtService.generateAccessToken({
    userId: employee.id,
    email: employee.email,
    name: employee.name || undefined,
  })

  try {
    await withServer(async (baseUrl) => {
      const blockedSelfEmailChange = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: employeeToken,
        body: {
          email: changedEmployeeEmail,
          name: 'Blocked Self Email Change',
        },
      })
      assert.equal(blockedSelfEmailChange.status, 403)

      const unchangedEmployee = await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })
      assert.equal(unchangedEmployee.email, employeeEmail)
      assert.equal(unchangedEmployee.name, 'Users Route Employee')

      const sameEmailProfileUpdate = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: employeeToken,
        body: {
          email: employeeEmail.toUpperCase(),
          name: 'Allowed Profile Update',
        },
      })
      assert.equal(sameEmailProfileUpdate.status, 200)
      assert.equal(sameEmailProfileUpdate.body.user.name, 'Allowed Profile Update')

      const adminEmailChange = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          email: changedEmployeeEmail.toUpperCase(),
        },
      })
      assert.equal(adminEmailChange.status, 200)
      assert.equal(adminEmailChange.body.user.email, changedEmployeeEmail)

      const changedEmployee = await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })
      assert.equal(changedEmployee.email, changedEmployeeEmail)
    })
  } finally {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [admin.id, employee.id],
        },
      },
    })
  }
}

runUsersRouteSecurityTests()
  .then(() => console.log('users.routes-security tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
