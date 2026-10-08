import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import bcrypt from 'bcrypt'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { config } from '../src/config/env.config'
import { PayrollService, EDITED_PAYSLIP_MESSAGE } from '../src/payroll/payroll.service'
import { PayslipEditService, OWN_PAYSLIP_MESSAGE } from '../src/payroll/payslip-edit.service'
import { TimeRequestsService, appendCorrectionNote } from '../src/payroll/time-requests.service'
import { emailService } from '../src/email/email.service'
import { PayrollConflictError, PayrollForbiddenError, PayrollValidationError } from '../src/payroll/payroll.errors'
import {
  HOURLY_RATE_REQUIRED_MESSAGE,
  payrollDayKey,
  payrollDayWindow,
  periodBoundsForDays,
  zonedMidnightUtc,
} from '../src/payroll/payroll.calculations'
import { PayrollController } from '../src/payroll/payroll.controller'
import { UsersController } from '../src/users/users.controller'
import { AuthController } from '../src/auth/auth.controller'
import { clearAccountStatusCache } from '../src/auth/account-status'
import { REFRESH_TOKEN_COOKIE_NAME } from '../src/auth/auth.session'
import { findOrCreateAppleOAuthUser } from '../src/auth/oauth.helpers'
import { INACTIVE_ACCOUNT_MESSAGE } from '../src/auth/signup.requests'

/**
 * Route guards for payroll and time v2 (docs/payroll-time-v2-spec.md).
 * Prisma delegates and services are stubbed, so no database is needed.
 */
type JsonRecord = Record<string, any>

interface FakeUser {
  id: string
  email: string
  status: string
  isApproved: boolean
  roles: string[]
}

const users: Record<string, FakeUser> = {
  employee: { id: 'u-employee', email: 'employee@example.test', status: 'active', isApproved: true, roles: ['Frontend Developer'] },
  manager: { id: 'u-manager', email: 'manager@example.test', status: 'active', isApproved: true, roles: ['Project Manager'] },
  bookkeeper: { id: 'u-bookkeeper', email: 'books@example.test', status: 'active', isApproved: true, roles: ['Bookkeeping'] },
  opsManager: { id: 'u-ops', email: 'ops@example.test', status: 'active', isApproved: true, roles: ['operations_manager'] },
  admin: { id: 'u-admin', email: 'admin@example.test', status: 'active', isApproved: true, roles: ['admin'] },
  inactive: { id: 'u-inactive', email: 'gone@example.test', status: 'inactive', isApproved: true, roles: ['Frontend Developer'] },
  // In ADMIN_EMAILS but holding no full-access role row.
  emailAdmin: { id: 'u-email-admin', email: 'owner@example.test', status: 'active', isApproved: true, roles: ['Frontend Developer'] },
}

// Time entries by owner, for the self-review checks on PATCH/DELETE /payroll/entry/:id.
const entryOwners: Record<string, string> = {
  te_1: 'u-employee',
  te_mgr: 'u-manager',
  te_books: 'u-bookkeeper',
}
const byId = new Map(Object.values(users).map((user) => [user.id, user]))

const originals = {
  userFindUnique: prisma.user.findUnique,
  userCreate: prisma.user.create,
  userRoleFindMany: prisma.userRole.findMany,
  timeEntryFindUnique: prisma.timeEntry.findUnique,
}

;(prisma.timeEntry as any).findUnique = async (args: any) => {
  const owner = entryOwners[args?.where?.id]
  return owner ? { id: args.where.id, userId: owner } : null
}

;(prisma.user as any).findUnique = async (args: any) => {
  const user = args?.where?.id ? byId.get(args.where.id) : Object.values(users).find((u) => u.email === args?.where?.email)
  if (!user) return null
  return { id: user.id, email: user.email, name: user.id, status: user.status, isApproved: user.isApproved, password: (user as any).password ?? null, roles: [] }
}
;(prisma.userRole as any).findMany = async (args: any) => {
  const user = byId.get(args?.where?.userId)
  return (user?.roles || []).map((role) => ({ role, departmentId: null, department: null }))
}

function tokenFor(user: FakeUser) {
  return JwtService.generateAccessToken({ userId: user.id, email: user.email })
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; body?: JsonRecord; cookie?: string } = {},
): Promise<{ status: number; body: JsonRecord }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

const calls: string[] = []
const userUpdates: Array<{ id: string; data: JsonRecord }> = []
const record = (name: string) => async (..._args: unknown[]) => {
  calls.push(name)
  return { id: 'stub', name }
}

function buildApp() {
  const payroll = new PayrollController()
  ;(payroll as any).timeRequests = {
    createOvertimeRequest: record('createOvertime'),
    listOvertimeRequests: async (_filters: unknown, actor: { canReview: boolean }) => [{ canReview: actor.canReview }],
    reviewOvertimeRequest: record('reviewOvertime'),
    deleteOvertimeRequest: record('deleteOvertime'),
    createAdjustmentRequest: record('createAdjustment'),
    listAdjustmentRequests: async (_filters: unknown, actor: { canReview: boolean }) => [{ canReview: actor.canReview }],
    approveAdjustmentRequest: record('approveAdjustment'),
    rejectAdjustmentRequest: record('rejectAdjustment'),
    deleteAdjustmentRequest: record('deleteAdjustment'),
  }
  ;(payroll as any).payslipEdits = {
    editPayslip: record('editPayslip'),
    deletePayslip: record('deletePayslip'),
  }
  ;(payroll as any).service = {
    addManualEntry: record('addManualEntry'),
    updateTimeEntry: record('updateTimeEntry'),
    deleteTimeEntry: record('deleteTimeEntry'),
  }

  const usersController = new UsersController()
  ;(usersController as any).service = {
    findById: async (id: string) => {
      const user = byId.get(id)
      return user ? { id: user.id, email: user.email, status: user.status } : null
    },
    getUserRoles: async (id: string) => (byId.get(id)?.roles || []).map((role) => ({ role, departmentId: null })),
    update: async (id: string, data: JsonRecord) => {
      userUpdates.push({ id, data })
      return { id }
    },
    setActivation: async (id: string, active: boolean) => {
      calls.push(active ? 'reactivate' : 'deactivate')
      return { id, email: byId.get(id)?.email, status: active ? 'active' : 'inactive' }
    },
    countPayslips: async (id: string) => (id === users.employee.id ? 2 : 0),
    delete: record('hardDelete'),
  }

  const app = express()
  app.use(express.json())
  app.use('/payroll', payroll.router())
  app.use('/users', usersController.router())
  app.use('/auth', new AuthController().router())
  return app
}

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(buildApp())
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  try {
    await run(baseUrl)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

async function expectStatus(baseUrl: string, label: string, path: string, method: string, user: FakeUser, expected: number, body?: JsonRecord) {
  const response = await requestJson(baseUrl, path, { method, token: tokenFor(user), body })
  assert.equal(response.status, expected, `${label}: expected ${expected}, got ${response.status} ${JSON.stringify(response.body)}`)
  return response
}

async function runRouteGuardTests() {
  await withServer(async (baseUrl) => {
    const { employee, manager, bookkeeper, opsManager, admin, inactive } = users

    // Rule 4: employees cannot edit time entries directly; reviewers edit other people's.
    const times = { start: '2026-07-01T01:00:00Z', end: '2026-07-01T02:00:00Z' }
    for (const [method, path] of [['POST', '/payroll/entry'], ['PATCH', '/payroll/entry/te_1'], ['DELETE', '/payroll/entry/te_1']]) {
      const denied = await expectStatus(baseUrl, `employee ${method} entry`, path, method, employee, 403, { ...times, userId: employee.id })
      assert.equal(denied.body.message, 'Submit an adjustment request')
      const body = method === 'POST' ? { ...times, userId: employee.id } : times
      await expectStatus(baseUrl, `manager ${method} other's entry`, path, method, manager, 200, body)
      await expectStatus(baseUrl, `bookkeeper ${method} other's entry`, path, method, bookkeeper, 200, body)
    }

    // Self-review rule: a reviewer without payroll access cannot touch their own time.
    for (const [method, path, body] of [
      ['POST', '/payroll/entry', times],
      ['POST', '/payroll/entry', { ...times, userId: manager.id }],
      ['PATCH', '/payroll/entry/te_mgr', times],
      ['DELETE', '/payroll/entry/te_mgr', undefined],
    ] as Array<[string, string, JsonRecord | undefined]>) {
      const denied = await expectStatus(baseUrl, `manager ${method} own entry`, path, method, manager, 403, body)
      assert.equal(denied.body.message, 'Submit an adjustment request')
    }
    // Payroll roles keep direct access to their own entries.
    await expectStatus(baseUrl, 'bookkeeper POST own entry', '/payroll/entry', 'POST', bookkeeper, 200, times)
    await expectStatus(baseUrl, 'bookkeeper PATCH own entry', '/payroll/entry/te_books', 'PATCH', bookkeeper, 200, times)
    // Moving an entry to another person stays payroll-only.
    await expectStatus(baseUrl, 'manager moves entry', '/payroll/entry/te_1', 'PATCH', manager, 403, { userId: manager.id })
    await expectStatus(baseUrl, 'bookkeeper moves entry', '/payroll/entry/te_1', 'PATCH', bookkeeper, 200, { userId: manager.id })

    // PATCH /users/:id ignores status: deactivate/reactivate own it (with the admin guard).
    userUpdates.length = 0
    await expectStatus(baseUrl, 'ops PATCH status', `/users/${admin.id}`, 'PATCH', opsManager, 200, { status: 'inactive', name: 'Renamed' })
    assert.equal(userUpdates.length, 1)
    assert.equal(userUpdates[0].data.name, 'Renamed')
    assert.ok(!('status' in userUpdates[0].data) || userUpdates[0].data.status === undefined, 'status is stripped')
    assert.ok(!('isApproved' in userUpdates[0].data) || userUpdates[0].data.isApproved === undefined, 'isApproved is not derived from status')
    assert.ok(!calls.includes('deactivate'), 'PATCH never deactivates')
    await expectStatus(baseUrl, 'employee PATCH status', `/users/${employee.id}`, 'PATCH', employee, 403, { status: 'inactive' })

    // Requests: employees file and withdraw; reviewers approve and reject.
    for (const kind of ['overtime-requests', 'adjustment-requests']) {
      await expectStatus(baseUrl, `employee create ${kind}`, `/payroll/${kind}`, 'POST', employee, 201, { workDate: '2026-07-01', hours: 1, reason: 'x' })
      const ownList = await expectStatus(baseUrl, `employee list ${kind}`, `/payroll/${kind}?userId=${manager.id}`, 'GET', employee, 200)
      assert.equal(ownList.body[0].canReview, false, 'employees list only their own requests')
      const allList = await expectStatus(baseUrl, `manager list ${kind}`, `/payroll/${kind}`, 'GET', manager, 200)
      assert.equal(allList.body[0].canReview, true)
      await expectStatus(baseUrl, `employee delete ${kind}`, `/payroll/${kind}/r1`, 'DELETE', employee, 200)

      for (const action of ['approve', 'reject']) {
        await expectStatus(baseUrl, `employee ${action} ${kind}`, `/payroll/${kind}/r1/${action}`, 'POST', employee, 403, {})
        await expectStatus(baseUrl, `manager ${action} ${kind}`, `/payroll/${kind}/r1/${action}`, 'POST', manager, 200, {})
        await expectStatus(baseUrl, `bookkeeper ${action} ${kind}`, `/payroll/${kind}/r1/${action}`, 'POST', bookkeeper, 200, {})
      }
    }

    // Rule 5: payslip edit and delete are payroll-management only.
    await expectStatus(baseUrl, 'employee edit payslip', '/payroll/payslips/p1', 'PATCH', employee, 403, { items: [], note: 'x' })
    await expectStatus(baseUrl, 'manager edit payslip', '/payroll/payslips/p1', 'PATCH', manager, 403, { items: [], note: 'x' })
    await expectStatus(baseUrl, 'bookkeeper edit payslip', '/payroll/payslips/p1', 'PATCH', bookkeeper, 200, { items: [], note: 'x' })
    await expectStatus(baseUrl, 'employee delete payslip', '/payroll/payslips/p1', 'DELETE', employee, 403)
    await expectStatus(baseUrl, 'bookkeeper delete payslip', '/payroll/payslips/p1', 'DELETE', bookkeeper, 200)

    // Rule 6: deactivate / reactivate / hard delete.
    await expectStatus(baseUrl, 'employee deactivate', `/users/${manager.id}/deactivate`, 'POST', employee, 403)
    await expectStatus(baseUrl, 'ops deactivate employee', `/users/${employee.id}/deactivate`, 'POST', opsManager, 200)
    await expectStatus(baseUrl, 'ops deactivate self', `/users/${opsManager.id}/deactivate`, 'POST', opsManager, 400)
    await expectStatus(baseUrl, 'ops deactivate admin', `/users/${admin.id}/deactivate`, 'POST', opsManager, 403)
    await expectStatus(baseUrl, 'ops deactivate ADMIN_EMAILS admin', `/users/${users.emailAdmin.id}/deactivate`, 'POST', opsManager, 403)
    await expectStatus(baseUrl, 'ops deactivate inactive', `/users/${inactive.id}/deactivate`, 'POST', opsManager, 409)
    await expectStatus(baseUrl, 'ops reactivate inactive', `/users/${inactive.id}/reactivate`, 'POST', opsManager, 200)
    await expectStatus(baseUrl, 'ops reactivate active', `/users/${employee.id}/reactivate`, 'POST', opsManager, 409)
    await expectStatus(baseUrl, 'ops hard delete', `/users/${manager.id}?confirm=hard`, 'DELETE', opsManager, 403)
    await expectStatus(baseUrl, 'admin delete without confirm', `/users/${manager.id}`, 'DELETE', admin, 400)
    await expectStatus(baseUrl, 'admin delete with payslips', `/users/${employee.id}?confirm=hard`, 'DELETE', admin, 409)
    await expectStatus(baseUrl, 'admin hard delete', `/users/${manager.id}?confirm=hard`, 'DELETE', admin, 200)

    // Rule 6: inactive users are refused by authenticateToken on every route.
    clearAccountStatusCache()
    const refused = await expectStatus(baseUrl, 'inactive requireAuth', '/payroll/overtime-requests', 'GET', inactive, 403)
    assert.equal(refused.body.error, INACTIVE_ACCOUNT_MESSAGE)
    const ghost: FakeUser = { id: 'u-ghost', email: 'ghost@example.test', status: 'active', isApproved: true, roles: [] }
    await expectStatus(baseUrl, 'deleted user requireAuth', '/payroll/overtime-requests', 'GET', ghost, 401)

    // Rule 6: inactive users cannot log in or refresh.
    ;(inactive as any).password = await bcrypt.hash('Correct-Horse-1', 4)
    const login = await requestJson(baseUrl, '/auth/login', { method: 'POST', body: { email: inactive.email, password: 'Correct-Horse-1' } })
    assert.equal(login.status, 403, `inactive login: ${JSON.stringify(login.body)}`)
    assert.equal(login.body.error, INACTIVE_ACCOUNT_MESSAGE)

    const refreshToken = JwtService.generateRefreshToken({ userId: inactive.id, email: inactive.email })
    const refresh = await requestJson(baseUrl, '/auth/refresh', { method: 'POST', cookie: `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}` })
    assert.equal(refresh.status, 403, `inactive refresh: ${JSON.stringify(refresh.body)}`)
    assert.equal(refresh.body.error, INACTIVE_ACCOUNT_MESSAGE)
  })

  for (const expected of ['createOvertime', 'reviewOvertime', 'approveAdjustment', 'rejectAdjustment', 'editPayslip', 'deletePayslip', 'deactivate', 'reactivate', 'hardDelete']) {
    assert.ok(calls.includes(expected), `${expected} reached the service`)
  }
}

async function runOAuthPendingTest() {
  // Rule 7: an unknown email signing in through OAuth is created pending.
  let createdData: JsonRecord | null = null
  ;(prisma.user as any).findUnique = async () => null
  ;(prisma.user as any).create = async (args: any) => {
    createdData = args.data
    return { id: 'u-new', ...args.data, roles: [] }
  }
  const user = await findOrCreateAppleOAuthUser({ email: 'Stranger@Example.test', name: 'Stranger' })
  assert.ok(createdData)
  assert.equal((createdData as JsonRecord).status, 'pending')
  assert.equal((createdData as JsonRecord).isApproved, false)
  assert.equal(user.isApproved, false)
}

// ---------------------------------------------------------------------------
// Service-level checks with stubbed Prisma delegates (no database).
// ---------------------------------------------------------------------------

type Stubs = Array<[any, string, unknown]>

/** Replace delegate methods for the duration of run, then restore them. */
async function withStubs(stubs: Stubs, run: () => Promise<void>) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    await run()
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

const MANILA = 'Asia/Manila'

function inRange(value: Date, range: any): boolean {
  return (!range?.gte || value >= range.gte) && (!range?.lt || value < range.lt) && (!range?.lte || value <= range.lte)
}

async function runPeriodWindowTest() {
  // A Manila day 16 shift (02:00 to 10:00 Manila = 18:00 UTC on the 15th) plus a
  // later block that day. Both belong to the second period, under one daily cap.
  config.payrollTimezone = MANILA
  const entries = [
    { userId: 'u1', start: new Date('2026-10-15T18:00:00Z'), duration: 480 },
    { userId: 'u1', start: new Date('2026-10-16T03:00:00Z'), duration: 180 },
  ]
  const overtime = [{ userId: 'u1', status: 'approved', workDate: zonedMidnightUtc('2026-10-16', MANILA), hours: 3 }]
  const queriedOvertimeWindows: any[] = []
  await withStubs([
    [prisma.employeeProfile, 'findUnique', async () => ({ userId: 'u1', maxBillableHoursPerDay: 8 })],
    [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((e) => inRange(e.start, args.where.start))],
    [prisma.dailyLog, 'findMany', async () => []],
    [prisma.overtimeRequest, 'findMany', async (args: any) => {
      queriedOvertimeWindows.push(args.where.workDate)
      return overtime.filter((o) => inRange(o.workDate, args.where.workDate))
    }],
  ], async () => {
    const service = new PayrollService()
    const first = await service.calculateEmployeeHours('u1', new Date(2026, 9, 1), new Date(2026, 9, 15, 23, 59, 59))
    const second = await service.calculateEmployeeHours('u1', new Date(2026, 9, 16), new Date(2026, 9, 31, 23, 59, 59))
    assert.equal(first.totalHours, 0, 'the day 16 shift is not in the first period')
    assert.equal(first.overtimeApprovedHours, 0, 'the day 16 approval is not loaded into the first period')
    assert.equal(second.totalHours, 11, 'both day 16 blocks count once, in the second period')
    assert.equal(second.billableHours, 8, 'one daily cap for the whole Manila day')
    assert.equal(second.overtimeApprovedHours, 3)
    for (const window of queriedOvertimeWindows) {
      assert.ok(window.lt && !window.lte, 'OT window is half-open, no padding')
    }
    assert.equal(queriedOvertimeWindows[0].lt.toISOString(), '2026-10-15T16:00:00.000Z', 'first period ends at Manila midnight of day 16')
    assert.equal(queriedOvertimeWindows[1].gte.toISOString(), '2026-10-15T16:00:00.000Z', 'second period starts there, no gap or overlap')
  })
}

async function runHourlyRateAndEditedPayslipTests() {
  const updates: any[] = []
  await withStubs([
    [prisma.employeeProfile, 'findUnique', async () => ({ userId: 'u1', payBasis: 'hourly_from_monthly', hourlyRate: null })],
    [prisma.employeeProfile, 'update', async (args: any) => { updates.push(args.data); return args.data }],
  ], async () => {
    const service = new PayrollService()
    await assert.rejects(service.updateEmployeeProfile('u1', { payBasis: 'hourly_rate' }), (error: unknown) =>
      error instanceof PayrollValidationError && error.message === HOURLY_RATE_REQUIRED_MESSAGE)
    await assert.rejects(service.updateEmployeeProfile('u1', { payBasis: 'hourly_rate', hourlyRate: 0 }), PayrollValidationError)
    await service.updateEmployeeProfile('u1', { payBasis: 'hourly_rate', hourlyRate: 300 })
    assert.deepEqual(updates[0], { payBasis: 'hourly_rate', hourlyRate: 300 })
  })

  // Regenerating a hand-edited payslip needs force: true.
  await withStubs([
    [prisma.payrollPeriod, 'findUnique', async () => ({ id: 'per1', status: 'draft' })],
    [prisma.payslip, 'findFirst', async () => ({ id: 'ps1', editedAt: new Date() })],
  ], async () => {
    await assert.rejects(new PayrollService().generatePayslip('per1', 'u1'), (error: unknown) =>
      error instanceof PayrollConflictError && error.message === EDITED_PAYSLIP_MESSAGE)
  })
}

async function runManualGenerateKeepsOvertimeTest() {
  // Fix 1 (2026-10-09): a manual generate (hoursWorked sent) used to write one
  // regular-hours line and drop approved overtime. The admin's hours replace the
  // regular line only; approved and unapproved overtime lines are still added.
  config.payrollTimezone = MANILA
  const bounds = periodBoundsForDays('2026-10-01', '2026-10-15', MANILA)
  const period = { id: 'per-ot', status: 'draft', startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate }
  const day = (key: string, hour: number) => new Date(zonedMidnightUtc(key, MANILA).getTime() + hour * 60 * 60 * 1000)
  const entries = [
    { start: day('2026-10-05', 8), duration: 10 * 60 }, // 2 h over the cap, approved
    { start: day('2026-10-06', 8), duration: 11 * 60 }, // 3 h over the cap, never approved
  ]
  // Asked for 3 h, a reviewer approved 2 h: pay reads approvedHours.
  const overtime = [{ workDate: zonedMidnightUtc('2026-10-05', MANILA), hours: 3, approvedHours: 2 }]
  const created: any[] = []
  await withStubs([
    [prisma.payrollPeriod, 'findUnique', async () => period],
    [prisma.payslip, 'findFirst', async () => null],
    [prisma.payslip, 'create', async (args: any) => { created.push(args.data); return { id: 'ps-ot', ...args.data } }],
    [prisma.employeeProfile, 'findUnique', async () => ({
      userId: 'u1', payBasis: 'hourly_rate', hourlyRate: 500, overtimeMultiplier: 1.25,
      maxBillableHoursPerDay: 8, baseSalary: 0, currency: 'PHP',
    })],
    [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((e) => inRange(e.start, args.where.start))],
    [prisma.dailyLog, 'findMany', async () => []],
    [prisma.overtimeRequest, 'findMany', async (args: any) => overtime.filter((o) => inRange(o.workDate, args.where.workDate))],
    [emailService, 'sendPayslipNotification', async () => undefined],
  ], async () => {
    const service = new PayrollService()
    await service.generatePayslip('per-ot', 'u1', { hoursWorked: 12 })
    const items = created[0].items.create as Array<{ type: string; amount: number; description: string }>
    const byType = (type: string) => items.find((item) => item.type === type)
    assert.equal(byType('regular_hours')?.amount, 6000, 'manual 12 h x 500')
    assert.equal(byType('overtime_approved')?.amount, 1250, 'approved 2 h x 500 x 1.25 is still paid')
    assert.equal(byType('overtime_pending')?.amount, 0)
    assert.equal(byType('overtime_pending')?.description, 'Unapproved overtime, not paid (3 h)')
    assert.equal(created[0].grossPay, 7250)
    assert.equal(created[0].netPay, 7250)

    // The automatic path and the preview agree on gross pay.
    created.length = 0
    const preview = await service.previewPayslip('u1', period.startDate, period.endDate)
    await service.generatePayslip('per-ot', 'u1')
    assert.equal(preview.overtimeApprovedHours, 2)
    assert.equal(preview.overtimePay, 1250)
    assert.equal(created[0].grossPay, preview.grossPay)
    assert.equal(preview.grossPay, 8000 + 1250, '16 billable h x 500 plus approved OT')

    // Deductions sent without an hours override still apply on the automatic path.
    created.length = 0
    await service.generatePayslip('per-ot', 'u1', { deductions: [{ name: 'Tax', amount: 250, type: 'tax' }] })
    assert.equal(created[0].grossPay, 9250)
    assert.equal(created[0].netPay, 9000)
  })
}

async function runPayslipEditServiceTests() {
  const payslips: Record<string, { userId: string; status: string }> = {
    own: { userId: 'u-bookkeeper', status: 'draft' },
    locked: { userId: 'u-employee', status: 'processed' },
    open: { userId: 'u-employee', status: 'draft' },
  }
  const matches = (where: any) => {
    const row = payslips[where.id]
    return Boolean(row && row.userId !== where.userId.not && row.status === where.period.status)
  }
  const tx = {
    payslip: {
      updateMany: async (args: any) => ({ count: matches(args.where) ? 1 : 0 }),
      deleteMany: async (args: any) => ({ count: matches(args.where) ? 1 : 0 }),
      findUnique: async (args: any) => {
        const row = payslips[args.where.id]
        return row ? { id: args.where.id, userId: row.userId, period: { status: row.status } } : null
      },
    },
    payrollItem: { deleteMany: async () => ({ count: 0 }), createMany: async () => ({ count: 1 }) },
  }
  const edit = { items: [{ type: 'allowance', description: 'Internet', amount: 100 }], note: 'Fix' }
  await withStubs([[prisma, '$transaction', async (fn: (client: unknown) => unknown) => fn(tx)]], async () => {
    const service = new PayslipEditService()
    await assert.rejects(service.editPayslip('own', 'u-bookkeeper', edit), (error: unknown) =>
      error instanceof PayrollForbiddenError && error.message === OWN_PAYSLIP_MESSAGE)
    await assert.rejects(service.deletePayslip('own', 'u-bookkeeper'), PayrollForbiddenError)
    await assert.rejects(service.editPayslip('locked', 'u-bookkeeper', edit), PayrollConflictError)
    await assert.rejects(service.deletePayslip('locked', 'u-bookkeeper'), PayrollConflictError)
    await service.editPayslip('open', 'u-bookkeeper', edit)
    await service.deletePayslip('open', 'u-bookkeeper')
  })
}

async function runLockedPeriodAndWithdrawTests() {
  config.payrollTimezone = MANILA
  // A one-day processed period 10 days ago (inside the 60-day correction window).
  // That Manila day is locked; the next Manila day is open.
  const lockedKey = payrollDayKey(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), MANILA)
  const [year, month, day] = lockedKey.split('-').map(Number)
  const processed = [{ startDate: new Date(year, month - 1, day), endDate: new Date(year, month - 1, day, 23, 59, 59) }]
  const lockedDay = zonedMidnightUtc(lockedKey, MANILA)
  const openDay = payrollDayWindow(lockedKey, MANILA).end
  const hoursInto = (hours: number) => new Date(lockedDay.getTime() + hours * 60 * 60 * 1000)
  const periodFindMany = async (args: any) => (args.where.status?.not === 'draft' ? processed : [])
  const overtime: Record<string, any> = {
    'ot-locked': { id: 'ot-locked', userId: 'u-employee', workDate: lockedDay, hours: 1, status: 'pending' },
    'ot-open': { id: 'ot-open', userId: 'u-employee', workDate: openDay, hours: 1, status: 'pending' },
    'ot-approved': { id: 'ot-approved', userId: 'u-employee', workDate: openDay, hours: 1, status: 'approved' },
  }
  const reviewed: string[] = []
  const reviewData: any[] = []
  const adjustment = {
    id: 'adj1', userId: 'u-employee', action: 'update', timeEntryId: 'te_locked',
    proposedStart: null, proposedEnd: hoursInto(9), reason: 'Left late', status: 'pending',
  }
  const tx = {
    payrollPeriod: { findMany: periodFindMany },
    timeEntryAdjustmentRequest: {
      findUnique: async () => adjustment,
      findFirst: async () => null,
      updateMany: async () => ({ count: 1 }),
      create: async () => ({ id: 'created' }),
    },
    timeEntry: {
      findUnique: async () => ({ id: 'te_locked', userId: 'u-employee', start: hoursInto(1), end: hoursInto(8), notes: null }),
    },
  }
  await withStubs([
    [prisma.payrollPeriod, 'findMany', periodFindMany],
    [prisma.overtimeRequest, 'findUnique', async (args: any) => overtime[args.where.id] ?? null],
    [prisma.overtimeRequest, 'updateMany', async (args: any) => {
      reviewed.push(args.where.id)
      reviewData.push(args.data)
      return { count: 1 }
    }],
    [prisma.overtimeRequest, 'delete', async () => ({})],
    [prisma, '$transaction', async (fn: (client: unknown) => unknown) => fn(tx)],
  ], async () => {
    const service = new TimeRequestsService()
    await assert.rejects(service.reviewOvertimeRequest('ot-locked', 'u-manager', 'approved', {}), PayrollConflictError)
    await service.reviewOvertimeRequest('ot-open', 'u-manager', 'approved', { hours: 0.5 })
    assert.deepEqual(reviewed, ['ot-open'], 'only the open-period approval was written')
    assert.equal(reviewData[0].approvedHours, 0.5, 'approved hours are stored separately')
    assert.equal('hours' in reviewData[0], false, 'the original ask is never overwritten')

    await assert.rejects(service.approveAdjustmentRequest('adj1', 'u-manager', {}), PayrollConflictError)
    await assert.rejects(
      service.createAdjustmentRequest('u-employee', { timeEntryId: 'te_locked', proposedEnd: hoursInto(9).toISOString(), reason: 'Left late' }),
      PayrollConflictError,
    )

    // Reviewers may delete pending requests only.
    await assert.rejects(service.deleteOvertimeRequest('ot-approved', { requesterId: 'u-manager', canReview: true }), PayrollConflictError)
    await service.deleteOvertimeRequest('ot-open', { requesterId: 'u-manager', canReview: true })
  })
}

async function runAdjustmentPreviousTimesTest() {
  config.payrollTimezone = MANILA
  // 01:30 on Oct 9 in Manila is still Oct 8 in UTC; the note uses the Manila day.
  assert.equal(appendCorrectionNote(null, 'Left late', new Date('2026-10-08T17:30:00Z')), 'Correction approved 2026-10-09: Left late')

  const oldStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const oldEnd = new Date(oldStart.getTime() + 8 * 60 * 60 * 1000)
  const request = {
    id: 'adj-prev', userId: 'u-employee', action: 'update', timeEntryId: 'te_prev',
    proposedStart: null, proposedEnd: new Date(oldEnd.getTime() + 60 * 60 * 1000), reason: 'Left late', status: 'pending',
  }
  const finalWrites: any[] = []
  const tx = {
    payrollPeriod: { findMany: async () => [] },
    timeEntryAdjustmentRequest: {
      findUnique: async () => request,
      updateMany: async () => ({ count: 1 }),
      update: async (args: any) => { finalWrites.push(args.data); return { id: 'adj-prev', ...args.data } },
    },
    timeEntry: {
      findUnique: async () => ({ id: 'te_prev', userId: 'u-employee', start: oldStart, end: oldEnd, notes: null }),
      update: async () => ({}),
    },
  }
  await withStubs([[prisma, '$transaction', async (fn: (client: unknown) => unknown) => fn(tx)]], async () => {
    await new TimeRequestsService().approveAdjustmentRequest('adj-prev', 'u-manager', {})
    assert.deepEqual(finalWrites[0], { timeEntryId: 'te_prev', previousStart: oldStart, previousEnd: oldEnd })
  })
}

async function main() {
  const savedTimezone = config.payrollTimezone
  const savedAdminEmails = config.adminEmails
  config.adminEmails = [...savedAdminEmails, users.emailAdmin.email]
  try {
    await runRouteGuardTests()
    await runOAuthPendingTest()
    await runPeriodWindowTest()
    await runHourlyRateAndEditedPayslipTests()
    await runManualGenerateKeepsOvertimeTest()
    await runAdjustmentPreviousTimesTest()
    await runPayslipEditServiceTests()
    await runLockedPeriodAndWithdrawTests()
  } finally {
    ;(prisma.user as any).findUnique = originals.userFindUnique
    ;(prisma.user as any).create = originals.userCreate
    ;(prisma.userRole as any).findMany = originals.userRoleFindMany
    ;(prisma.timeEntry as any).findUnique = originals.timeEntryFindUnique
    config.payrollTimezone = savedTimezone
    config.adminEmails = savedAdminEmails
  }
  console.log('payroll.v2.routes tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
