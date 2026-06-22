import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { FileDirectoryController } from '../src/file-directory/file-directory.controller'
import { JwtService } from '../src/auth/jwt.service'

type JsonRecord = Record<string, any>

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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
  app.use('/api/file-directory', new FileDirectoryController().router())

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

async function runFileDirectoryRouteTests() {
  const suffix = uniqueSuffix()
  const operations = await prisma.department.create({ data: { name: `File Ops ${suffix}` } })
  const finance = await prisma.department.create({ data: { name: `File Finance ${suffix}` } })
  const internalUser = await prisma.user.create({
    data: {
      email: `file-internal-${suffix}@example.com`,
      name: 'File Internal',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'Operations Manager',
          departmentId: operations.id,
        },
      },
    },
  })
  const clientUser = await prisma.user.create({
    data: {
      email: `file-client-${suffix}@example.com`,
      name: 'File Client',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'client',
        },
      },
    },
  })

  const internalToken = JwtService.generateAccessToken({
    userId: internalUser.id,
    email: internalUser.email,
    name: internalUser.name || undefined,
  })
  const clientToken = JwtService.generateAccessToken({
    userId: clientUser.id,
    email: clientUser.email,
    name: clientUser.name || undefined,
  })

  try {
    await withServer(async (baseUrl) => {
      const clientCreate = await requestJson(baseUrl, '/api/file-directory', {
        method: 'POST',
        token: clientToken,
        body: {
          name: `Client Attempt ${suffix}`,
          type: 'folder',
          department: operations.name,
        },
      })
      assert.equal(clientCreate.status, 403)

      const internalCreate = await requestJson(baseUrl, '/api/file-directory', {
        method: 'POST',
        token: internalToken,
        body: {
          name: `Internal Folder ${suffix}`,
          type: 'folder',
          department: finance.name,
          driveLink: 'https://example.com/should-not-persist',
        },
      })
      assert.equal(internalCreate.status, 201)
      assert.equal(internalCreate.body.department, operations.name)
      assert.equal(internalCreate.body.driveLink, null)
      assert.equal(internalCreate.body.createdById, internalUser.id)
    })
  } finally {
    await prisma.fileFolder.deleteMany({
      where: {
        OR: [
          { name: `Client Attempt ${suffix}` },
          { name: `Internal Folder ${suffix}` },
        ],
      },
    })
    await prisma.user.deleteMany({ where: { id: { in: [internalUser.id, clientUser.id] } } })
    await prisma.department.deleteMany({ where: { id: { in: [operations.id, finance.id] } } })
  }
}

runFileDirectoryRouteTests()
  .then(() => console.log('file-directory.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
