import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '..');
const migrationsRoot = path.join(backendRoot, 'prisma', 'migrations');

for (const envFile of ['.env.production', '.env']) {
  const envPath = path.join(backendRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const migrationDatabaseUrl = (
  process.env.DIRECT_DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();
const databaseSchema = getDatabaseSchema(migrationDatabaseUrl);

if (!migrationDatabaseUrl) {
  console.error('Missing DATABASE_URL, DIRECT_DATABASE_URL, or DIRECT_URL for production database bootstrap.');
  process.exit(1);
}

function getDatabaseSchema(connectionString) {
  try {
    const parsedUrl = new URL(connectionString);
    return parsedUrl.searchParams.get('schema') || 'public';
  } catch {
    return 'public';
  }
}

function runPrisma(args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['prisma', ...args], {
    cwd: backendRoot,
    env: {
      ...process.env,
      DATABASE_URL: migrationDatabaseUrl,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function listSchemaTables() {
  const pool = new Pool({ connectionString: migrationDatabaseUrl, max: 1 });

  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [databaseSchema]);

    return result.rows.map((row) => row.table_name);
  } finally {
    await pool.end();
  }
}

function getMigrationNames() {
  return fs
    .readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  const tableNames = await listSchemaTables();
  const applicationTables = tableNames.filter((tableName) => tableName !== '_prisma_migrations');
  const hasMigrationTable = tableNames.includes('_prisma_migrations');

  if (applicationTables.length > 0) {
    console.log(`Database already has ${applicationTables.length} application table(s). Running Prisma migrate deploy.`);
    runPrisma(['migrate', 'deploy']);
    return;
  }

  if (hasMigrationTable) {
    console.error('Refusing to continue: _prisma_migrations exists, but no application tables were found.');
    console.error('Inspect the database manually before running production bootstrap or migrations.');
    process.exit(1);
  }

  if (process.env.ALLOW_EMPTY_DATABASE_BOOTSTRAP !== 'true') {
    console.error('Database appears empty. Refusing to create the production schema without ALLOW_EMPTY_DATABASE_BOOTSTRAP=true.');
    console.error('Set that flag only for the first deployment to a new empty production/staging database.');
    process.exit(1);
  }

  const migrationNames = getMigrationNames();

  console.log(`Schema "${databaseSchema}" is empty. Creating the current Prisma schema, then marking historical migrations as applied.`);
  runPrisma(['db', 'push']);

  for (const migrationName of migrationNames) {
    runPrisma(['migrate', 'resolve', '--applied', migrationName]);
  }

  runPrisma(['migrate', 'deploy']);
  console.log(`Production database bootstrap complete. Marked ${migrationNames.length} historical migration(s) as applied.`);
}

main().catch((error) => {
  console.error('Production database bootstrap failed:', error);
  process.exit(1);
});
