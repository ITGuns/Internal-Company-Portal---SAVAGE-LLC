import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { OrgChartController } from '../src/org-chart/org-chart.controller'
import { UsersController } from '../src/users/users.controller'
import { formatRoleLabel } from '../src/org-chart/org-chart.service'

/**
 * GET /api/org-chart on the real test database (shape, who is on it, viewer
 * rights) and the reporting-line edits the chart sends to PATCH /api/users/:id,
 * including the server-side cycle check.
 */

type JsonRecord = Record<string, any>
type Caller = { id: string; email: string }

async function requestJson(
  baseUrl: string,
  path: string,
  options: { method?: string; as?: Caller; body?: JsonRecord } = {},
): Promise<{ status: number; body: any }> {
  const token = options.as ? JwtService.generateAccessToken({ userId: options.as.id, email: options.as.email }) : undefined
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/api/org-chart', new OrgChartController().router())
  app.use('/api/users', new UsersController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    return await run(baseUrl)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

function testRoleLabels() {
  assert.equal(formatRoleLabel('operations_manager'), 'Operations Manager')
  assert.equal(formatRoleLabel('admin'), 'Admin')
  assert.equal(formatRoleLabel('Inventory VA'), 'Inventory VA')
  assert.equal(formatRoleLabel(''), 'Member')
}

async function runOrgChartRouteTests() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const department = await prisma.department.create({ data: { name: `Org Chart QA ${suffix}` } })
  const createdIds: string[] = []

  async function member(key: string, role: string, extra: { status?: string; isApproved?: boolean; managerId?: string } = {}) {
    const user = await prisma.user.create({
      data: {
        email: `org-chart-${key}-${suffix}@example.com`,
        name: `Org ${key}`,
        status: extra.status || 'active',
        isApproved: extra.isApproved ?? true,
        managerId: extra.managerId,
        roles: { create: { role, departmentId: department.id } },
      },
      select: { id: true, email: true },
    })
    createdIds.push(user.id)
    return user
  }

  try {
    const admin = await member('admin', 'admin')
    const manager = await member('manager', 'operations_manager')
    const lead = await member('lead', 'Inventory VA')
    const report = await member('report', 'Inventory VA', { managerId: lead.id })
    const inactive = await member('inactive', 'Inventory VA', { status: 'inactive', managerId: lead.id })
    const pending = await member('pending', 'Inventory VA', { status: 'pending', isApproved: false })
    const client = await member('client', 'client_member')
    const worker = await member('worker', 'Inventory VA')

    await withServer(async (baseUrl) => {
      const chartAs = (as: Caller) => requestJson(baseUrl, '/api/org-chart', { as })

      // Shape and membership.
      const asWorker = await chartAs(worker)
      assert.equal(asWorker.status, 200)
      assert.deepEqual(asWorker.body.viewer, { id: worker.id, canEditReportingLines: false, canSetRoot: false, isFullAccess: false })
      const byId = new Map<string, JsonRecord>(asWorker.body.members.map((entry: JsonRecord) => [entry.id, entry]))
      assert.deepEqual(Object.keys(byId.get(report.id)!).sort(), [
        'avatar', 'departmentName', 'directReportCount', 'email', 'id', 'isSupervisor', 'managerId', 'name', 'roleLabel',
      ])
      assert.equal(byId.get(report.id)!.managerId, lead.id)
      assert.equal(byId.get(report.id)!.departmentName, department.name)
      assert.equal(byId.get(report.id)!.roleLabel, 'Inventory VA')
      assert.equal(byId.get(lead.id)!.directReportCount, 1, 'inactive reports are not counted')
      assert.equal(byId.get(lead.id)!.isSupervisor, true, 'a direct report makes a supervisor')
      assert.equal(byId.get(manager.id)!.isSupervisor, true, 'a management role makes a supervisor')
      assert.equal(byId.get(manager.id)!.roleLabel, 'Operations Manager')
      assert.equal(byId.get(worker.id)!.isSupervisor, false)
      for (const hidden of [inactive, pending, client]) {
        assert.equal(byId.has(hidden.id), false, `${hidden.email} must not be on the chart`)
      }

      // Access and viewer rights.
      assert.equal((await chartAs(client)).status, 403, 'client accounts are refused')
      assert.equal((await requestJson(baseUrl, '/api/org-chart')).status, 401)
      assert.deepEqual((await chartAs(admin)).body.viewer, { id: admin.id, canEditReportingLines: true, canSetRoot: true, isFullAccess: true })
      assert.deepEqual((await chartAs(manager)).body.viewer, { id: manager.id, canEditReportingLines: true, canSetRoot: false, isFullAccess: false })

      // Reporting-line edits from the chart go through PATCH /api/users/:id.
      const setManager = (as: Caller, userId: string, managerId: string | null) =>
        requestJson(baseUrl, `/api/users/${userId}`, { method: 'PATCH', as, body: { managerId } })
      assert.equal((await setManager(worker, report.id, manager.id)).status, 403, 'members cannot change reporting lines')
      assert.equal((await setManager(admin, lead.id, manager.id)).status, 200)
      assert.equal((await setManager(manager, manager.id, report.id)).status, 400, 'report -> lead -> manager -> report is a cycle')
      assert.equal((await setManager(admin, lead.id, lead.id)).status, 400, 'nobody reports to themselves')
      const after = await chartAs(worker)
      const afterById = new Map<string, JsonRecord>(after.body.members.map((entry: JsonRecord) => [entry.id, entry]))
      assert.equal(afterById.get(lead.id)!.managerId, manager.id)
      assert.equal(afterById.get(manager.id)!.directReportCount, 1)
      assert.equal((await setManager(admin, lead.id, null)).status, 200, 'set as root clears the manager')
      assert.equal((await prisma.user.findUnique({ where: { id: lead.id }, select: { managerId: true } }))!.managerId, null)
    })
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } })
    await prisma.department.deleteMany({ where: { id: department.id } })
  }
}

async function main() {
  testRoleLabels()
  await runOrgChartRouteTests()
  console.log('org-chart.routes tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
