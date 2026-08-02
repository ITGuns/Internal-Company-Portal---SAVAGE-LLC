// A client-invite setup token is a full credential: POST /auth/reset-password
// accepts it on (email, tokenHash) with no role check, so whoever holds one can
// set that account's password. It is safe only while it goes nowhere but the
// address owner's inbox.
//
// The Gemfield intake webhook broke that assumption - it returns the token to
// its caller instead of mailing it. A token is minted whenever the account has
// no local password, which is true of every Google/Discord OAuth user, admins
// included, so naming an existing admin's address would have handed the caller
// working credentials for it.
//
// These tests pin the two rules that close it: under restrictToNewUsers an
// existing account is never touched, and userCreated is the only thing a caller
// may gate disclosure on.

import assert from 'node:assert/strict'
import { ClientsService } from '../src/clients/clients.service'
import { ClientValidationError } from '../src/clients/clients.validation'
import { emailService } from '../src/email/email.service'

type UserRow = {
  id: string
  email: string
  name: string | null
  password: string | null
  roles: Array<{ role: string }>
}

type Writes = {
  userUpdates: Array<Record<string, unknown>>
  userCreates: Array<Record<string, unknown>>
  membershipUpserts: number
}

function buildService(existingUser: UserRow | null) {
  const writes: Writes = { userUpdates: [], userCreates: [], membershipUpserts: 0 }

  const tx = {
    user: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        writes.userUpdates.push(data)
        return { ...existingUser, ...data }
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        writes.userCreates.push(data)
        return { id: 'new-user-id', ...data }
      },
    },
    userRole: {
      findFirst: async () => null,
      create: async () => ({ id: 'role-id' }),
    },
    clientMembership: {
      upsert: async () => {
        writes.membershipUpserts += 1
        return { id: 'membership-id', user: { id: 'u', email: 'e', name: 'n', avatar: null } }
      },
    },
  }

  const db = {
    clientOrganization: {
      findUnique: async () => ({ id: 'org-1', name: 'Northside Plumbing' }),
    },
    user: {
      findUnique: async () => existingUser,
    },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  }

  const service = new ClientsService()
  ;(service as any).prisma = db
  return { service, writes }
}

const INVITE = { email: 'admin@company.com', name: 'Admin', role: 'client', status: 'active' }

/** The attack: an existing OAuth admin has no password, so a token would be minted. */
async function testExistingAccountIsNeverDisclosed(): Promise<void> {
  const oauthAdmin: UserRow = {
    id: 'admin-id',
    email: 'admin@company.com',
    name: 'Admin',
    password: null, // signs in with Google - no local password
    roles: [{ role: 'client' }],
  }
  const { service, writes } = buildService(oauthAdmin)

  const result = await service.inviteClientUser('org-1', INVITE, {
    sendEmail: false,
    restrictToNewUsers: true,
  })

  assert.equal(result.invite.userCreated, false, 'an existing account is not reported as created')
  assert.equal(result.invite.setupUrl, undefined, 'no setup link is produced for an existing account')
  assert.equal(result.invite.setupRequired, false, 'no setup is claimed for an existing account')

  // The account itself must come through completely untouched.
  const written = Object.assign({}, ...writes.userUpdates) as Record<string, unknown>
  assert.equal(
    Object.prototype.hasOwnProperty.call(written, 'passwordResetToken'),
    false,
    'the existing reset token is not overwritten',
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(written, 'isApproved'),
    false,
    'approval is not flipped on an account the caller does not own',
  )
  assert.equal(
    Object.prototype.hasOwnProperty.call(written, 'status'),
    false,
    'a deactivated account is not reactivated',
  )
  assert.equal(writes.membershipUpserts, 1, 'the organization membership is still added')
}

/** A staff address is refused outright rather than quietly joined to a client org. */
async function testStaffAccountIsRefused(): Promise<void> {
  const staff: UserRow = {
    id: 'staff-id',
    email: 'admin@company.com',
    name: 'Admin',
    password: null,
    roles: [{ role: 'admin' }],
  }
  const { service, writes } = buildService(staff)

  await assert.rejects(
    () => service.inviteClientUser('org-1', INVITE, { sendEmail: false, restrictToNewUsers: true }),
    ClientValidationError,
    'a staff address is rejected',
  )
  assert.equal(writes.userUpdates.length, 0, 'nothing is written before the refusal')
  assert.equal(writes.membershipUpserts, 0, 'no membership is created for a staff address')
}

/** The legitimate case still works: a brand-new account does get its setup link. */
async function testNewAccountStillGetsALink(): Promise<void> {
  const { service, writes } = buildService(null)

  const result = await service.inviteClientUser('org-1', INVITE, {
    sendEmail: false,
    restrictToNewUsers: true,
  })

  assert.equal(result.invite.userCreated, true, 'a fresh account is reported as created')
  assert.equal(result.invite.setupRequired, true, 'a fresh account needs setup')
  assert.match(String(result.invite.setupUrl), /\/reset-password\?token=/, 'a setup link is issued')
  assert.match(String(result.invite.setupUrl), /setup=1/, 'the link opts into first-time-setup wording')
  assert.equal(writes.userCreates.length, 1, 'the account is created')
}

/** Staff-issued invites are unchanged: no flag, so the pre-existing path still applies. */
async function testStaffInvitePathUnchanged(): Promise<void> {
  const dormant: UserRow = {
    id: 'client-id',
    email: 'admin@company.com',
    name: 'Client',
    password: null,
    roles: [{ role: 'client' }],
  }
  const { service, writes } = buildService(dormant)

  const result = await service.inviteClientUser('org-1', INVITE, { sendEmail: false })

  assert.equal(result.invite.setupRequired, true, 'staff invites still mint a token for a passwordless user')
  const written = Object.assign({}, ...writes.userUpdates) as Record<string, unknown>
  assert.ok(written.passwordResetToken, 'staff invites still set the reset token')
  assert.equal(written.isApproved, true, 'staff invites still approve the user')
}

async function run(): Promise<void> {
  // No test here should send mail; fail loudly rather than silently if one tries.
  ;(emailService as any).sendTemplateEmail = async () => {
    throw new Error('no test in this file should send email')
  }

  await testExistingAccountIsNeverDisclosed()
  await testStaffAccountIsRefused()
  await testNewAccountStillGetsALink()
  await testStaffInvitePathUnchanged()
}

run()
  .then(() => console.log('clients.invite-token-disclosure tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
