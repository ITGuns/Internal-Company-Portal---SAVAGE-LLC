import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { clearAccountStatusCache } from '../src/auth/account-status'
import { config } from '../src/config/env.config'
import { periodBoundsForDays } from '../src/payroll/payroll.calculations'
import { PayrollController } from '../src/payroll/payroll.controller'
import { PayrollService } from '../src/payroll/payroll.service'
import { APPROVED_PAYSLIP_MESSAGE } from '../src/payroll/payslip-edit.service'
import {
  CHANGED_ALL_MESSAGE,
  CHANGED_MESSAGE,
  MAX_SIGNATURE_BYTES,
  normalizeApprovalNote,
  normalizeSignature,
  normalizeSignerName,
  OWN_EDIT_APPROVAL_MESSAGE,
  parseExpectedAmount,
  SIGNER_ONLY_MESSAGE,
} from '../src/payroll/payslip-approval.service'
import { PayrollConflictError, PayrollValidationError } from '../src/payroll/payroll.errors'

/**
 * Disbursement sign-off (2026-10-28) against the test database: who may sign,
 * approve, double approve, the freeze on edit / delete / regenerate, revoke,
 * approve all, and Lock & Finalize with unapproved payslips. Real users,
 * roles, a draft period in 2031 and its payslips are created for the run and
 * removed afterwards. Bulk generation skipping approved payslips is checked
 * with stubs first (it would otherwise generate for every user in the database).
 */
type JsonRecord = Record<string, any>

const stamp = Date.now().toString(36)
const people = {
  signer: { email: `approval-signer-${stamp}@example.test`, name: 'Dina Signer', role: 'Disbursement Officer', id: '' },
  payroll: { email: `approval-payroll-${stamp}@example.test`, name: 'Paolo Payroll', role: 'Bookkeeping', id: '' },
  employee: { email: `approval-employee-${stamp}@example.test`, name: 'Ella Employee', role: 'Frontend Developer', id: '' },
  admin: { email: `approval-admin-${stamp}@example.test`, name: 'Ada Admin', role: 'admin', id: '' },
  workerOne: { email: `approval-w1-${stamp}@example.test`, name: 'Worker One', role: 'Inventory VA', id: '' },
  workerTwo: { email: `approval-w2-${stamp}@example.test`, name: 'Worker Two', role: 'Inventory VA', id: '' },
  workerThree: { email: `approval-w3-${stamp}@example.test`, name: 'Worker Three', role: 'Inventory VA', id: '' },
}
type Person = typeof people.signer

// A real 1 x 1 PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const sign = (extra: JsonRecord = {}) => ({ signerName: 'Dina Signer', signature: PNG, ...extra })

function tokenFor(person: Person) {
  return JwtService.generateAccessToken({ userId: person.id, email: person.email })
}

async function call(baseUrl: string, method: string, path: string, person: Person, body?: JsonRecord) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFor(person)}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : {} }
}

async function expectStatus(baseUrl: string, label: string, method: string, path: string, person: Person, expected: number, body?: JsonRecord) {
  const response = await call(baseUrl, method, path, person, body)
  assert.equal(response.status, expected, `${label}: expected ${expected}, got ${response.status} ${JSON.stringify(response.body)}`)
  return response.body
}

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/payroll', new PayrollController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

function runInputRuleTests() {
  assert.equal(normalizeSignerName('  Dina   Signer '), 'Dina Signer')
  assert.throws(() => normalizeSignerName('D'), PayrollValidationError)
  assert.throws(() => normalizeSignerName('x'.repeat(81)), PayrollValidationError)
  assert.equal(normalizeSignature(PNG), PNG)
  assert.throws(() => normalizeSignature(undefined), /Draw or type a signature/)
  assert.throws(() => normalizeSignature('data:image/jpeg;base64,/9j/4AAQ'), /Draw or type a signature/)
  assert.throws(() => normalizeSignature('data:image/png;base64,PHN2Zz4='), /Draw or type a signature/, 'not PNG bytes')
  assert.throws(() => normalizeSignature('data:image/png;base64,iVBORw0KGgo<script>'), /Draw or type a signature/)
  const tooLarge = `data:image/png;base64,iVBORw0KGgo${'A'.repeat(MAX_SIGNATURE_BYTES)}`
  assert.throws(() => normalizeSignature(tooLarge), /larger than 64 KB/)
  const atLimit = `data:image/png;base64,iVBORw0KGgo${'A'.repeat(MAX_SIGNATURE_BYTES - 33)}`
  assert.equal(atLimit.length, MAX_SIGNATURE_BYTES)
  assert.equal(normalizeSignature(atLimit), atLimit, '64 KB exactly is accepted')
  assert.equal(parseExpectedAmount(undefined), undefined)
  assert.equal(parseExpectedAmount('9500.5'), 9500.5)
  assert.throws(() => parseExpectedAmount('lots'), PayrollValidationError)
  assert.equal(normalizeApprovalNote('  '), null)
  assert.equal(normalizeApprovalNote(' Checked against the bank file '), 'Checked against the bank file')
  assert.throws(() => normalizeApprovalNote('x'.repeat(501)), PayrollValidationError)
}

async function runBulkSkipTest() {
  type Stub = [any, string, any]
  const stubs: Stub[] = [
    [prisma.payrollPeriod, 'findUnique', async () => ({ id: 'per-bulk', status: 'draft', startDate: new Date(), endDate: new Date() })],
    [prisma.user, 'findMany', async () => ['u-approved', 'u-edited', 'u-fresh'].map((id) => ({ id, roles: [{ role: 'Inventory VA' }], clientMemberships: [] }))],
    [prisma.payslip, 'findMany', async () => [
      { userId: 'u-approved', approvalStatus: 'approved' },
      { userId: 'u-edited', approvalStatus: 'draft' },
    ]],
  ]
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    const service = new PayrollService()
    const generated: string[] = []
    ;(service as any).generatePayslip = async (_periodId: string, userId: string) => {
      generated.push(userId)
      return { id: `ps-${userId}` }
    }
    const results = await service.bulkGeneratePayslips('per-bulk')
    assert.deepEqual(generated, ['u-fresh'], 'approved and edited payslips are not regenerated')
    const byUser = new Map(results.map((result) => [result.userId, result]))
    assert.equal(byUser.get('u-approved')?.skipped, true)
    assert.equal(byUser.get('u-approved')?.reason, 'Approved for disbursement; kept as is')
    assert.equal(byUser.get('u-edited')?.reason, 'Edited by hand; kept as is')
    assert.equal(byUser.get('u-fresh')?.payslipId, 'ps-u-fresh')
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

async function createFixtures() {
  for (const person of Object.values(people)) {
    const user = await prisma.user.create({ data: { email: person.email, name: person.name, status: 'active', isApproved: true } })
    person.id = user.id
    await prisma.userRole.create({ data: { userId: user.id, role: person.role } })
  }
  const bounds = periodBoundsForDays('2031-04-01', '2031-04-30', config.payrollTimezone)
  const period = await prisma.payrollPeriod.create({ data: { startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate, status: 'draft' } })
  const payslipFor = async (person: Person, gross: number) => prisma.payslip.create({
    data: {
      periodId: period.id,
      userId: person.id,
      grossPay: gross,
      netPay: gross,
      items: { create: [{ type: 'fixed_salary', description: 'Fixed monthly salary', amount: gross }] },
    },
  })
  const payslips = {
    one: await payslipFor(people.workerOne, 10000),
    two: await payslipFor(people.workerTwo, 20000),
    three: await payslipFor(people.workerThree, 30000),
    signerOwn: await payslipFor(people.signer, 40000),
  }
  return { period, payslips }
}

async function runApprovalRoutes(baseUrl: string, fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { signer, payroll, employee, admin, workerOne } = people
  const { period, payslips } = fixtures
  const approve = (id: string) => `/payroll/payslips/${id}/approve`
  const revoke = (id: string) => `/payroll/payslips/${id}/revoke-approval`

  // Who may sign: the Disbursement Officer or full access; payroll managers and employees get 403.
  const refused = await expectStatus(baseUrl, 'employee cannot sign', 'POST', approve(payslips.one.id), employee, 403, sign())
  assert.equal(refused.error, SIGNER_ONLY_MESSAGE)
  await expectStatus(baseUrl, 'payroll manager cannot sign', 'POST', approve(payslips.one.id), payroll, 403, sign())
  await expectStatus(baseUrl, 'payroll manager cannot approve all', 'POST', `/payroll/periods/${period.id}/approve-all`, payroll, 403, sign())

  // Input rules.
  await expectStatus(baseUrl, 'no signature', 'POST', approve(payslips.one.id), signer, 400, { signerName: 'Dina Signer' })
  await expectStatus(baseUrl, 'short name', 'POST', approve(payslips.one.id), signer, 400, sign({ signerName: 'D' }))
  const big = await expectStatus(baseUrl, 'signature over 64 KB', 'POST', approve(payslips.one.id), signer, 400,
    sign({ signature: `data:image/png;base64,iVBORw0KGgo${'A'.repeat(70000)}` }))
  assert.match(big.error, /64 KB/)
  await expectStatus(baseUrl, 'unknown payslip', 'POST', approve('does-not-exist'), signer, 404, sign())

  // The amounts the signer saw must still be the payslip's: a changed payslip answers 409.
  const changed = await expectStatus(baseUrl, 'stale amounts', 'POST', approve(payslips.one.id), signer, 409,
    sign({ expectedGrossPay: 10000, expectedNetPay: 9999 }))
  assert.equal(changed.error, CHANGED_MESSAGE)
  await expectStatus(baseUrl, 'expected amounts must be numbers', 'POST', approve(payslips.one.id), signer, 400, sign({ expectedNetPay: 'lots' }))

  // Approve, then a second approve answers 409.
  const approved = await expectStatus(baseUrl, 'signer approves', 'POST', approve(payslips.one.id), signer, 200,
    sign({ note: 'Checked against the bank file', expectedGrossPay: 10000, expectedNetPay: 10000 }))
  assert.equal(approved.approvalStatus, 'approved')
  assert.equal(approved.approvedById, signer.id)
  assert.equal(approved.approvalSignerName, 'Dina Signer')
  assert.equal(approved.approvalSignature, PNG)
  assert.equal(approved.approvalNote, 'Checked against the bank file')
  assert.ok(approved.approvedAt)
  assert.equal(approved.status, 'draft', 'the old status field is untouched')
  await expectStatus(baseUrl, 'double approve', 'POST', approve(payslips.one.id), signer, 409, sign())

  // Approved payslips are frozen: edit, delete and regenerate (even forced) answer 409.
  const editBody = { items: [{ type: 'fixed_salary', description: 'Fixed monthly salary', amount: 9000 }], note: 'Late correction' }
  const edit = await expectStatus(baseUrl, 'edit after approval', 'PATCH', `/payroll/payslips/${payslips.one.id}`, payroll, 409, editBody)
  assert.equal(edit.error, APPROVED_PAYSLIP_MESSAGE)
  await expectStatus(baseUrl, 'delete after approval', 'DELETE', `/payroll/payslips/${payslips.one.id}`, payroll, 409)
  const regenerate = await expectStatus(baseUrl, 'regenerate after approval', 'POST', `/payroll/periods/${period.id}/generate/${workerOne.id}`, payroll, 409, { force: true })
  assert.equal(regenerate.error, APPROVED_PAYSLIP_MESSAGE)

  // Revoke: signers only; the note records who revoked; then editing works again.
  await expectStatus(baseUrl, 'payroll manager cannot revoke', 'POST', revoke(payslips.one.id), payroll, 403)
  const revoked = await expectStatus(baseUrl, 'signer revokes', 'POST', revoke(payslips.one.id), signer, 200)
  assert.equal(revoked.approvalStatus, 'draft')
  assert.equal(revoked.approvalSignature, null)
  assert.equal(revoked.approvedById, null)
  assert.match(revoked.approvalNote, /^Approval revoked by Dina Signer on \d{4}-\d{2}-\d{2}$/)
  await expectStatus(baseUrl, 'revoke twice', 'POST', revoke(payslips.one.id), signer, 409)
  const edited = await expectStatus(baseUrl, 'edit after revoke', 'PATCH', `/payroll/payslips/${payslips.one.id}`, payroll, 200, editBody)
  assert.equal(edited.netPay, 9000)

  // Nobody signs off their own payslip.
  await expectStatus(baseUrl, 'own payslip', 'POST', approve(payslips.signerOwn.id), signer, 403, sign())

  // Summary: payroll roles; the signer's own payslip is left out of what they can approve,
  // and so is a payslip the requester edited (worker one, edited by payroll above; review fix 2026-10-28).
  const summary = await expectStatus(baseUrl, 'summary for payroll', 'GET', `/payroll/periods/${period.id}/approval-summary`, payroll, 200)
  assert.deepEqual([summary.total, summary.approved, summary.unapproved], [4, 0, 4])
  assert.deepEqual(summary.toApprove, { count: 3, gross: 90000, net: 90000 })
  assert.equal(summary.editedPending, 1)
  assert.equal(summary.ownPending, false)
  await expectStatus(baseUrl, 'summary needs payroll roles', 'GET', `/payroll/periods/${period.id}/approval-summary`, employee, 403)
  const signerSummary = await expectStatus(baseUrl, 'summary for the signer', 'GET', `/payroll/periods/${period.id}/approval-summary`, signer, 200)
  assert.deepEqual(signerSummary.toApprove, { count: 3, gross: 59000, net: 59000 })
  assert.equal(signerSummary.ownPending, true)

  // Approve all: every unapproved payslip but the signer's own, one signature, counts back.
  // The dialog's count and net go along; totals that changed since answer 409.
  await expectStatus(baseUrl, 'approve one first', 'POST', approve(payslips.two.id), signer, 200, sign())
  const stale = await expectStatus(baseUrl, 'approve all with stale totals', 'POST', `/payroll/periods/${period.id}/approve-all`, signer, 409,
    sign({ expectedCount: signerSummary.toApprove.count, expectedNet: signerSummary.toApprove.net }))
  assert.equal(stale.error, CHANGED_ALL_MESSAGE)
  const fresh = await expectStatus(baseUrl, 'summary again', 'GET', `/payroll/periods/${period.id}/approval-summary`, signer, 200)
  assert.deepEqual(fresh.toApprove, { count: 2, gross: 39000, net: 39000 }, 'worker one (edited to 9000) and worker three')
  const all = await expectStatus(baseUrl, 'approve all', 'POST', `/payroll/periods/${period.id}/approve-all`, signer, 200,
    sign({ expectedCount: fresh.toApprove.count, expectedNet: fresh.toApprove.net }))
  assert.deepEqual(all, { periodId: period.id, approved: 2, alreadyApproved: 1, skippedOwn: 1, skippedEdited: 0, total: 4 })
  const rows = await prisma.payslip.findMany({ where: { periodId: period.id }, select: { id: true, approvalStatus: true, approvalSignature: true } })
  const byId = new Map(rows.map((row) => [row.id, row]))
  assert.equal(byId.get(payslips.three.id)?.approvalStatus, 'approved')
  assert.equal(byId.get(payslips.three.id)?.approvalSignature, PNG, 'the same signature on each payslip')
  assert.equal(byId.get(payslips.signerOwn.id)?.approvalStatus, 'draft')
  await expectStatus(baseUrl, 'approve all needs a signature', 'POST', `/payroll/periods/${period.id}/approve-all`, signer, 400, { signerName: 'Dina Signer' })
  await expectStatus(baseUrl, 'approve all on an unknown period', 'POST', '/payroll/periods/does-not-exist/approve-all', signer, 404, sign())

  // An admin (full access) signs the signer's own payslip.
  await expectStatus(baseUrl, 'admin signs', 'POST', approve(payslips.signerOwn.id), admin, 200, sign({ signerName: 'Ada Admin' }))

  // Lock & Finalize: 409 with the count while a payslip is unapproved. Only a signer
  // (Disbursement Officer or full access) may force it (review fix 2026-10-28).
  const lockPath = `/payroll/periods/${period.id}/lock`
  await expectStatus(baseUrl, 'revoke one before the lock', 'POST', revoke(payslips.three.id), signer, 200)

  // Whoever edited a payslip never signs it (review fix 2026-10-28): refused one by one,
  // left out of the summary and of approve all, and counted there as skippedEdited.
  const signerEdit = await expectStatus(baseUrl, 'signer edits a payslip', 'PATCH', `/payroll/payslips/${payslips.three.id}`, signer, 200,
    { items: [{ type: 'fixed_salary', description: 'Fixed monthly salary', amount: 30000 }], note: 'Checked the hours' })
  assert.equal(signerEdit.editedById, signer.id)
  const ownEdit = await expectStatus(baseUrl, 'signer approves their own edit', 'POST', approve(payslips.three.id), signer, 403, sign())
  assert.equal(ownEdit.error, OWN_EDIT_APPROVAL_MESSAGE)
  const editedSummary = await expectStatus(baseUrl, 'summary with an own edit', 'GET', `/payroll/periods/${period.id}/approval-summary`, signer, 200)
  assert.equal(editedSummary.editedPending, 1)
  assert.equal(editedSummary.ownPending, false, "the signer's own payslip was signed by the admin")
  assert.deepEqual(editedSummary.toApprove, { count: 0, gross: 0, net: 0 })
  const payrollSummary = await expectStatus(baseUrl, 'summary for the payroll manager', 'GET', `/payroll/periods/${period.id}/approval-summary`, payroll, 200)
  assert.equal(payrollSummary.editedPending, 0, 'someone else may sign it')
  const skipped = await expectStatus(baseUrl, 'approve all skips the own edit', 'POST', `/payroll/periods/${period.id}/approve-all`, signer, 200,
    sign({ expectedCount: 0, expectedNet: 0 }))
  assert.deepEqual(skipped, { periodId: period.id, approved: 0, alreadyApproved: 3, skippedOwn: 0, skippedEdited: 1, total: 4 })
  assert.equal((await prisma.payslip.findUniqueOrThrow({ where: { id: payslips.three.id } })).approvalStatus, 'draft')
  const lock = await expectStatus(baseUrl, 'signer lock with an unapproved payslip', 'POST', lockPath, signer, 409)
  assert.equal(lock.unapprovedCount, 1)
  assert.equal(lock.error, '1 payslip is not approved for disbursement yet.')
  const notSigner = await expectStatus(baseUrl, 'payroll manager forces the lock', 'POST', lockPath, payroll, 409, { force: true })
  assert.equal(notSigner.unapprovedCount, 1)
  assert.equal(notSigner.error, '1 payslip is not approved. A Disbursement Officer or an admin can lock anyway.')
  const plainLock = await expectStatus(baseUrl, 'payroll manager lock without force', 'POST', lockPath, payroll, 409)
  assert.equal(plainLock.error, notSigner.error, 'a non-signer always learns who can lock anyway')
  const stillDraft = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id: period.id }, select: { status: true } })
  assert.equal(stillDraft.status, 'draft', 'a refused lock changes nothing')
  const locked = await expectStatus(baseUrl, 'signer forces the lock', 'POST', lockPath, signer, 200, { force: true })
  assert.equal(locked.status, 'processed')
  await expectStatus(baseUrl, 'lock twice', 'POST', lockPath, signer, 409, { force: true })

  // A processed period is read-only for sign-off too.
  await expectStatus(baseUrl, 'approve in a locked period', 'POST', approve(payslips.three.id), signer, 409, sign())
  await expectStatus(baseUrl, 'revoke in a locked period', 'POST', revoke(payslips.one.id), signer, 409)
  await expectStatus(baseUrl, 'approve all in a locked period', 'POST', `/payroll/periods/${period.id}/approve-all`, signer, 409, sign())
}

/**
 * Review fix 2026-10-28: a Lock & Finalize that lands while a regenerate computes
 * the pay turns the write into a no-op that reports the lock (409). The period
 * read is stubbed to what it was before the lock; the write re-checks the
 * stored status inside its transaction. Runs after the routes locked the period.
 */
async function runRegenerateRaceTest(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { period, payslips } = fixtures
  const lockedPeriod = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id: period.id } })
  assert.equal(lockedPeriod.status, 'processed')
  const before = await prisma.payslip.findUniqueOrThrow({ where: { id: payslips.three.id }, include: { items: true } })
  const realFindUnique = prisma.payrollPeriod.findUnique
  ;(prisma.payrollPeriod as any).findUnique = async () => ({ ...lockedPeriod, status: 'draft' })
  try {
    await assert.rejects(
      new PayrollService().generatePayslip(period.id, people.workerThree.id, undefined, { force: true, captureRoster: false }),
      (error: unknown) => error instanceof PayrollConflictError && error.message === 'Cannot run payroll for a processed cycle. Cycle must be draft.',
    )
  } finally {
    ;(prisma.payrollPeriod as any).findUnique = realFindUnique
  }
  const after = await prisma.payslip.findUniqueOrThrow({ where: { id: payslips.three.id }, include: { items: true } })
  assert.equal(after.grossPay, before.grossPay, 'a processed period keeps its payslip')
  assert.equal(after.editedById, before.editedById, 'the hand edit record is kept')
  assert.deepEqual(after.items.map((item) => [item.type, item.amount]), before.items.map((item) => [item.type, item.amount]))
}

async function main() {
  runInputRuleTests()
  await runBulkSkipTest()
  let periodId: string | null = null
  try {
    const fixtures = await createFixtures()
    periodId = fixtures.period.id
    await withServer((baseUrl) => runApprovalRoutes(baseUrl, fixtures))
    await runRegenerateRaceTest(fixtures)
  } finally {
    if (periodId) await prisma.payrollPeriod.deleteMany({ where: { id: periodId } })
    await prisma.user.deleteMany({ where: { email: { in: Object.values(people).map((person) => person.email) } } })
    clearAccountStatusCache()
  }
  console.log('payroll.approval.routes tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
