import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { EmailController } from '../src/email/email.controller'

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
  app.use('/api/email', new EmailController().router())

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

async function runEmailRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const adminEmail = `email-route-admin-${suffix}@example.com`
  const employeeEmail = `email-route-employee-${suffix}@example.com`

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Email Route Admin',
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
      name: 'Email Route Employee',
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
      const missingToken = await requestJson(baseUrl, '/api/email/status')
      assert.equal(missingToken.status, 401)

      const nonAdminStatus = await requestJson(baseUrl, '/api/email/status', {
        token: employeeToken,
      })
      assert.equal(nonAdminStatus.status, 403)

      const nonAdminSend = await requestJson(baseUrl, '/api/email/send', {
        method: 'POST',
        token: employeeToken,
        body: {
          to: 'external@example.com',
          subject: 'Blocked',
          text: 'This should not send',
        },
      })
      assert.equal(nonAdminSend.status, 403)

      const adminStatus = await requestJson(baseUrl, '/api/email/status', {
        token: adminToken,
      })
      assert.equal(adminStatus.status, 200)
      assert.equal(typeof adminStatus.body.enabled, 'boolean')
      assert.equal(typeof adminStatus.body.connected, 'boolean')
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

runEmailRouteTests()
  .then(() => console.log('email.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
