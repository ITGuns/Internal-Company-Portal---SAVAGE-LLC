import assert from 'node:assert/strict'
import type { NextFunction, Request, Response } from 'express'
import {
  canAccessGemfieldOrg,
  filterAccessibleGemfieldOrgIds,
  isValidGfId,
  requireGemfieldClient,
  type GemfieldEntitledOrganization,
} from '../src/clients/gemfield/gemfield.access'
import type { ClientAccessContext } from '../src/clients/clients.access'
import { canReadStoredUpload } from '../src/uploads/upload.access'
import {
  GEMFIELD_PHASES,
  isGemfieldPhase,
  isPhaseAtOrAfter,
  isGemfieldMilestoneStatus,
} from '../src/clients/gemfield/gemfield.phases'

// --- personas (the caller side of the matrix) --------------------------------------
const gemfieldMember: ClientAccessContext = {
  requesterId: 'user-gem-client',
  isPrivileged: false,
  memberships: [{ organizationId: 'org-gem', status: 'active' }],
}
const plainClient: ClientAccessContext = {
  requesterId: 'user-plain-client',
  isPrivileged: false,
  memberships: [{ organizationId: 'org-plain', status: 'active' }],
}
const crossOrgClient: ClientAccessContext = {
  requesterId: 'user-other-client',
  isPrivileged: false,
  memberships: [{ organizationId: 'org-other', status: 'active' }],
}
const staff: ClientAccessContext = {
  requesterId: 'user-staff',
  isPrivileged: true,
  memberships: [],
}

// --- organizations (the resource side of the matrix) -------------------------------
const gemOrg: GemfieldEntitledOrganization = { id: 'org-gem', status: 'active', gemfieldClient: true }
const gemOrgArchived: GemfieldEntitledOrganization = { id: 'org-gem', status: 'archived', gemfieldClient: true }
const plainOrg: GemfieldEntitledOrganization = { id: 'org-plain', status: 'active', gemfieldClient: false }

const DENY_BODY = { error: 'Not found' }
const AUTH_BODY = { error: 'Authentication required' }

// ---------------------------------------------------------------------------------
function testGfIdValidation(): void {
  assert.equal(isValidGfId('GF-2026-0147'), true, 'accepts a canonical GF-ID')
  assert.equal(isValidGfId('GF-2026-1'), true, 'accepts a non-padded sequence')
  assert.equal(isValidGfId('  gf-2026-0147  '), true, 'trims and upper-cases before matching')
  assert.equal(isValidGfId('GF-26-0147'), false, 'rejects a 2-digit year')
  assert.equal(isValidGfId('GF-2026-'), false, 'rejects a missing sequence')
  assert.equal(isValidGfId('2026-0147'), false, 'rejects a missing prefix')
  assert.equal(isValidGfId('DROP TABLE'), false, 'rejects junk')
  assert.equal(isValidGfId(null), false, 'rejects non-strings')
}

function testAccessPredicateMatrix(): void {
  // Allow: entitled org + (member of it | privileged staff).
  assert.equal(canAccessGemfieldOrg(gemfieldMember, gemOrg), true, 'entitled member is allowed')
  assert.equal(canAccessGemfieldOrg(staff, gemOrg), true, 'privileged staff is allowed on an entitled org')

  // Deny: not a member of the entitled org.
  assert.equal(canAccessGemfieldOrg(plainClient, gemOrg), false, 'a non-member client is denied')
  assert.equal(canAccessGemfieldOrg(crossOrgClient, gemOrg), false, 'a cross-org client is denied')

  // Deny: org is not entitled - the module is absent even for staff and even for a member.
  assert.equal(canAccessGemfieldOrg(staff, plainOrg), false, 'a non-entitled org is absent to staff')
  assert.equal(canAccessGemfieldOrg(plainClient, plainOrg), false, 'a non-entitled org is absent to its own client')

  // Deny: entitled but the org itself is inactive.
  assert.equal(canAccessGemfieldOrg(gemfieldMember, gemOrgArchived), false, 'an inactive org is denied')

  // Deny: missing access (unauthenticated) or missing org.
  assert.equal(canAccessGemfieldOrg(null, gemOrg), false, 'no access context is denied')
  assert.equal(canAccessGemfieldOrg(gemfieldMember, null), false, 'a missing org is denied')

  // List scoping: only entitled + readable orgs survive.
  assert.deepEqual(
    filterAccessibleGemfieldOrgIds(gemfieldMember, [gemOrg, plainOrg]),
    ['org-gem'],
    'list scoping keeps only entitled orgs the caller can read',
  )
  assert.deepEqual(
    filterAccessibleGemfieldOrgIds(staff, [gemOrg, plainOrg]),
    ['org-gem'],
    'staff list scoping still excludes non-entitled orgs',
  )
}

// Drive the real Express guard with stub deps + mock req/res. Every Gemfield route composes
// this one guard, so this covers the endpoint x persona gate without a live DB.
function makeReqRes(organizationId?: string) {
  const req = { params: organizationId === undefined ? {} : { organizationId } } as unknown as Request
  const captured: { status?: number; body?: unknown; sent: boolean; nexted: boolean } = {
    sent: false,
    nexted: false,
  }
  const res = {
    status(code: number) {
      captured.status = code
      return res
    },
    json(body: unknown) {
      captured.body = body
      captured.sent = true
      return res
    },
  } as unknown as Response
  const next: NextFunction = () => {
    captured.nexted = true
  }
  return { req, res, next, captured }
}

async function runGuard(
  access: ClientAccessContext | null,
  organization: GemfieldEntitledOrganization | null,
  // Omit to derive the id from the org; pass `null` to simulate a request with NO org id;
  // pass a string to force a specific id. (`null` is used instead of `undefined` because a
  // default parameter would swallow an explicit `undefined`.)
  orgIdOverride?: string | null,
) {
  let resolvedId: string | undefined
  if (orgIdOverride === undefined) resolvedId = organization?.id ?? 'org-gem'
  else if (orgIdOverride === null) resolvedId = undefined
  else resolvedId = orgIdOverride

  const guard = requireGemfieldClient({
    resolveAccess: async () => access,
    loadOrganization: async () => organization,
  })
  const { req, res, next, captured } = makeReqRes(resolvedId)
  await guard(req, res, next)
  return captured
}

async function testGuardMatrix(): Promise<void> {
  // Allow -> next() runs, nothing is sent.
  const allowMember = await runGuard(gemfieldMember, gemOrg)
  assert.equal(allowMember.nexted, true, 'entitled member passes the guard')
  assert.equal(allowMember.sent, false, 'guard does not respond on allow')

  const allowStaff = await runGuard(staff, gemOrg)
  assert.equal(allowStaff.nexted, true, 'privileged staff passes the guard')

  // Deny cases -> 404, static body, next() never runs, and ZERO record data leaks.
  const denials: Array<[string, Awaited<ReturnType<typeof runGuard>>]> = [
    ['plain client on entitled org', await runGuard(plainClient, gemOrg)],
    ['cross-org client on entitled org', await runGuard(crossOrgClient, gemOrg)],
    ['staff on non-entitled org', await runGuard(staff, plainOrg)],
    ['member on non-existent org', await runGuard(gemfieldMember, null)],
    ['member with missing org id', await runGuard(gemfieldMember, gemOrg, null)],
  ]
  for (const [label, captured] of denials) {
    assert.equal(captured.status, 404, `${label} -> 404`)
    assert.equal(captured.nexted, false, `${label} -> handler never runs`)
    assert.deepEqual(captured.body, DENY_BODY, `${label} -> static deny body, no data leak`)
    assert.deepEqual(Object.keys(captured.body as object), ['error'], `${label} -> body exposes only 'error'`)
  }

  // A non-entitled org and a non-existent org return byte-identical bodies: no existence disclosure.
  const nonEntitled = await runGuard(staff, plainOrg)
  const nonExistent = await runGuard(staff, null, 'org-does-not-exist')
  assert.deepEqual(nonEntitled.body, nonExistent.body, 'non-entitled and non-existent are indistinguishable')

  // Unauthenticated -> 401, static body.
  const anon = await runGuard(null, gemOrg)
  assert.equal(anon.status, 401, 'unauthenticated -> 401')
  assert.deepEqual(anon.body, AUTH_BODY, 'unauthenticated -> static auth body')
  assert.equal(anon.nexted, false, 'unauthenticated -> handler never runs')
}

// The attachment-URL row of the matrix: org A's ticket attachment is unfetchable by org B
// and by plain Deskii clients; staff and same-org members can read it.
function testAttachmentAccessMatrix(): void {
  const base = {
    requesterId: 'x',
    isClientManager: false,
    clientOrganizationIds: [] as string[],
    canReadInternalDirectory: false,
    canReadAllDepartments: false,
    departments: [] as string[],
  }
  const orgAAttachment = { ownerId: 'staff-uploader', ticketAttachment: { organizationId: 'org-a' } }

  assert.equal(
    canReadStoredUpload({ ...base, requesterId: 'staff-uploader' }, orgAAttachment),
    true,
    'the uploader can read the attachment',
  )
  assert.equal(
    canReadStoredUpload({ ...base, requesterId: 'member-a', clientOrganizationIds: ['org-a'] }, orgAAttachment),
    true,
    'an active member of the ticket org can read the attachment',
  )
  assert.equal(
    canReadStoredUpload({ ...base, requesterId: 'member-b', clientOrganizationIds: ['org-b'] }, orgAAttachment),
    false,
    "org B cannot read org A's ticket attachment",
  )
  assert.equal(
    canReadStoredUpload({ ...base, requesterId: 'plain', clientOrganizationIds: [] }, orgAAttachment),
    false,
    'a plain Deskii client cannot read a ticket attachment',
  )
  assert.equal(
    canReadStoredUpload({ ...base, requesterId: 'manager', isClientManager: true }, orgAAttachment),
    true,
    'client operations staff can read ticket attachments',
  )
}

function testPhaseVocabulary(): void {
  assert.equal(GEMFIELD_PHASES.length, 9, 'nine build phases are defined')
  assert.equal(isGemfieldPhase('client_review'), true, 'a known phase is recognized')
  assert.equal(isGemfieldPhase('deploying'), false, 'an unknown phase is rejected')
  assert.equal(isPhaseAtOrAfter('live', 'client_review'), true, 'live is after client_review')
  assert.equal(isPhaseAtOrAfter('design', 'client_review'), false, 'design is before client_review')
  assert.equal(isPhaseAtOrAfter('nonsense', 'build'), false, 'an unknown current phase never satisfies the gate')
  assert.equal(isGemfieldMilestoneStatus('in_progress'), true, 'a known milestone status is recognized')
  assert.equal(isGemfieldMilestoneStatus('blocked'), false, 'an unknown milestone status is rejected')
}

async function run(): Promise<void> {
  testGfIdValidation()
  testAccessPredicateMatrix()
  await testGuardMatrix()
  testAttachmentAccessMatrix()
  testPhaseVocabulary()
}

run()
  .then(() => console.log('gemfield.entitlement.matrix tests passed'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
