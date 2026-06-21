import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { SchedulerController } from '../src/scheduler/scheduler.controller'

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

assert.ok(
  envConfigSource.includes("getOptionalEnvVar('CRON_SECRET') || getOptionalEnvVar('SCHEDULER_SECRET')"),
  'Scheduler config prefers CRON_SECRET and falls back to SCHEDULER_SECRET',
)

console.log('scheduler.routes tests passed')
