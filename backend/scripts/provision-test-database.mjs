#!/usr/bin/env node
/**
 * Provision an EMPTY test database (CI runners, or a fresh local one).
 *
 * The migration history has no baseline: 202605210001 alters "Task" without
 * creating it, so `prisma migrate deploy` cannot run from an empty database,
 * and `prisma db push` alone leaves out the rows the data migrations seed
 * (payroll schemes and options, employment categories, the Disbursement
 * Officer role). This does what docs/dev-notes.md (20 Oct 2026) did for the
 * local test database:
 *   1. push the schema as it was at the baseline migration,
 *   2. mark every migration up to the baseline as applied,
 *   3. `prisma migrate deploy` the rest, data included,
 *   4. regenerate the Prisma client from the current schema (step 1 generated
 *      one from the baseline schema).
 *
 * Run from anywhere with DATABASE_URL (or DIRECT_DATABASE_URL / DIRECT_URL,
 * which prisma.config.ts prefers) pointing at an empty database. It refuses a
 * database that already has tables, so it cannot touch a dev or production one.
 * prisma/schema.prisma is swapped for the baseline copy during step 1 and
 * restored whatever happens; a leftover schema.prisma.provision-backup means an
 * earlier run was killed, restore it by hand before running again.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const BASELINE = '202610140002_user_notifications'
// The commit that added the baseline migration; its schema.prisma matches that state.
const BASELINE_COMMIT = 'a941563e390e3962136410013675403e02bf1411'

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma')
const backupPath = schemaPath + '.provision-backup'
const migrationsDir = path.join(backendDir, 'prisma', 'migrations')

const databaseUrl = (process.env.DIRECT_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || '').trim()

class ProvisionError extends Error {}

function prisma(args) {
    // A shell so the npx shim resolves on Windows too; the arguments are fixed strings.
    const result = spawnSync(`npx prisma ${args}`, { cwd: backendDir, stdio: 'inherit', shell: true })
    if (result.status !== 0) throw new ProvisionError(`"prisma ${args}" exited with ${result.status}`)
}

function git(args, options = {}) {
    return execFileSync('git', args, { cwd: backendDir, encoding: 'utf8', ...options })
}

async function assertEmptyDatabase() {
    const client = new Client({ connectionString: databaseUrl })
    try {
        await client.connect()
    } catch (error) {
        throw new ProvisionError(`cannot connect to the database: ${error instanceof Error ? error.message : String(error)}`)
    }
    try {
        const { rows } = await client.query(
            'SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = current_schema()',
        )
        if (rows[0].tables > 0) {
            throw new ProvisionError(`the database already has ${rows[0].tables} table(s); this script only provisions an empty one`)
        }
    } finally {
        await client.end()
    }
}

function baselineSchema() {
    const probe = spawnSync('git', ['cat-file', '-e', `${BASELINE_COMMIT}^{commit}`], { cwd: backendDir })
    if (probe.status !== 0) git(['fetch', '--depth=1', 'origin', BASELINE_COMMIT], { stdio: 'inherit' })
    return git(['show', `${BASELINE_COMMIT}:backend/prisma/schema.prisma`])
}

function migrationsUpToBaseline() {
    return readdirSync(migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name <= BASELINE)
        .map((entry) => entry.name)
        .sort()
}

function pushBaselineSchema() {
    if (existsSync(backupPath)) {
        throw new ProvisionError(`${path.basename(backupPath)} exists from an earlier run; restore prisma/schema.prisma from it first`)
    }
    copyFileSync(schemaPath, backupPath)
    try {
        writeFileSync(schemaPath, baselineSchema())
        prisma('db push --accept-data-loss')
    } finally {
        copyFileSync(backupPath, schemaPath)
        unlinkSync(backupPath)
    }
}

async function main() {
    if (!databaseUrl) throw new ProvisionError('set DATABASE_URL to the empty database to provision')
    await assertEmptyDatabase()

    const baseline = migrationsUpToBaseline()
    if (!baseline.includes(BASELINE)) throw new ProvisionError(`baseline migration ${BASELINE} is missing from prisma/migrations`)

    console.log(`provision-test-database: pushing the schema as of ${BASELINE} (${BASELINE_COMMIT.slice(0, 7)})`)
    pushBaselineSchema()

    console.log(`provision-test-database: marking ${baseline.length} migrations up to the baseline as applied`)
    for (const name of baseline) prisma(`migrate resolve --applied ${name}`)

    console.log('provision-test-database: deploying the migrations after the baseline')
    prisma('migrate deploy')

    console.log('provision-test-database: regenerating the Prisma client from the current schema')
    prisma('generate')
    console.log('provision-test-database: done')
}

try {
    await main()
} catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`provision-test-database: ${message}`)
    process.exit(1)
}
