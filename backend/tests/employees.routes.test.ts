import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import express from 'express'
import { EmployeesController } from '../src/employees/employees.controller'

type JsonRecord = Record<string, any>

async function requestJson(
  baseUrl: string,
  path: string,
  options: {
    method?: string
    body?: JsonRecord
  } = {},
): Promise<{ status: number; body: JsonRecord }> {
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
  }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const controller = new EmployeesController()
  let createPendingCalled = false
  let hashCalled = false
  const originalHash = bcrypt.hash

  ;(bcrypt as any).hash = async () => {
    hashCalled = true
    return 'hash-should-not-be-used'
  }

  ;(controller as any).employeesService = {
    createPending: async () => {
      createPendingCalled = true
      throw new Error('createPending should not be called for invalid avatar input')
    },
  }

  const app = express()
  app.use(express.json())
  app.use('/api/employees', controller.router())

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.equal(typeof address, 'object')
  assert.ok(address)
  const port = (address as AddressInfo).port

  try {
    const result = await run(`http://127.0.0.1:${port}`)
    assert.equal(createPendingCalled, false)
    assert.equal(hashCalled, false)
    return result
  } finally {
    ;(bcrypt as any).hash = originalHash
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function runEmployeeRouteTests() {
  await withServer(async (baseUrl) => {
    const response = await requestJson(baseUrl, '/api/employees/request-verification', {
      method: 'POST',
      body: {
        email: `employee-route-${Date.now()}@example.com`,
        name: 'Employee Route Test',
        role: 'Developer',
        department: 'Operations',
        salary: 50000,
        avatar: `data:text/html;base64,${Buffer.from('<script />').toString('base64')}`,
      },
    })

    assert.equal(response.status, 400)
    assert.match(String(response.body.error), /avatar/i)
  })
}

runEmployeeRouteTests()
  .then(() => console.log('employees.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
