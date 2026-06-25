/**
 * setup-ceo.mjs
 *
 * Production-safe bootstrap script for the first Owner / Founder account.
 *
 * Run AFTER `prisma:bootstrap` and BEFORE handing the portal URL to the CEO.
 *
 * Usage (from the backend/ directory):
 *
 *   node scripts/setup-ceo.mjs
 *
 * Required environment variables:
 *   DATABASE_URL          – PostgreSQL connection string
 *   FRONTEND_URL          – App URL for the generated setup link (default: http://localhost:3000)
 *   CEO_EMAIL             – Email address for the first Owner / Founder account
 *
 * Optional environment variables:
 *   CEO_NAME              – Display name (default: derived from email)
 *   DIRECT_DATABASE_URL   – Prisma migration connection (falls back to DATABASE_URL)
 *   ALLOW_EXISTING_CEO    – Set "true" to regenerate a setup link for a CEO email
 *                           that exists in the database but has no password yet
 *                           (e.g. script ran but CEO never opened the link).
 *                           Has no effect if the account already has a password —
 *                           use the /forgot-password flow in that case.
 *
 * The script:
 *   1. Seeds departments and available roles from the canonical org chart.
 *   2. Seeds default client service tiers.
 *   3. Creates (or refreshes) the CEO user as an approved Owner / Founder.
 *   4. Prints a one-time setup link the CEO opens to set their password.
 *
 * Security notes:
 *   - No password is written to the database by this script.
 *   - The setup token expires in 7 days.
 *   - Run this script only once per deployment, then delete the CEO_EMAIL env var
 *     from your CI/CD secrets after setup is confirmed complete.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '..');

// ---------------------------------------------------------------------------
// Load .env files (production first, then .env fallback)
// ---------------------------------------------------------------------------
for (const envFile of ['.env.production', '.env']) {
  const envPath = path.join(backendRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

// ---------------------------------------------------------------------------
// Validate required inputs
// ---------------------------------------------------------------------------
const connectionString = (
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const ceoEmail = (process.env.CEO_EMAIL || '').trim().toLowerCase();
const ceoName = (process.env.CEO_NAME || '').trim();
const allowExisting = process.env.ALLOW_EXISTING_CEO === 'true';

if (!connectionString) {
  console.error('ERROR: DATABASE_URL (or DIRECT_DATABASE_URL) is required.');
  process.exit(1);
}

if (!ceoEmail || !/.+@.+\..+/.test(ceoEmail)) {
  console.error('ERROR: CEO_EMAIL must be set to a valid email address.');
  console.error('  Example: CEO_EMAIL=mina@savage-llc.com node scripts/setup-ceo.mjs');
  process.exit(1);
}

// Derive a sensible display name if none is provided
const displayName =
  ceoName ||
  ceoEmail
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

// ---------------------------------------------------------------------------
// Org chart constants (mirrors src/org/org-access-policy.ts)
// Keep in sync with ORG_DEPARTMENT_ROLE_CATALOG
// ---------------------------------------------------------------------------
const ORG_CATALOG = [
  { department: 'Owners / Founders', roles: ['Owner / Founder'] },
  { department: 'Project Management', roles: ['Project Manager'] },
  {
    department: 'Operations',
    roles: [
      'Operations Manager',
      'Fulfillment / Logistics VA',
      'Inventory VA',
      'Customer Experience (CX) VA',
    ],
  },
  {
    department: 'Digital Marketing',
    roles: [
      'Digital Marketing Lead / Marketing VA',
      'Media Buyer / Ads Specialist',
      'Content Creator / Designer',
      'Email & SMS Marketer',
      'Influencer / Social Media VA',
    ],
  },
  { department: 'Analytics / Data', roles: ['Analytics / Data VA'] },
  { department: 'Automation / Tech', roles: ['Automation / Tech VA'] },
  {
    department: 'Website Developers',
    roles: ['Frontend Developer', 'Backend / Technical Developer'],
  },
  {
    department: 'Payroll / Finance',
    roles: ['Bookkeeping', 'Contractor & Salary Payments'],
  },
];

const CEO_DEPARTMENT = 'Owners / Founders';
const CEO_ROLE = 'Owner / Founder';

// ---------------------------------------------------------------------------
// Token config
// ---------------------------------------------------------------------------
const SETUP_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeRoleName(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function generateId() {
  // cuid-style prefix + random hex  (Prisma @default(cuid()) compatible enough for bootstrap)
  return 'c' + crypto.randomBytes(11).toString('hex');
}

function now() {
  return new Date();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log('  Deskii — CEO / Owner Onboarding Bootstrap  ');
  console.log('══════════════════════════════════════════════');
  console.log('');

  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log(`Database : ${maskedUrl}`);
  console.log(`Frontend : ${frontendUrl}`);
  console.log(`CEO email: ${ceoEmail}`);
  console.log(`CEO name : ${displayName}`);
  console.log('');

  const pool = new Pool({ connectionString, max: 1 });

  try {
    // ------------------------------------------------------------------
    // 1. Seed departments
    // ------------------------------------------------------------------
    console.log('Step 1/4 — Seeding org departments…');
    const departmentIds = new Map(); // name → id

    for (const entry of ORG_CATALOG) {
      const existing = await pool.query(
        'SELECT id FROM "Department" WHERE name = $1',
        [entry.department],
      );

      let deptId;
      if (existing.rows.length > 0) {
        deptId = existing.rows[0].id;
      } else {
        deptId = generateId();
        await pool.query(
          `INSERT INTO "Department" (id, name, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4)`,
          [deptId, entry.department, now(), now()],
        );
        console.log(`  + Department: ${entry.department}`);
      }
      departmentIds.set(entry.department, deptId);
    }

    // ------------------------------------------------------------------
    // 2. Seed available roles
    // ------------------------------------------------------------------
    console.log('Step 2/4 — Seeding org roles…');

    for (const entry of ORG_CATALOG) {
      const deptId = departmentIds.get(entry.department);
      for (const roleName of entry.roles) {
        const existing = await pool.query(
          'SELECT id FROM "AvailableRole" WHERE name = $1 AND "departmentId" = $2',
          [roleName, deptId],
        );
        if (existing.rows.length === 0) {
          const roleId = generateId();
          await pool.query(
            `INSERT INTO "AvailableRole" (id, name, "departmentId", "createdAt")
             VALUES ($1, $2, $3, $4)`,
            [roleId, roleName, deptId, now()],
          );
          console.log(`  + Role: ${roleName} (${entry.department})`);
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. Seed default client service tiers (idempotent)
    // ------------------------------------------------------------------
    console.log('Step 3/4 — Seeding default client service tiers…');
    const SERVICE_TIERS = [
      { name: 'Standard Business Website', priorityRank: 10 },
      { name: 'Growth Business Website', priorityRank: 20 },
      { name: 'Conversion and Local Growth System', priorityRank: 30 },
      { name: 'Managed Growth Website System', priorityRank: 40 },
      { name: 'Premium Managed Growth System', priorityRank: 50 },
    ];

    for (const tier of SERVICE_TIERS) {
      const existing = await pool.query(
        'SELECT id FROM "ClientServiceTier" WHERE name = $1',
        [tier.name],
      );
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO "ClientServiceTier" (id, name, "priorityRank", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5)`,
          [generateId(), tier.name, tier.priorityRank, now(), now()],
        );
        console.log(`  + Service tier: ${tier.name}`);
      }
    }

    // ------------------------------------------------------------------
    // 4. Create / refresh CEO user
    // ------------------------------------------------------------------
    console.log('Step 4/4 — Provisioning CEO account…');

    const existingUser = await pool.query(
      'SELECT id, password FROM "User" WHERE email = $1',
      [ceoEmail],
    );

    if (existingUser.rows.length > 0 && existingUser.rows[0].password) {
      if (!allowExisting) {
        console.error('');
        console.error('STOPPED: A user with this email already has a password set.');
        console.error('  If the CEO has already set their password, use the /forgot-password flow instead.');
        console.error('  ALLOW_EXISTING_CEO=true only works for accounts with no password yet.');
        process.exit(1);
      } else {
        // ALLOW_EXISTING_CEO=true but user already has a password — still refuse
        console.error('');
        console.error('STOPPED: A user with this email already has a password set.');
        console.error('  ALLOW_EXISTING_CEO=true cannot override an account that is already fully set up.');
        console.error('  Use the /forgot-password flow to send a password-reset link instead.');
        process.exit(1);
      }
    }

    // Generate one-time setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(setupToken).digest('hex');
    const expiresAt = new Date(Date.now() + SETUP_TOKEN_EXPIRY_MS);
    const setupUrl = `${frontendUrl}/reset-password?token=${setupToken}&email=${encodeURIComponent(ceoEmail)}`;

    let userId;

    if (existingUser.rows.length > 0) {
      // Refresh existing (passwordless) user
      userId = existingUser.rows[0].id;
      await pool.query(
        `UPDATE "User"
         SET status = 'verified', "isApproved" = true,
             "passwordResetToken" = $1, "passwordResetExpiry" = $2, "updatedAt" = $3
         WHERE id = $4`,
        [hashedToken, expiresAt, now(), userId],
      );
      console.log(`  ↺ Refreshed existing account for ${ceoEmail}`);
    } else {
      // Create brand-new CEO user
      userId = generateId();
      await pool.query(
        `INSERT INTO "User" (id, email, name, status, "isApproved",
                             "passwordResetToken", "passwordResetExpiry",
                             "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'verified', true, $4, $5, $6, $7)`,
        [userId, ceoEmail, displayName, hashedToken, expiresAt, now(), now()],
      );
      console.log(`  + Created user: ${ceoEmail}`);
    }

    // Upsert employee profile
    const existingProfile = await pool.query(
      'SELECT id FROM "EmployeeProfile" WHERE "userId" = $1',
      [userId],
    );
    if (existingProfile.rows.length > 0) {
      await pool.query(
        `UPDATE "EmployeeProfile"
         SET "jobTitle" = $1, "requestedRole" = $2, "updatedAt" = $3
         WHERE "userId" = $4`,
        [CEO_ROLE, CEO_ROLE, now(), userId],
      );
    } else {
      await pool.query(
        `INSERT INTO "EmployeeProfile" (id, "userId", "jobTitle", "requestedRole",
                                        "requestedDepartmentId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          generateId(),
          userId,
          CEO_ROLE,
          CEO_ROLE,
          departmentIds.get(CEO_DEPARTMENT),
          now(),
          now(),
        ],
      );
    }

    // Assign Owner / Founder role if not already present
    const ownersDeptId = departmentIds.get(CEO_DEPARTMENT);
    const normalizedCeoRole = normalizeRoleName(CEO_ROLE);

    const existingRole = await pool.query(
      `SELECT id FROM "UserRole"
       WHERE "userId" = $1 AND role = $2 AND "departmentId" = $3`,
      [userId, normalizedCeoRole, ownersDeptId],
    );

    if (existingRole.rows.length === 0) {
      await pool.query(
        `INSERT INTO "UserRole" (id, "userId", role, "departmentId", "createdAt")
         VALUES ($1, $2, $3, $4, $5)`,
        [generateId(), userId, normalizedCeoRole, ownersDeptId, now()],
      );
      console.log(`  + Assigned role: ${CEO_ROLE} (${CEO_DEPARTMENT})`);
    } else {
      console.log(`  ✓ Role already assigned: ${CEO_ROLE}`);
    }

    // ------------------------------------------------------------------
    // Done — print setup link
    // ------------------------------------------------------------------
    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  ✓ CEO onboarding complete!');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  Send this one-time setup link to the CEO:');
    console.log('');
    console.log(`  ${setupUrl}`);
    console.log('');
    console.log(`  Link expires: ${expiresAt.toUTCString()}`);
    console.log('');
    console.log('  The CEO opens the link, sets a password, and signs in.');
    console.log('  After setup, they can use /operations/onboarding to invite');
    console.log('  the rest of the team.');
    console.log('');
    console.log('  SECURITY: Do not log or share this URL beyond the CEO.');
    console.log('            Remove CEO_EMAIL from your env/secrets after use.');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('');
  console.error('CEO setup failed:', error.message || error);
  process.exit(1);
});
