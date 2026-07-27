import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { normalizeOrgRoleName } from '../src/org/org-access-policy'

// Gemfield Bridge mock-mode seed (idempotent). Stands up exactly what the #W walkthrough needs:
//   - one Gemfield-entitled org with a project mid-`build` + a milestone timeline
//   - fixture tickets across every pipeline status (incl. dev_assist + callback, internal/client notes)
//   - one plain (non-entitled) org, to prove the module is absent there
//   - a gemfield-dev staff user + a client user for each org
// Safe to re-run: everything upserts on a stable key. Run AFTER `prisma:seed` (needs departments).

const connectionString = (process.env.DATABASE_URL || '').trim()
const seedPassword = (process.env.SEED_DEFAULT_PASSWORD || '').trim()

if (!connectionString || connectionString.length < 10) {
  console.error('Error: DATABASE_URL is not defined or too short.')
  process.exit(1)
}
if (!seedPassword || seedPassword.length < 12) {
  console.error('Error: SEED_DEFAULT_PASSWORD must be a local-only password with at least 12 characters.')
  process.exit(1)
}

function isLocalDatabaseUrl(url: string): boolean {
  return /\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::|\/)/i.test(url)
}

// Guardrail: this inserts FAKE orgs + tickets. Never let it hit a deployed/production database
// (e.g. Supabase) by accident. For a deployed DB, enable Gemfield on a real/test org via the admin
// instead. Override only for a dedicated staging/branch DB with ALLOW_GEMFIELD_SEED_NONLOCAL=true.
if (!isLocalDatabaseUrl(connectionString) && process.env.ALLOW_GEMFIELD_SEED_NONLOCAL !== 'true') {
  console.error('Refusing to run the mock-mode Gemfield seed against a non-local database.')
  console.error('It inserts fake "Acme Roofing" data. On a deployed DB, enable Gemfield on a real/test org instead.')
  console.error('To force (staging/branch DB only): set ALLOW_GEMFIELD_SEED_NONLOCAL=true.')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash(seedPassword, 10)

  // --- staff: gemfield-dev (for the P4 control panel) ---
  const devDepartment = await prisma.department.upsert({
    where: { name: 'Website Developers' },
    update: {},
    create: { name: 'Website Developers' },
  })
  const gemfieldDev = await prisma.user.upsert({
    where: { email: 'gemfield.dev@example.test' },
    update: { name: 'Demo Gemfield Developer', status: 'active', isApproved: true, password: passwordHash },
    create: {
      email: 'gemfield.dev@example.test',
      name: 'Demo Gemfield Developer',
      password: passwordHash,
      status: 'active',
      isApproved: true,
    },
  })
  await prisma.userRole.upsert({
    where: {
      userId_departmentId_role: {
        userId: gemfieldDev.id,
        departmentId: devDepartment.id,
        role: normalizeOrgRoleName('Gemfield Developer'),
      },
    },
    update: {},
    create: { userId: gemfieldDev.id, departmentId: devDepartment.id, role: normalizeOrgRoleName('Gemfield Developer') },
  })

  // --- client users ---
  const gemfieldClientUser = await prisma.user.upsert({
    where: { email: 'client.gemfield@example.test' },
    update: { name: 'Acme Roofing (Client)', status: 'active', isApproved: true, password: passwordHash },
    create: {
      email: 'client.gemfield@example.test',
      name: 'Acme Roofing (Client)',
      password: passwordHash,
      status: 'active',
      isApproved: true,
    },
  })
  const plainClientUser = await prisma.user.upsert({
    where: { email: 'client.plain@example.test' },
    update: { name: 'Plain Co (Client)', status: 'active', isApproved: true, password: passwordHash },
    create: {
      email: 'client.plain@example.test',
      name: 'Plain Co (Client)',
      password: passwordHash,
      status: 'active',
      isApproved: true,
    },
  })

  // --- organizations ---
  const gemfieldOrg = await prisma.clientOrganization.upsert({
    where: { slug: 'acme-roofing' },
    update: { gemfieldClient: true, gemfieldCaseIds: ['GF-2026-0147'], status: 'active' },
    create: {
      name: 'Acme Roofing Co',
      slug: 'acme-roofing',
      status: 'active',
      websiteUrl: 'https://acme-roofing.example.com',
      gemfieldClient: true,
      gemfieldCaseIds: ['GF-2026-0147'],
    },
  })
  const plainOrg = await prisma.clientOrganization.upsert({
    where: { slug: 'plain-co' },
    update: { gemfieldClient: false, status: 'active' },
    create: {
      name: 'Plain Co',
      slug: 'plain-co',
      status: 'active',
      websiteUrl: 'https://plain-co.example.com',
      gemfieldClient: false,
    },
  })

  // --- memberships ---
  await prisma.clientMembership.upsert({
    where: { organizationId_userId: { organizationId: gemfieldOrg.id, userId: gemfieldClientUser.id } },
    update: { role: 'client_owner', status: 'active' },
    create: { organizationId: gemfieldOrg.id, userId: gemfieldClientUser.id, role: 'client_owner', status: 'active' },
  })
  await prisma.clientMembership.upsert({
    where: { organizationId_userId: { organizationId: plainOrg.id, userId: plainClientUser.id } },
    update: { role: 'client_owner', status: 'active' },
    create: { organizationId: plainOrg.id, userId: plainClientUser.id, role: 'client_owner', status: 'active' },
  })

  // --- Gemfield project mid-build + milestone timeline ---
  const projectId = 'seed-gemfield-project-acme'
  await prisma.clientProject.upsert({
    where: { id: projectId },
    update: {
      gfId: 'GF-2026-0147',
      gemfieldPhase: 'build',
      status: 'in_progress',
      progress: 55,
      stagingUrl: 'https://staging.acme-roofing.example.com',
    },
    create: {
      id: projectId,
      organizationId: gemfieldOrg.id,
      name: 'Acme Roofing Website',
      status: 'in_progress',
      summary: 'New marketing site with online quote requests.',
      progress: 55,
      gfId: 'GF-2026-0147',
      gemfieldPhase: 'build',
      stagingUrl: 'https://staging.acme-roofing.example.com',
    },
  })

  const milestones: Array<{ phase: string; status: string; note: string | null }> = [
    { phase: 'intake_received', status: 'complete', note: 'Thanks for your details!' },
    { phase: 'research', status: 'complete', note: null },
    { phase: 'blueprint', status: 'complete', note: 'Site plan approved.' },
    { phase: 'design', status: 'complete', note: null },
    { phase: 'build', status: 'in_progress', note: 'Building your pages now.' },
  ]
  for (const milestone of milestones) {
    await prisma.gemfieldMilestone.upsert({
      where: { projectId_phase: { projectId, phase: milestone.phase } },
      update: { status: milestone.status, note: milestone.note },
      create: { projectId, phase: milestone.phase, status: milestone.status, note: milestone.note },
    })
  }

  // --- fixture tickets across every pipeline status ---
  const tickets: Array<{
    id: string
    title: string
    status: string
    priority: string
    category: string
    ticketKind: string
    description: string
  }> = [
    { id: 'seed-gf-tk-new', title: 'Update our phone number', status: 'new', priority: 'normal', category: 'website_change', ticketKind: 'standard', description: 'Please change the number in the header.' },
    { id: 'seed-gf-tk-triaged', title: 'Contact form not sending', status: 'triaged', priority: 'high', category: 'broken', ticketKind: 'standard', description: 'The form on the contact page does nothing.' },
    { id: 'seed-gf-tk-progress', title: 'Add a testimonials section', status: 'in_progress', priority: 'normal', category: 'website_change', ticketKind: 'standard', description: 'We have 3 reviews to feature.' },
    { id: 'seed-gf-tk-waiting', title: 'New gallery photos', status: 'waiting_on_client', priority: 'normal', category: 'website_change', ticketKind: 'standard', description: 'Waiting on the client to send photos.' },
    { id: 'seed-gf-tk-devassist', title: 'Urgent: checkout is broken', status: 'triaged', priority: 'high', category: 'broken', ticketKind: 'dev_assist', description: 'Customers cannot request a quote.' },
    { id: 'seed-gf-tk-callback', title: 'Please call me about my site', status: 'new', priority: 'high', category: 'support', ticketKind: 'callback', description: 'Callback requested. Number: 555-0100 | Preferred time: weekday mornings' },
    { id: 'seed-gf-tk-resolved', title: 'Fix typo on About page', status: 'resolved', priority: 'normal', category: 'website_change', ticketKind: 'standard', description: 'Corrected the spelling.' },
  ]
  for (const ticket of tickets) {
    await prisma.clientTicket.upsert({
      where: { id: ticket.id },
      update: { status: ticket.status, priority: ticket.priority, ticketKind: ticket.ticketKind },
      create: {
        id: ticket.id,
        organizationId: gemfieldOrg.id,
        projectId,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        ticketKind: ticket.ticketKind,
        sourceWizardVersion: 'v2',
        createdById: gemfieldClientUser.id,
      },
    })
  }

  // A client-visible reply and an internal-only note on one ticket (exercises the leak guardrail).
  await prisma.clientTicketComment.upsert({
    where: { id: 'seed-gf-comment-client' },
    update: {},
    create: {
      id: 'seed-gf-comment-client',
      ticketId: 'seed-gf-tk-progress',
      authorId: gemfieldDev.id,
      body: "We're on it - the testimonials section will be ready this week.",
      visibility: 'client',
    },
  })
  await prisma.clientTicketComment.upsert({
    where: { id: 'seed-gf-comment-internal' },
    update: {},
    create: {
      id: 'seed-gf-comment-internal',
      ticketId: 'seed-gf-tk-progress',
      authorId: gemfieldDev.id,
      body: 'INTERNAL: waiting on final copy from the writer before we ship.',
      visibility: 'internal',
    },
  })

  console.log('Gemfield mock-mode seed complete.')
  console.log('  Gemfield client login: client.gemfield@example.test')
  console.log('  Plain client login:    client.plain@example.test')
  console.log('  Gemfield-dev staff:    gemfield.dev@example.test')
  console.log('  (password = SEED_DEFAULT_PASSWORD)')
}

main()
  .catch((error) => {
    console.error('Gemfield seed failed:', error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
