import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { OrgChartController } from '../src/org-chart/org-chart.controller'
import { UsersController } from '../src/users/users.controller'
import { UsersService } from '../src/users/users.service'
import { searchPeople } from '../src/search/search.internal'
import { excludeSystemAccounts, getSystemAccountEmails, isSystemAccountEmail } from '../src/org/system-accounts'

/**
 * System accounts (src/org/system-accounts.ts): the bootstrap admin keeps its
 * access but is left out of GET /api/users (plain and paginated, count included),
 * GET /api/users/search, GET /api/org-chart and the People section of global
 * search. GET /api/users/:id still returns
 * it, and SYSTEM_ACCOUNT_EMAILS replaces the default list.
 */

type JsonRecord = Record<string, any>
type Caller = { id: string; email: string }

const ENV_KEY = 'SYSTEM_ACCOUNT_EMAILS'
const BOOTSTRAP_ADMIN_EMAIL = 'admin@savage.com'

function setSystemAccountEnv(value: string | undefined) {
  if (value === undefined) delete process.env[ENV_KEY]
  else process.env[ENV_KEY] = value
}

async function requestJson(baseUrl: string, path: string, as: Caller): Promise<{ status: number; body: any }> {
  const token = JwtService.generateAccessToken({ userId: as.id, email: as.email })
  const response = await fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } })
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

function testEmailList() {
  setSystemAccountEnv(undefined)
  assert.deepEqual(getSystemAccountEmails(), [BOOTSTRAP_ADMIN_EMAIL], 'unset means the bootstrap admin')
  getSystemAccountEmails().push('changed@example.com')
  assert.deepEqual(getSystemAccountEmails(), [BOOTSTRAP_ADMIN_EMAIL], 'callers get a copy of the default')
  assert.equal(isSystemAccountEmail(' Admin@Savage.com '), true)
  assert.equal(isSystemAccountEmail('pol@savage.com'), false)
  assert.equal(isSystemAccountEmail(undefined), false)
  assert.deepEqual(excludeSystemAccounts(), { NOT: { email: { in: [BOOTSTRAP_ADMIN_EMAIL], mode: 'insensitive' } } })

  setSystemAccountEnv(' Bot@Example.com, ,ops@EXAMPLE.com ,')
  assert.deepEqual(getSystemAccountEmails(), ['bot@example.com', 'ops@example.com'], 'trimmed, lowercased, blanks dropped')
  assert.equal(isSystemAccountEmail('OPS@example.com'), true)
  assert.equal(isSystemAccountEmail(BOOTSTRAP_ADMIN_EMAIL), false, 'the override replaces the default')

  setSystemAccountEnv('')
  assert.deepEqual(getSystemAccountEmails(), [], 'set but empty hides nobody')
  assert.equal(isSystemAccountEmail(BOOTSTRAP_ADMIN_EMAIL), false)
  assert.deepEqual(excludeSystemAccounts(), {})

  setSystemAccountEnv(' , ')
  assert.deepEqual(getSystemAccountEmails(), [])
}

async function runRouteTests() {
  const preexisting = await prisma.user.findUnique({ where: { email: BOOTSTRAP_ADMIN_EMAIL }, select: { id: true } })
  assert.equal(preexisting, null, `${BOOTSTRAP_ADMIN_EMAIL} already exists in this database; run the suite on a test database`)

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createdIds: string[] = []

  async function member(email: string, name: string, role: string, managerId?: string): Promise<Caller> {
    const user = await prisma.user.create({
      data: { email, name, status: 'active', isApproved: true, managerId, roles: { create: { role } } },
      select: { id: true, email: true },
    })
    createdIds.push(user.id)
    return user
  }

  try {
    const bootstrapAdmin = await member(BOOTSTRAP_ADMIN_EMAIL, `Savage Admin ${suffix}`, 'Owner / Founder')
    // Mixed case in the database, upper case in the env: the match ignores case on both sides.
    const bot = await member(`Ops-Bot-${suffix}@Example.com`, `Ops Bot ${suffix}`, 'Inventory VA')
    const report = await member(`system-report-${suffix}@example.com`, `Report ${suffix}`, 'Inventory VA', bootstrapAdmin.id)
    const viewer = await member(`system-viewer-${suffix}@example.com`, `Viewer ${suffix}`, 'Inventory VA')

    await withServer(async (baseUrl) => {
      const get = async (path: string, as: Caller = viewer) => {
        const response = await requestJson(baseUrl, path, as)
        assert.equal(response.status, 200, `GET ${path}`)
        return response.body
      }

      // Everything the list routes return, read with the env as it is now. The route
      // always paginates (100 by default), so the unpaginated findAll is called directly.
      async function lists() {
        const plain: JsonRecord[] = await get('/api/users')
        const paged = await get('/api/users?page=1&limit=100')
        const search: JsonRecord[] = await get(`/api/users/search?q=${encodeURIComponent(suffix)}`)
        const chart: JsonRecord[] = (await get('/api/org-chart')).members
        const unpaginated = (await new UsersService().findAll()) as JsonRecord[]
        // Global search People section, called directly: its ids read 'person:<id>'.
        const people = (await searchPeople(suffix, 100)).map((row) => ({ ...row, id: String(row.id).replace(/^person:/, '') }))
        const byId = (rows: JsonRecord[]) => new Map<string, JsonRecord>(rows.map((row) => [row.id, row]))
        return {
          plain: byId(plain),
          paged: byId(paged.data),
          total: paged.total as number,
          search: byId(search),
          chart: byId(chart),
          unpaginated: byId(unpaginated),
          people: byId(people),
        }
      }

      function assertListed(listed: Awaited<ReturnType<typeof lists>>, user: Caller, expected: boolean) {
        for (const route of ['plain', 'paged', 'search', 'chart', 'unpaginated', 'people'] as const) {
          assert.equal(listed[route].has(user.id), expected, `${user.email} ${expected ? 'is' : 'is not'} in ${route}`)
        }
      }

      // Default (unset): the bootstrap admin is hidden everywhere, with full access kept.
      setSystemAccountEnv(undefined)
      const hidden = await lists()
      assertListed(hidden, bootstrapAdmin, false)
      for (const visible of [bot, report, viewer]) assertListed(hidden, visible, true)
      assert.equal(hidden.plain.get(report.id)!.managerId, bootstrapAdmin.id, 'the reporting line itself is kept')
      assert.equal('manager' in hidden.plain.get(report.id)!, false, 'a hidden manager is not shown')
      assert.equal('manager' in hidden.search.get(report.id)!, false)
      assert.equal(hidden.unpaginated.get(report.id)!.manager, null)
      assert.equal(hidden.chart.get(report.id)!.managerId, bootstrapAdmin.id, 'the page shows this member as a root')

      const byId = await get(`/api/users/${bootstrapAdmin.id}`)
      assert.equal(byId.email, BOOTSTRAP_ADMIN_EMAIL, 'GET /api/users/:id still returns the account')
      const adminChart = await get('/api/org-chart', bootstrapAdmin)
      assert.equal(adminChart.viewer.isFullAccess, true, 'the hidden account keeps full access')
      assert.equal(adminChart.members.some((entry: JsonRecord) => entry.id === bootstrapAdmin.id), false)
      await get('/api/users', bootstrapAdmin)

      // Override: another address is hidden instead, and the bootstrap admin is listed again.
      setSystemAccountEnv(`  OPS-BOT-${suffix.toUpperCase()}@EXAMPLE.COM , `)
      const overridden = await lists()
      assertListed(overridden, bot, false)
      for (const visible of [bootstrapAdmin, report, viewer]) assertListed(overridden, visible, true)
      assert.equal(overridden.plain.get(report.id)!.manager.email, BOOTSTRAP_ADMIN_EMAIL)
      assert.equal((await get(`/api/users/${bot.id}`)).id, bot.id)

      // Set but empty: nobody is hidden. Each hidden account was one fewer in the count.
      setSystemAccountEnv('')
      const all = await lists()
      for (const visible of [bootstrapAdmin, bot, report, viewer]) assertListed(all, visible, true)
      assert.equal(all.total - hidden.total, 1, 'the paginated total leaves the bootstrap admin out')
      assert.equal(all.total - overridden.total, 1, 'the paginated total leaves the override out')
    })
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: createdIds } } })
  }
}

async function main() {
  const original = process.env[ENV_KEY]
  try {
    testEmailList()
    await runRouteTests()
  } finally {
    setSystemAccountEnv(original)
  }
  console.log('system-accounts tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
