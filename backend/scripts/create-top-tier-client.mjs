/**
 * create-top-tier-client.mjs
 *
 * Provisions a client-portal account on the top service tier
 * (Premium Managed Growth System) with a ready-to-use password.
 *
 * Usage (from the backend/ directory, after `npm install`):
 *
 *   CLIENT_PASSWORD='<password>' node scripts/create-top-tier-client.mjs
 *
 * Required environment variables:
 *   DATABASE_URL       – PostgreSQL connection string (or DIRECT_DATABASE_URL)
 *   CLIENT_PASSWORD    – Password to set on the account (never hardcode one here)
 *
 * Optional environment variables:
 *   CLIENT_EMAIL       – Account email            (default: bryongregory@gmail.com)
 *   CLIENT_NAME        – Display name             (default: derived from email)
 *   ORG_NAME           – Client organization name (default: display name)
 *   TIER_NAME          – Service tier to bind     (default: Premium Managed Growth System)
 *   MEMBERSHIP_ROLE    – client_owner | client_admin | client_member | client
 *                        (default: client_owner)
 *   FORCE_PASSWORD     – Set "true" to overwrite the password of an account
 *                        that already has one. Refused otherwise.
 *
 * The script is idempotent:
 *   1. Upserts the target service tier from the canonical presets.
 *   2. Upserts the client organization and binds it to that tier.
 *   3. Upserts the user (bcrypt password, approved, active).
 *   4. Ensures the global "client" role and the organization membership.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '..');

for (const envFile of ['.env.production', '.env']) {
  const envPath = path.join(backendRoot, envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
const connectionString = (
  process.env.DIRECT_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();

const email = (process.env.CLIENT_EMAIL || 'bryongregory@gmail.com').trim().toLowerCase();
const password = process.env.CLIENT_PASSWORD || '';
const tierName = (process.env.TIER_NAME || 'Premium Managed Growth System').trim();
const membershipRole = (process.env.MEMBERSHIP_ROLE || 'client_owner').trim();
const forcePassword = process.env.FORCE_PASSWORD === 'true';

const VALID_MEMBERSHIP_ROLES = new Set(['client_owner', 'client_admin', 'client_member', 'client']);

// Mirrors CLIENT_SERVICE_TIER_PRESETS in src/clients/client-service-tier-presets.ts
const TIER_PRESETS = new Map([
  ['Premium Managed Growth System', { description: 'Starts at $9,997. Expected to include manager support funded by subscription and custom systems as approved.', monthlyPrice: 9997, priorityRank: 50 }],
  ['Managed Growth Website System', { description: 'Advanced site plus automations, reporting, workflow support, and part-time manager inclusion.', monthlyPrice: 4997, priorityRank: 40 }],
  ['Conversion and Local Growth System', { description: 'More pages, local SEO structure, analytics setup, stronger content, and better funnel path.', monthlyPrice: 2997, priorityRank: 30 }],
  ['Growth Business Website', { description: 'Stronger site structure, lead capture, review proof, and conversion-focused sections.', monthlyPrice: 997, priorityRank: 20 }],
  ['Standard Business Website', { description: 'Final site included; starter package for simple business presence.', monthlyPrice: 497, priorityRank: 10 }],
]);

if (!connectionString) {
  console.error('ERROR: DATABASE_URL (or DIRECT_DATABASE_URL) is required.');
  process.exit(1);
}
if (!email || !/.+@.+\..+/.test(email)) {
  console.error('ERROR: CLIENT_EMAIL must be a valid email address.');
  process.exit(1);
}
if (!password) {
  console.error('ERROR: CLIENT_PASSWORD is required.');
  console.error("  Example: CLIENT_PASSWORD='s3cret' node scripts/create-top-tier-client.mjs");
  process.exit(1);
}
if (!VALID_MEMBERSHIP_ROLES.has(membershipRole)) {
  console.error(`ERROR: MEMBERSHIP_ROLE must be one of: ${[...VALID_MEMBERSHIP_ROLES].join(', ')}`);
  process.exit(1);
}
if (!TIER_PRESETS.has(tierName)) {
  console.error(`ERROR: TIER_NAME must be one of: ${[...TIER_PRESETS.keys()].join(', ')}`);
  process.exit(1);
}

const displayName =
  (process.env.CLIENT_NAME || '').trim() ||
  email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

const orgName = (process.env.ORG_NAME || '').trim() || displayName;
const orgSlug = orgName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function generateId() {
  // cuid-style prefix + random hex (matches setup-ceo.mjs bootstrap convention)
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
  console.log('  Deskii — Top-Tier Client Provisioning');
  console.log('══════════════════════════════════════════════');
  console.log('');

  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  console.log(`Database    : ${maskedUrl}`);
  console.log(`Email       : ${email}`);
  console.log(`Name        : ${displayName}`);
  console.log(`Organization: ${orgName} (${orgSlug})`);
  console.log(`Tier        : ${tierName}`);
  console.log(`Membership  : ${membershipRole}`);
  console.log('');

  const pool = new Pool({ connectionString, max: 1 });

  try {
    // ------------------------------------------------------------------
    // 1. Upsert the service tier
    // ------------------------------------------------------------------
    console.log('Step 1/4 — Ensuring service tier…');
    const preset = TIER_PRESETS.get(tierName);

    let tierId;
    const existingTier = await pool.query(
      'SELECT id FROM "ClientServiceTier" WHERE name = $1',
      [tierName],
    );
    if (existingTier.rows.length > 0) {
      tierId = existingTier.rows[0].id;
      await pool.query(
        `UPDATE "ClientServiceTier"
         SET description = $1, "monthlyPrice" = $2, "priorityRank" = $3, "updatedAt" = $4
         WHERE id = $5`,
        [preset.description, preset.monthlyPrice, preset.priorityRank, now(), tierId],
      );
      console.log(`  ✓ Tier exists: ${tierName}`);
    } else {
      tierId = generateId();
      await pool.query(
        `INSERT INTO "ClientServiceTier" (id, name, description, "monthlyPrice", "priorityRank", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tierId, tierName, preset.description, preset.monthlyPrice, preset.priorityRank, now(), now()],
      );
      console.log(`  + Created tier: ${tierName}`);
    }

    // ------------------------------------------------------------------
    // 2. Upsert the client organization bound to the tier
    // ------------------------------------------------------------------
    console.log('Step 2/4 — Ensuring client organization…');

    let orgId;
    const existingOrg = await pool.query(
      'SELECT id FROM "ClientOrganization" WHERE slug = $1',
      [orgSlug],
    );
    if (existingOrg.rows.length > 0) {
      orgId = existingOrg.rows[0].id;
      await pool.query(
        `UPDATE "ClientOrganization"
         SET "tierId" = $1, status = 'active', "updatedAt" = $2
         WHERE id = $3`,
        [tierId, now(), orgId],
      );
      console.log(`  ✓ Organization exists, tier bound: ${orgName}`);
    } else {
      orgId = generateId();
      await pool.query(
        `INSERT INTO "ClientOrganization" (id, name, slug, status, "tierId", "gemfieldCaseIds", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'active', $4, '{}', $5, $6)`,
        [orgId, orgName, orgSlug, tierId, now(), now()],
      );
      console.log(`  + Created organization: ${orgName}`);
    }

    // ------------------------------------------------------------------
    // 3. Upsert the user with a bcrypt password
    // ------------------------------------------------------------------
    console.log('Step 3/4 — Provisioning user account…');

    const passwordHash = await bcrypt.hash(password, 10);

    let userId;
    const existingUser = await pool.query(
      'SELECT id, password FROM "User" WHERE email = $1',
      [email],
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      const hasPassword = Boolean(existingUser.rows[0].password);

      if (hasPassword && !forcePassword) {
        console.error('');
        console.error('STOPPED: This account already has a password set.');
        console.error('  Re-run with FORCE_PASSWORD=true to overwrite it, or leave it as is.');
        process.exit(1);
      }

      await pool.query(
        `UPDATE "User"
         SET name = COALESCE(name, $1), password = $2, status = 'active',
             "isApproved" = true, "passwordResetToken" = NULL,
             "passwordResetExpiry" = NULL, "updatedAt" = $3
         WHERE id = $4`,
        [displayName, passwordHash, now(), userId],
      );
      console.log(`  ↺ Updated existing account for ${email}`);
    } else {
      userId = generateId();
      await pool.query(
        `INSERT INTO "User" (id, email, name, password, status, "isApproved", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'active', true, $5, $6)`,
        [userId, email, displayName, passwordHash, now(), now()],
      );
      console.log(`  + Created user: ${email}`);
    }

    // ------------------------------------------------------------------
    // 4. Ensure global client role + organization membership
    // ------------------------------------------------------------------
    console.log('Step 4/4 — Binding client role and membership…');

    const existingRole = await pool.query(
      `SELECT id FROM "UserRole"
       WHERE "userId" = $1 AND role = 'client' AND "departmentId" IS NULL`,
      [userId],
    );
    if (existingRole.rows.length === 0) {
      await pool.query(
        `INSERT INTO "UserRole" (id, "userId", role, "createdAt")
         VALUES ($1, $2, 'client', $3)`,
        [generateId(), userId, now()],
      );
      console.log('  + Assigned global role: client');
    } else {
      console.log('  ✓ Global client role already assigned');
    }

    const existingMembership = await pool.query(
      `SELECT id FROM "ClientMembership"
       WHERE "organizationId" = $1 AND "userId" = $2`,
      [orgId, userId],
    );
    if (existingMembership.rows.length > 0) {
      await pool.query(
        `UPDATE "ClientMembership"
         SET role = $1, status = 'active', "updatedAt" = $2
         WHERE id = $3`,
        [membershipRole, now(), existingMembership.rows[0].id],
      );
      console.log(`  ✓ Membership updated: ${membershipRole}`);
    } else {
      await pool.query(
        `INSERT INTO "ClientMembership" (id, "organizationId", "userId", role, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
        [generateId(), orgId, userId, membershipRole, now(), now()],
      );
      console.log(`  + Membership created: ${membershipRole}`);
    }

    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  ✓ Top-tier client account ready!');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`  Email : ${email}`);
    console.log(`  Org   : ${orgName} — ${tierName}`);
    console.log('  The client can sign in with the password you provided.');
    console.log('');
    console.log('  SECURITY: Ask the client to change this password after first');
    console.log('            login, or use the invite flow (setup link) instead.');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('');
  console.error('Client provisioning failed:', error.message || error);
  process.exit(1);
});
