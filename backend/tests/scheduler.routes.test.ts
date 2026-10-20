import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { SchedulerController, requireSchedulerSecret } from '../src/scheduler/scheduler.controller'
import { config } from '../src/config/env.config'
import { SchedulerService } from '../src/scheduler/scheduler.service'
import { prisma } from '../src/database/prisma.service'
import {
  addDaysToKey,
  monthlyPeriodForDay,
  payrollDayKey,
  periodEndDayKey,
  periodStartDayKey,
  semiMonthlyPeriodForDay,
} from '../src/payroll/payroll.calculations'

const schedulerRouter = new SchedulerController().router() as any

function findRoute(routePath: string, method: string) {
  return schedulerRouter.stack.find((layer: any) =>
    layer.route?.path === routePath &&
    layer.route?.methods?.[method],
  )
}

const cronGetRoute = findRoute('/cron', 'get')
assert.ok(cronGetRoute, 'GET /cron route is registered for Vercel Cron')
assert.ok(cronGetRoute.route.stack.length >= 2, 'GET /cron requires scheduler secret middleware')

const cronPostRoute = findRoute('/cron', 'post')
assert.ok(cronPostRoute, 'POST /cron route remains registered for manual/local compatibility')
assert.ok(cronPostRoute.route.stack.length >= 2, 'POST /cron requires scheduler secret middleware')

const manualRunRoute = findRoute('/run/:jobType', 'post')
assert.ok(manualRunRoute, 'POST /run/:jobType route is registered')
assert.ok(
  manualRunRoute.route.stack.length >= 3,
  'POST /run/:jobType requires auth and scheduler-management authorization',
)

const runsRoute = findRoute('/runs', 'get')
assert.ok(runsRoute, 'GET /runs route is registered')
assert.ok(
  runsRoute.route.stack.length >= 3,
  'GET /runs requires auth and scheduler-management authorization',
)

const repoRoot = path.resolve(__dirname, '..', '..')
const migrationPath = path.join(
  repoRoot,
  'backend',
  'prisma',
  'migrations',
  '202606180001_scheduler_job_runs',
  'migration.sql',
)
const migrationSql = fs.readFileSync(migrationPath, 'utf8')
const envConfigSource = fs.readFileSync(path.join(repoRoot, 'backend', 'src', 'config', 'env.config.ts'), 'utf8')
const schedulerControllerSource = fs.readFileSync(path.join(repoRoot, 'backend', 'src', 'scheduler', 'scheduler.controller.ts'), 'utf8')

assert.ok(
  migrationSql.includes('CREATE TABLE "SchedulerJobRun"'),
  'SchedulerJobRun migration creates the table used by SchedulerService',
)
assert.ok(
  migrationSql.includes('CREATE INDEX "SchedulerJobRun_jobType_idx"'),
  'SchedulerJobRun migration tracks job type lookup index',
)
assert.ok(
  migrationSql.includes('CREATE INDEX "SchedulerJobRun_status_idx"'),
  'SchedulerJobRun migration tracks status lookup index',
)
assert.ok(
  migrationSql.includes('CREATE INDEX "SchedulerJobRun_startedAt_idx"'),
  'SchedulerJobRun migration tracks recent-run ordering index',
)

const vercelConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'))
assert.ok(Array.isArray(vercelConfig.crons), 'vercel.json declares cron jobs')
assert.ok(vercelConfig.crons.length > 0, 'vercel.json has at least one cron job')
for (const cron of vercelConfig.crons) {
  assert.equal(cron.path, '/api/scheduler/cron', 'Vercel cron targets the scheduler cron endpoint')
}
// Monthly payroll (2026-10-20): 00:00 UTC (08:00 Manila) on the 1st and the 16th.
// Hobby allows two crons; the 16th keeps the billing jobs on time and only
// retries payroll (period-advance skips, auto-payslip regenerates the same period).
assert.deepEqual(
  vercelConfig.crons.map((cron: { schedule: string }) => cron.schedule),
  ['0 0 1 * *', '0 0 16 * *'],
  'the scheduler runs on the 1st and the 16th',
)

assert.ok(
  envConfigSource.includes("getOptionalEnvVar('CRON_SECRET') || getOptionalEnvVar('SCHEDULER_SECRET')"),
  'Scheduler config prefers CRON_SECRET and falls back to SCHEDULER_SECRET',
)

for (const payrollRole of ['payroll_assistant', 'payroll_finance', 'contractor_salary_payments']) {
  assert.ok(
    schedulerControllerSource.includes(`'${payrollRole}'`),
    `Scheduler manual routes allow payroll-management role ${payrollRole}`,
  )
}

// Rule 8: the auto-payslip job generates the period that just ended, even though
// its pay date is still 5 days away (it used to skip until payDate - 2 days).
async function runAutoPayslipEndedPeriodTest() {
  const originals = {
    jobRunCreate: prisma.schedulerJobRun.create,
    periodFindMany: prisma.payrollPeriod.findMany,
  }
  const justEnded = {
    id: 'period-ended',
    status: 'draft',
    startDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 60 * 60 * 1000),
    payDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  }
  ;(prisma.schedulerJobRun as any).create = async () => { throw new Error('no database in this test') }
  ;(prisma.payrollPeriod as any).findMany = async () => [justEnded]
  const generated: string[] = []
  const service = new SchedulerService()
  ;(service as any).payrollService = {
    bulkGeneratePayslips: async (periodId: string) => {
      generated.push(periodId)
      return [
        { userId: 'u1', success: true, payslipId: 'p1' },
        { userId: 'u2', success: true, skipped: true, reason: 'Edited by hand; kept as is' },
      ]
    },
  }
  try {
    const result: any = await service.runAutoPayslip('manual')
    assert.deepEqual(generated, ['period-ended'], 'the ended period is generated immediately')
    assert.equal(result.status, 'success')
    assert.equal(result.summary?.succeeded, 1)
    assert.equal(result.summary?.skippedEdited, 1)
  } finally {
    ;(prisma.schedulerJobRun as any).create = originals.jobRunCreate
    ;(prisma.payrollPeriod as any).findMany = originals.periodFindMany
  }
}

// Monthly cadence (2026-10-20). Production keeps October in two semi-monthly
// halves: a half that overlaps the expected month makes period-advance skip.
// With nothing in the month it creates the whole month, a September stored at
// UTC midnight does not block it, and the mid-month run on the 16th skips.
async function runPeriodAdvanceMonthlyTest() {
  const originals = {
    jobRunCreate: prisma.schedulerJobRun.create,
    periodFindMany: prisma.payrollPeriod.findMany,
    periodCreate: prisma.payrollPeriod.create,
    timeZone: config.payrollTimezone,
    cadence: config.payrollPeriodCadence,
  }
  config.payrollTimezone = 'Asia/Manila'
  config.payrollPeriodCadence = 'monthly'
  const today = payrollDayKey(new Date(), config.payrollTimezone)
  const half = semiMonthlyPeriodForDay(today, config.payrollTimezone)
  const month = monthlyPeriodForDay(today, config.payrollTimezone)
  const previousMonthEnd = addDaysToKey(periodStartDayKey(month.start), -1)

  // In-memory rows; findMany applies the date filter the database would.
  type Row = { id: string; startDate: Date; endDate: Date; payDate?: Date; status: string }
  const stored: Row[] = [{ id: 'half', startDate: half.start, endDate: half.end, payDate: half.payDate, status: 'draft' }]
  const created: Row[] = []
  ;(prisma.schedulerJobRun as any).create = async () => { throw new Error('no database in this test') }
  ;(prisma.payrollPeriod as any).findMany = async (args: any) => stored.filter((row) =>
    row.startDate.getTime() <= args.where.startDate.lte.getTime()
    && row.endDate.getTime() >= args.where.endDate.gte.getTime())
  ;(prisma.payrollPeriod as any).create = async (args: any) => {
    const row = { id: `created-${created.length + 1}`, ...args.data }
    created.push(row)
    stored.push(row)
    return row
  }
  const service = new SchedulerService()

  try {
    const skipped: any = await service.runPeriodAdvance('manual')
    assert.equal(skipped.status, 'skipped', 'an overlapping semi-monthly half blocks the whole month')
    assert.equal(skipped.summary.periodId, 'half')
    assert.equal(skipped.summary.cadence, 'monthly')
    assert.equal(created.length, 0, 'nothing is added on top of the half')

    stored.splice(0, stored.length, {
      id: 'previous-month-utc',
      startDate: new Date(`${previousMonthEnd.slice(0, 8)}01T00:00:00Z`),
      endDate: new Date(`${previousMonthEnd}T23:59:59Z`),
      status: 'draft',
    })
    const first: any = await service.runPeriodAdvance('manual')
    assert.equal(first.status, 'success', 'no period in the month: the whole month is created')
    assert.equal(created.length, 1)
    assert.equal(created[0].startDate.toISOString(), month.start.toISOString())
    assert.equal(created[0].endDate.toISOString(), month.end.toISOString())
    assert.equal(created[0].payDate?.toISOString(), month.payDate.toISOString())
    assert.equal(created[0].status, 'draft')
    assert.equal(first.summary.startDate, periodStartDayKey(month.start))
    assert.equal(first.summary.endDate, periodEndDayKey(month.end))

    const retry: any = await service.runPeriodAdvance('manual')
    assert.equal(retry.status, 'skipped', 'the retry finds the month and skips')
    assert.equal(retry.summary.periodId, created[0].id)
    assert.equal(created.length, 1)
  } finally {
    ;(prisma.schedulerJobRun as any).create = originals.jobRunCreate
    ;(prisma.payrollPeriod as any).findMany = originals.periodFindMany
    ;(prisma.payrollPeriod as any).create = originals.periodCreate
    config.payrollTimezone = originals.timeZone
    config.payrollPeriodCadence = originals.cadence
  }
}

// Missing CRON_SECRET in production: a clear 503 (not a bare 500), and the job never runs.
function runMissingSchedulerSecretTest() {
  const original = { nodeEnv: config.nodeEnv, schedulerSecret: config.schedulerSecret }
  ;(config as any).nodeEnv = 'production'
  ;(config as any).schedulerSecret = undefined
  try {
    let statusCode = 0
    let body: any
    let nextCalled = false
    const res: any = {
      status(code: number) { statusCode = code; return res },
      json(payload: unknown) { body = payload; return res },
    }
    requireSchedulerSecret({ method: 'GET', originalUrl: '/api/scheduler/cron', headers: {} } as any, res, () => { nextCalled = true })
    assert.equal(statusCode, 503, 'missing scheduler secret answers 503')
    assert.equal(body?.code, 'SCHEDULER_SECRET_MISSING')
    assert.equal(nextCalled, false, 'cron handler does not run without a secret')
  } finally {
    ;(config as any).nodeEnv = original.nodeEnv
    ;(config as any).schedulerSecret = original.schedulerSecret
  }
}

runMissingSchedulerSecretTest()

runAutoPayslipEndedPeriodTest()
  .then(runPeriodAdvanceMonthlyTest)
  .then(() => console.log('scheduler.routes tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
