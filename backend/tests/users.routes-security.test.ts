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
  const clientEmail = `users-route-client-${suffix}@example.com`

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

  const client = await prisma.user.create({
    data: {
      email: clientEmail,
      name: 'Users Route Client',
      status: 'verified',
      isApproved: true,
      roles: {
        create: {
          role: 'client',
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
  const clientToken = JwtService.generateAccessToken({
    userId: client.id,
    email: client.email,
    name: client.name || undefined,
  })
  // Management without a payroll role (2026-10-20: payroll fields are payroll roles only).
  const manager = await prisma.user.create({
    data: {
      email: `users-route-manager-${suffix}@example.com`,
      name: 'Users Route Manager',
      status: 'verified',
      isApproved: true,
      roles: { create: { role: 'project_manager' } },
    },
  })
  const managerToken = JwtService.generateAccessToken({
    userId: manager.id,
    email: manager.email,
    name: manager.name || undefined,
  })

  try {
    await withServer(async (baseUrl) => {
      const adminDirectory = await requestJson(baseUrl, '/api/users', {
        token: adminToken,
      })
      assert.equal(adminDirectory.status, 200)
      assert.equal(Array.isArray(adminDirectory.body), true)
      const adminDirectoryBody = adminDirectory.body as unknown as JsonRecord[]
      assert.equal(adminDirectoryBody.some((user) => user.email === employeeEmail), true)

      const employeeDirectory = await requestJson(baseUrl, '/api/users', {
        token: employeeToken,
      })
      assert.equal(employeeDirectory.status, 200)

      const blockedClientDirectory = await requestJson(baseUrl, '/api/users', {
        token: clientToken,
      })
      assert.equal(blockedClientDirectory.status, 403)

      const blockedClientSearch = await requestJson(baseUrl, '/api/users/search?q=users-route', {
        token: clientToken,
      })
      assert.equal(blockedClientSearch.status, 403)

      const blockedClientCrossUserRead = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        token: clientToken,
      })
      assert.equal(blockedClientCrossUserRead.status, 403)

      const clientSelfRead = await requestJson(baseUrl, `/api/users/${client.id}`, {
        token: clientToken,
      })
      assert.equal(clientSelfRead.status, 200)
      assert.equal(clientSelfRead.body.email, clientEmail)

      const blockedClientCrossUserRoles = await requestJson(baseUrl, `/api/users/${employee.id}/roles`, {
        token: clientToken,
      })
      assert.equal(blockedClientCrossUserRoles.status, 403)

      const clientSelfRoles = await requestJson(baseUrl, `/api/users/${client.id}/roles`, {
        token: clientToken,
      })
      assert.equal(clientSelfRoles.status, 200)
      assert.equal(Array.isArray(clientSelfRoles.body), true)
      const clientSelfRolesBody = clientSelfRoles.body as unknown as JsonRecord[]
      assert.equal(clientSelfRolesBody.some((assignment) => assignment.role === 'client'), true)

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

      // Payroll fields need a payroll role; managers keep the other fields.
      const managerSalary = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: managerToken,
        body: { salary: 99999 },
      })
      assert.equal(managerSalary.status, 403)
      assert.deepEqual(managerSalary.body.fields, ['salary'])
      const managerName = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: managerToken,
        body: { name: 'Renamed By Manager' },
      })
      assert.equal(managerName.status, 200)

      // A scheme outside the list is refused before anything is saved.
      const badScheme = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { name: 'Should Not Save', payrollScheme: 'no_such_scheme' },
      })
      assert.equal(badScheme.status, 400)
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })).name, 'Renamed By Manager')

      // Saving a salary keeps the profile currency (it was forced to PHP before).
      await prisma.employeeProfile.update({ where: { userId: employee.id }, data: { currency: 'USD' } })
      const salaryUpdate = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { salary: 4200 },
      })
      assert.equal(salaryUpdate.status, 200)
      const profile = await prisma.employeeProfile.findUniqueOrThrow({ where: { userId: employee.id } })
      assert.deepEqual([profile.baseSalary, profile.currency], [4200, 'USD'])

      // Status (2026-10-28): the working states save; pending and inactive keep their own routes.
      const statusOf = async () => (await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })).status
      const toVacation = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'vacation' },
      })
      assert.equal(toVacation.status, 200)
      assert.equal(await statusOf(), 'vacation')

      // Not a payroll field: a manager without a payroll role may set it.
      const managerLeave = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: managerToken,
        body: { status: 'leave' },
      })
      assert.equal(managerLeave.status, 200)
      assert.equal(await statusOf(), 'leave')

      for (const refused of ['inactive', 'pending', 'deleted', 42]) {
        const response = await requestJson(baseUrl, `/api/users/${employee.id}`, {
          method: 'PATCH',
          token: adminToken,
          body: { name: 'Should Not Save Either', status: refused },
        })
        assert.equal(response.status, 400, `status ${String(refused)} is refused`)
      }
      assert.equal(await statusOf(), 'leave')
      assert.notEqual((await prisma.user.findUniqueOrThrow({ where: { id: employee.id } })).name, 'Should Not Save Either')

      // The edit dialog sends the current status with other fields: a no-op, not a refusal.
      const sameStatus = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { name: 'Same Status Save', status: 'leave' },
      })
      assert.equal(sameStatus.status, 200)
      assert.equal(sameStatus.body.user.name, 'Same Status Save')

      // A deactivated member is reactivated through its route, never through PATCH.
      await prisma.user.update({ where: { id: employee.id }, data: { status: 'inactive' } })
      const reviveByPatch = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { status: 'active' },
      })
      assert.equal(reviveByPatch.status, 400)
      assert.equal(await statusOf(), 'inactive')
      await prisma.user.update({ where: { id: employee.id }, data: { status: 'verified' } })

      // Employees still cannot change their own status.
      const selfStatus = await requestJson(baseUrl, `/api/users/${employee.id}`, {
        method: 'PATCH',
        token: employeeToken,
        body: { status: 'vacation' },
      })
      assert.equal(selfStatus.status, 403)
      assert.equal(await statusOf(), 'verified')

      // Review fix 2026-10-28: a full-access account's status needs full access (the
      // deactivate / reactivate target guard), so a project manager cannot put an admin on leave.
      const managerOnAdmin = await requestJson(baseUrl, `/api/users/${admin.id}`, {
        method: 'PATCH',
        token: managerToken,
        body: { status: 'leave' },
      })
      assert.equal(managerOnAdmin.status, 403)
      assert.equal(managerOnAdmin.body.error, 'Only an administrator can change this account')
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).status, 'verified')

      // Review fix 2026-10-28: a hard delete is refused while the member is on a concern
      // (it would cascade the thread away); payslips and employee history count the same way.
      const ticket = await prisma.internalTicket.create({
        data: {
          requesterId: employee.id,
          assigneeId: manager.id,
          subject: 'Hard delete guard',
          messages: { create: { authorId: employee.id, body: 'Is my overtime approved?' } },
        },
      })
      const blockedDelete = await requestJson(baseUrl, `/api/users/${manager.id}?confirm=hard`, {
        method: 'DELETE',
        token: adminToken,
      })
      assert.equal(blockedDelete.status, 409)
      assert.equal(blockedDelete.body.error, 'This member has concerns, so their records must be kept. Deactivate them instead.')
      assert.deepEqual(
        [blockedDelete.body.payslipCount, blockedDelete.body.historyCount, blockedDelete.body.concernCount],
        [0, 0, 1],
      )
      assert.ok(await prisma.user.findUnique({ where: { id: manager.id } }), 'the member is kept')
      assert.ok(await prisma.internalTicket.findUnique({ where: { id: ticket.id } }), 'the concern is kept')
      await prisma.internalTicket.delete({ where: { id: ticket.id } })
    })
  } finally {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [admin.id, employee.id, client.id, manager.id],
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
