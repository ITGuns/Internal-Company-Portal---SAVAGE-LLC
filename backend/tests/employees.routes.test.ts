import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import express from 'express'
import { emailService } from '../src/email/email.service'
import { EmployeesController } from '../src/employees/employees.controller'
import { EmployeeValidationError } from '../src/employees/employees.service'
import { JwtService } from '../src/auth/jwt.service'

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

async function withServer<T>(
  controller: EmployeesController,
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
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
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

async function runInvalidAvatarTest() {
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

  try {
    await withServer(controller, async (baseUrl) => {
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

    assert.equal(createPendingCalled, false)
    assert.equal(hashCalled, false)
  } finally {
    ;(bcrypt as any).hash = originalHash
  }
}

async function runApplicantPasswordEmailTest() {
  const controller = new EmployeesController()
  let hashedPassword: string | undefined
  let welcomeEmailCalled = false
  let opsEmailCalled = false
  const originalHash = bcrypt.hash
  const originalWelcomeEmail = emailService.sendWelcomeEmail
  const originalVerificationEmail = emailService.sendEmployeeVerificationEmail

  ;(bcrypt as any).hash = async (password: string) => {
    hashedPassword = password
    return 'hashed-generated-password'
  }

  ;(emailService as any).sendWelcomeEmail = async () => {
    welcomeEmailCalled = true
    return { success: true }
  }

  ;(emailService as any).sendEmployeeVerificationEmail = async () => {
    opsEmailCalled = true
    return { success: true }
  }

  ;(controller as any).employeesService = {
    createPending: async (data: JsonRecord) => ({
      id: 'employee-route-created',
      email: data.email,
      name: data.name,
      avatar: data.avatar ?? null,
      status: 'pending',
    }),
  }

  try {
    await withServer(controller, async (baseUrl) => {
      const response = await requestJson(baseUrl, '/api/employees/request-verification', {
        method: 'POST',
        body: {
          email: `employee-route-valid-${Date.now()}@example.com`,
          name: 'Employee Route Test',
          role: 'Developer',
          department: 'Operations',
          salary: 50000,
        },
      })

      assert.equal(response.status, 201)
      assert.equal(welcomeEmailCalled, false)
      assert.equal(opsEmailCalled, true)
      assert.ok(hashedPassword)
      assert.doesNotMatch(JSON.stringify(response.body), /password/i)
      assert.equal(response.body.emailStatus.opsNotified, true)
    })
  } finally {
    ;(bcrypt as any).hash = originalHash
    ;(emailService as any).sendWelcomeEmail = originalWelcomeEmail
    ;(emailService as any).sendEmployeeVerificationEmail = originalVerificationEmail
  }
}

async function runEmployeeValidationErrorTest() {
  const controller = new EmployeesController()
  const originalVerificationEmail = emailService.sendEmployeeVerificationEmail

  ;(emailService as any).sendEmployeeVerificationEmail = async () => ({ success: true })
  ;(controller as any).employeesService = {
    createPending: async () => {
      throw new EmployeeValidationError('Select a valid employee department')
    },
  }

  try {
    await withServer(controller, async (baseUrl) => {
      const response = await requestJson(baseUrl, '/api/employees/request-verification', {
        method: 'POST',
        body: {
          email: `employee-route-invalid-${Date.now()}@example.com`,
          name: 'Employee Route Test',
          role: 'Developer',
          department: 'All Departments',
          salary: 50000,
        },
      })

      assert.equal(response.status, 400)
      assert.equal(response.body.error, 'Select a valid employee department')
    })
  } finally {
    ;(emailService as any).sendEmployeeVerificationEmail = originalVerificationEmail
  }
}

async function runApprovalSetupEmailTest() {
  const controller = new EmployeesController()
  const originalTemplateEmail = emailService.sendTemplateEmail
  let sentTo: string | string[] | undefined
  let sentTemplate: string | undefined
  let sentResetUrl: string | undefined

  ;(controller as any).authorizeBypass = async () => true
  ;(controller as any).employeesService = {
    approve: async () => ({
      user: {
        id: 'approved-employee-id',
        email: 'approved.employee@example.com',
        name: 'Approved Employee',
        status: 'verified',
        isApproved: true,
        roles: [],
        employeeProfile: null,
      },
      onboarding: {
        setupUrl: 'http://localhost:3000/reset-password?token=secret-token&email=approved.employee%40example.com',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  }

  ;(emailService as any).sendTemplateEmail = async (
    to: string | string[],
    _subject: string,
    templateType: string,
    templateData: JsonRecord,
  ) => {
    sentTo = to
    sentTemplate = templateType
    sentResetUrl = templateData.resetUrl
    return { success: true }
  }

  try {
    await withServer(controller, async (baseUrl) => {
      const token = JwtService.generateAccessToken({
        userId: 'approval-manager-id',
        email: 'approval-manager@example.com',
        name: 'Approval Manager',
      })
      const response = await requestJson(baseUrl, '/api/employees/approve/approved-employee-id', {
        method: 'POST',
        token,
      })

      assert.equal(response.status, 200)
      assert.equal(response.body.success, true)
      assert.equal(response.body.user.email, 'approved.employee@example.com')
      assert.equal(response.body.onboarding.setupRequired, true)
      assert.equal(response.body.onboarding.emailSent, true)
      assert.equal(Object.prototype.hasOwnProperty.call(response.body.onboarding, 'setupUrl'), false)
      assert.equal(sentTo, 'approved.employee@example.com')
      assert.equal(sentTemplate, 'password_reset')
      assert.match(String(sentResetUrl), /reset-password/)
      assert.doesNotMatch(JSON.stringify(response.body), /secret-token/)
    })
  } finally {
    ;(emailService as any).sendTemplateEmail = originalTemplateEmail
  }
}

async function runEmployeeRouteTests() {
  await runInvalidAvatarTest()
  await runApplicantPasswordEmailTest()
  await runEmployeeValidationErrorTest()
  await runApprovalSetupEmailTest()
}

runEmployeeRouteTests()
  .then(() => console.log('employees.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
