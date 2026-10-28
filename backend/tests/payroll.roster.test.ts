import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { clearAccountStatusCache } from '../src/auth/account-status'
import { config } from '../src/config/env.config'
import { emailService } from '../src/email/email.service'
import { periodBoundsForDays } from '../src/payroll/payroll.calculations'
import { PayrollController } from '../src/payroll/payroll.controller'
import { PayslipApprovalService } from '../src/payroll/payslip-approval.service'
import { PayslipEditService } from '../src/payroll/payslip-edit.service'
import { RosterSnapshotService } from '../src/payroll/roster-snapshot.service'
import {
  buildRosterCsv,
  buildRosterFields,
  categoryLabelFor,
  csvCell,
  makeRosterLabels,
  parseRosterQuery,
  payslipHoursWorked,
  payslipStatusFor,
  payslipTaxAmount,
  ROSTER_ID_MESSAGE,
  ROSTER_QUERY_MESSAGE,
  rosterCsvFilename,
  summarizeRoster,
  toRosterRowView,
} from '../src/payroll/roster-snapshot'

/**
 * Employee history (2026-10-28): the pure rules (CSV escaping, query
 * validation, row mapping, headcount), then against the test database the
 * route guards, the capture after generate / regenerate / edit / approve /
 * revoke / delete / lock, the lazy backfill from payslips written before the
 * feature, one person across periods, and the CSV download. Users, a
 * department and two periods in 2032 are created for the run and removed
 * afterwards.
 */
type JsonRecord = Record<string, any>

const stamp = Date.now().toString(36)
const FORMULA_NAME = '=HYPERLINK("http://evil.test","x")'
const people = {
  payroll: { email: `roster-payroll-${stamp}@example.test`, name: 'Paula Payroll', role: 'Bookkeeping', id: '' },
  employee: { email: `roster-employee-${stamp}@example.test`, name: 'Eli Employee', role: 'Frontend Developer', id: '' },
  probation: { email: `roster-probation-${stamp}@example.test`, name: 'Pia Probation', role: 'Inventory VA', id: '' },
  intern: { email: `roster-intern-${stamp}@example.test`, name: FORMULA_NAME, role: 'Inventory VA', id: '' },
}
type Person = typeof people.payroll

// A real 1 x 1 PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const labels = makeRosterLabels(
  [{ key: 'fixed_22_days', name: '22 credited days', isDefault: true }, { key: 'weekdays', name: 'Weekdays of month' }],
  [{ key: 'withholding_5', name: 'Withholding 5%', rate: 5, isDefault: true }],
)

function runPureTests() {
  // Formula injection: text starting with = + - @ tab or CR gets a leading quote.
  assert.equal(csvCell('=1+1'), "'=1+1")
  assert.equal(csvCell('+63 912'), "'+63 912")
  assert.equal(csvCell('-cmd'), "'-cmd")
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)")
  assert.equal(csvCell('\tTabbed'), "'\tTabbed")
  assert.equal(csvCell(FORMULA_NAME), `"'=HYPERLINK(""http://evil.test"",""x"")"`, 'guarded, then quoted')
  // Quoting.
  assert.equal(csvCell('Santos, Jade'), '"Santos, Jade"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('two\nlines'), '"two\nlines"')
  assert.equal(csvCell('Karl'), 'Karl')
  // Numbers are written here and stay numbers, negatives included.
  assert.equal(csvCell(30000), '30000.00')
  assert.equal(csvCell(-150.5), '-150.50')
  assert.equal(csvCell(Number.NaN), '')
  assert.equal(csvCell(null), '')
  assert.equal(csvCell(undefined), '')

  // Query: exactly one plain id.
  assert.deepEqual(parseRosterQuery({ periodId: 'cmabc123' }), { periodId: 'cmabc123' })
  assert.deepEqual(parseRosterQuery({ userId: ' u_1-x ' }), { userId: 'u_1-x' })
  assert.throws(() => parseRosterQuery({}), { message: ROSTER_QUERY_MESSAGE })
  assert.throws(() => parseRosterQuery({ periodId: '  ' }), { message: ROSTER_QUERY_MESSAGE }, 'blank counts as missing')
  assert.throws(() => parseRosterQuery({ periodId: 'a', userId: 'b' }), { message: ROSTER_QUERY_MESSAGE })
  assert.throws(() => parseRosterQuery({ periodId: ['a', 'b'] }), { message: ROSTER_QUERY_MESSAGE })
  assert.throws(() => parseRosterQuery({ periodId: "x' OR 1=1" }), { message: ROSTER_ID_MESSAGE })
  assert.throws(() => parseRosterQuery({ userId: 'x'.repeat(65) }), { message: ROSTER_ID_MESSAGE })

  // Payslip status: none, the sign-off in a draft period, locked once processed.
  assert.equal(payslipStatusFor(null, 'draft'), null)
  assert.equal(payslipStatusFor({ approvalStatus: 'draft' }, 'draft'), 'draft')
  assert.equal(payslipStatusFor({ approvalStatus: 'approved' }, 'draft'), 'approved')
  assert.equal(payslipStatusFor({ approvalStatus: 'draft' }, 'processed'), 'locked')

  // Hours and tax from the line items.
  const line = (description: string, amount = 1000, type = 'regular_hours') => ({ type, description, amount })
  assert.equal(payslipHoursWorked([line('Billable work hours (176 h credited, 184 h billable, 184 h tracked) - 22 credited days')]), 184)
  assert.equal(payslipHoursWorked([line('Work hours (40 h) entered by hand')]), 40)
  assert.equal(payslipHoursWorked([line('Fixed monthly salary (160 h billable, 1 of month)', 30000, 'fixed_salary')]), 160)
  assert.equal(payslipHoursWorked([line('Allowance', 500, 'allowance')]), 0)
  assert.equal(payslipTaxAmount([line('Withholding tax (Withholding 5%, 5%)', -1500, 'tax'), line('Loan', -300, 'deduction')]), 1500)

  // Labels: names at capture time; a list that could not be read is not guessed.
  assert.equal(labels.schemeName('weekdays'), 'Weekdays of month')
  assert.equal(labels.schemeName('gone'), '22 credited days', 'unknown keys read as the default scheme, like pay')
  assert.equal(labels.taxRuleLabel(null), 'Withholding 5%, 5%')
  assert.equal(labels.taxRuleLabel('none'), 'No tax')
  const unread = makeRosterLabels(null, null)
  assert.equal(unread.schemeName('weekdays'), 'weekdays')
  assert.equal(unread.taxRuleLabel(null), null)

  // Row mapping from the user, profile and payslip.
  const user = {
    id: 'u1',
    name: '  Jade Santos ',
    email: 'jade@example.test',
    status: 'verified',
    roles: [{ role: 'Inventory VA', department: null }, { role: 'Bookkeeping', department: { name: 'Payroll / Finance' } }],
    employeeProfile: { jobTitle: 'Inventory lead', employmentType: 'Probationary', payrollScheme: 'weekdays', payBasis: 'fixed_monthly', baseSalary: 35000, taxRule: 'none' },
  }
  const payslip = {
    id: 'ps1',
    grossPay: 35000,
    netPay: 34000,
    approvalStatus: 'approved',
    items: [line('Fixed monthly salary (160 h billable, 1 of month)', 35000, 'fixed_salary'), line('Loan', -1000, 'deduction')],
  }
  const fields = buildRosterFields({ user, payslip, periodStatus: 'draft', labels })
  assert.deepEqual(fields, {
    name: 'Jade Santos',
    email: 'jade@example.test',
    department: 'Payroll / Finance',
    roleTitle: 'Inventory lead',
    employmentType: 'Probationary',
    memberStatus: 'verified',
    payrollScheme: 'Weekdays of month',
    payBasis: 'fixed_monthly',
    baseSalary: 35000,
    taxRule: 'No tax',
    hoursWorked: 160,
    grossPay: 35000,
    taxAmount: 0,
    netPay: 34000,
    payslipId: 'ps1',
    payslipStatus: 'approved',
  })
  const unpaid = buildRosterFields({ user: { id: 'u2', email: 'new@example.test', status: 'active' }, payslip: null, periodStatus: 'processed', labels })
  assert.equal(unpaid.name, 'new@example.test')
  assert.equal(unpaid.department, 'Unassigned')
  assert.equal(unpaid.roleTitle, 'Member')
  assert.deepEqual(
    [unpaid.employmentType, unpaid.payrollScheme, unpaid.taxRule, unpaid.grossPay, unpaid.netPay, unpaid.payslipId, unpaid.payslipStatus],
    [null, null, null, null, null, null, null],
  )

  // Headcount by category (none last) and by status, totals of the paid rows.
  const summary = summarizeRoster([
    { ...fields },
    { ...fields, payslipId: 'ps2', employmentType: 'Intern', grossPay: 10000.25, taxAmount: 500, netPay: 9500 },
    { ...fields, payslipId: 'ps3', grossPay: 20000, taxAmount: 0, netPay: 20000 },
    { ...unpaid },
  ])
  assert.equal(summary.headcount, 4)
  assert.equal(summary.withPayslip, 3)
  assert.deepEqual(summary.byCategory, [{ value: 'Probationary', count: 2 }, { value: 'Intern', count: 1 }, { value: null, count: 1 }])
  assert.deepEqual(summary.byStatus, [{ value: 'verified', count: 3 }, { value: 'active', count: 1 }])
  assert.deepEqual(summary.totals, { grossPay: 65000.25, taxAmount: 500, netPay: 63500 })

  // A processed period reads as locked even if the lock-time capture never ran.
  const view = toRosterRowView(
    { ...fields, periodId: 'p1', userId: 'u1', capturedAt: new Date('2026-10-28T03:00:00Z'), payslipStatus: 'approved' },
    { startDate: new Date('2026-09-30T16:00:00Z'), endDate: new Date('2026-10-31T15:59:59Z'), status: 'processed' },
  )
  assert.equal(view.payslipStatus, 'locked')
  assert.equal(view.periodStart, '2026-10-01')
  assert.equal(view.periodEnd, '2026-10-31')

  // The file: byte order mark, header, CRLF, labels, escaping.
  const csv = buildRosterCsv([{ ...view, name: FORMULA_NAME }], (value) => categoryLabelFor([{ value: 'Probationary', label: 'Probationary' }], value))
  assert.ok(csv.startsWith('\uFEFFPeriod start,Period end,Employee,'))
  const [, row] = csv.slice(1).split('\r\n')
  assert.equal(
    row,
    `2026-10-01,2026-10-31,"'=HYPERLINK(""http://evil.test"",""x"")",jade@example.test,Payroll / Finance,Inventory lead,Probationary,Verified,Weekdays of month,Fixed monthly salary,35000.00,No tax,160.00,35000.00,0.00,34000.00,Locked,2026-10-28T03:00:00.000Z`,
  )
  assert.ok(csv.endsWith('\r\n'))
  assert.equal(categoryLabelFor([], null), 'Not set')
  assert.equal(categoryLabelFor([], 'Legacy contract'), 'Legacy contract')

  assert.equal(rosterCsvFilename({ periodStart: '2026-10-01', periodEnd: '2026-10-31' }), 'deskii-employee-history-2026-10-01-to-2026-10-31.csv')
  assert.equal(rosterCsvFilename({ employeeName: 'Peñaflor, Ana "Bea"' }), 'deskii-payroll-history-penaflor-ana-bea.csv')
  assert.equal(rosterCsvFilename({ employeeName: '"; rm -rf' }), 'deskii-payroll-history-rm-rf.csv')
  assert.equal(rosterCsvFilename({ employeeName: '***' }), 'deskii-payroll-history-employee.csv')
}

async function runCaptureNeverThrowsTest() {
  const broken = new RosterSnapshotService({ payrollPeriod: { findUnique: async () => { throw new Error('database down') } } } as any)
  assert.equal(await broken.captureSafely('p1', ['u1']), 0, 'a failed capture is logged, never thrown')
  await assert.rejects(broken.capture('p1', ['u1']), /database down/)
  assert.equal(await broken.refreshOpenPeriodsSafely('u1'), 0, 'a failed refresh never blocks the profile save')
}

function tokenFor(person: Person) {
  return JwtService.generateAccessToken({ userId: person.id, email: person.email })
}

async function call(baseUrl: string, path: string, person?: Person) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: person ? { Authorization: `Bearer ${tokenFor(person)}` } : {},
  })
  // Raw bytes: response.text() would drop the CSV's byte order mark.
  const text = Buffer.from(await response.arrayBuffer()).toString('utf8')
  return { status: response.status, headers: response.headers, text }
}

async function getJson(baseUrl: string, path: string, person: Person, expected = 200): Promise<JsonRecord> {
  const response = await call(baseUrl, path, person)
  assert.equal(response.status, expected, `${path}: expected ${expected}, got ${response.status} ${response.text}`)
  return response.text ? JSON.parse(response.text) : {}
}

async function post(baseUrl: string, path: string, person: Person, body: JsonRecord) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenFor(person)}` },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  assert.equal(response.status, 200, `${path}: ${response.status} ${text}`)
  return JSON.parse(text)
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

async function createFixtures() {
  const department = await prisma.department.create({ data: { name: `Roster Dept ${stamp}` } })
  for (const person of Object.values(people)) {
    const user = await prisma.user.create({ data: { email: person.email, name: person.name, status: 'active', isApproved: true } })
    person.id = user.id
    const departmentId = person === people.probation ? department.id : null
    await prisma.userRole.create({ data: { userId: user.id, role: person.role, departmentId } })
  }
  const profile = (person: Person, employmentType: string) => prisma.employeeProfile.create({
    data: { userId: person.id, employmentType, baseSalary: 22000, payrollScheme: 'fixed_22_days', payBasis: 'hourly_from_monthly', jobTitle: 'Inventory VA', taxRule: 'none' },
  })
  await profile(people.probation, 'Probationary')
  await profile(people.intern, 'Intern')
  const periodFor = (first: string, last: string) => {
    const bounds = periodBoundsForDays(first, last, config.payrollTimezone)
    return prisma.payrollPeriod.create({ data: { startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate, status: 'draft' } })
  }
  const january = await periodFor('2032-01-01', '2032-01-31')
  const february = await periodFor('2032-02-01', '2032-02-29')
  return { department, january, february }
}

function snapshotOf(periodId: string, person: Person) {
  return prisma.payrollRosterSnapshot.findUnique({ where: { periodId_userId: { periodId, userId: person.id } } })
}

async function runGuardTests(baseUrl: string, periodId: string) {
  for (const path of [`/payroll/reports/roster?periodId=${periodId}`, `/payroll/reports/roster.csv?periodId=${periodId}`]) {
    assert.equal((await call(baseUrl, path)).status, 401, `${path} without a token`)
    assert.equal((await call(baseUrl, path, people.employee)).status, 403, `${path} for an employee role`)
  }
  await getJson(baseUrl, '/payroll/reports/roster?periodId=does-not-exist', people.payroll, 404)
  await getJson(baseUrl, '/payroll/reports/roster?userId=does-not-exist', people.payroll, 404)
  await getJson(baseUrl, '/payroll/reports/roster.csv?periodId=does-not-exist', people.payroll, 404)
  await getJson(baseUrl, '/payroll/reports/roster', people.payroll, 400)
  await getJson(baseUrl, `/payroll/reports/roster?periodId=${periodId}&userId=${people.intern.id}`, people.payroll, 400)
  await getJson(baseUrl, '/payroll/reports/roster?periodId=%3Bdrop', people.payroll, 400)
  // Creating the current period is payroll management only since 2026-10-28 (it was any signed-in account).
  const ensure = await fetch(`${baseUrl}/payroll/periods/ensure`, { method: 'POST', headers: { Authorization: `Bearer ${tokenFor(people.employee)}` } })
  await ensure.text()
  assert.equal(ensure.status, 403, 'an employee cannot create the current period')
}

async function runCaptureTests(baseUrl: string, fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { february } = fixtures
  const generate = (person: Person, hoursWorked: number) =>
    post(baseUrl, `/payroll/periods/${february.id}/generate/${person.id}`, people.payroll, { hoursWorked })

  // Generate: the row appears with the payslip's own figures and the current profile.
  const first = await generate(people.probation, 80)
  let row = await snapshotOf(february.id, people.probation)
  assert.ok(row, 'a row after generate')
  assert.equal(row.payslipId, first.id)
  assert.equal(row.grossPay, first.grossPay)
  assert.equal(row.netPay, first.netPay)
  assert.equal(row.taxAmount, payslipTaxAmount(first.items))
  assert.equal(row.hoursWorked, 80)
  assert.deepEqual([row.name, row.email, row.department, row.employmentType, row.payslipStatus], [
    'Pia Probation', people.probation.email, `Roster Dept ${stamp}`, 'Probationary', 'draft',
  ])
  assert.equal(row.taxRule, 'No tax')

  // Regenerate after a category change: the same row is rewritten, never doubled.
  await prisma.employeeProfile.update({ where: { userId: people.probation.id }, data: { employmentType: 'Temporary Hire' } })
  const second = await generate(people.probation, 40)
  row = await snapshotOf(february.id, people.probation)
  assert.equal(row?.hoursWorked, 40)
  assert.equal(row?.grossPay, second.grossPay)
  assert.equal(row?.employmentType, 'Temporary Hire')
  assert.equal(await prisma.payrollRosterSnapshot.count({ where: { periodId: february.id, userId: people.probation.id } }), 1)

  // Edit, approve, revoke: each write updates the row.
  const edits = new PayslipEditService()
  await edits.editPayslip(second.id, people.payroll.id, {
    items: [{ type: 'regular_hours', description: 'Work hours (40 h) entered by hand', amount: 5000 }, { type: 'deduction', description: 'Loan', amount: 250 }],
    note: 'Corrected by payroll',
  })
  row = await snapshotOf(february.id, people.probation)
  assert.deepEqual([row?.grossPay, row?.netPay], [5000, 4750])
  const approvals = new PayslipApprovalService()
  // Someone other than the editor signs (review fix 2026-10-28: the editor never signs
  // their own edit). The service does not check roles; the routes do.
  await approvals.approvePayslip(second.id, people.employee.id, { signerName: 'Eli Employee', signature: PNG })
  assert.equal((await snapshotOf(february.id, people.probation))?.payslipStatus, 'approved')
  await approvals.revokeApproval(second.id, people.employee.id)
  assert.equal((await snapshotOf(february.id, people.probation))?.payslipStatus, 'draft')

  // Delete: the person stays on the period's history without pay.
  const extra = await generate(people.employee, 8)
  assert.equal((await snapshotOf(february.id, people.employee))?.payslipId, extra.id)
  await edits.deletePayslip(extra.id, people.payroll.id)
  row = await snapshotOf(february.id, people.employee)
  assert.deepEqual([row?.payslipId, row?.grossPay, row?.payslipStatus], [null, null, null])
}

async function runBackfillAndReadTests(baseUrl: string, fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { january, february } = fixtures
  // Payslips written straight to the table, as before this release: no history rows yet.
  const payslipFor = (periodId: string, gross: number) => prisma.payslip.create({
    data: {
      periodId,
      userId: people.intern.id,
      grossPay: gross,
      netPay: gross - 500,
      items: { create: [
        { type: 'regular_hours', description: 'Billable work hours (120 h billable, 120 h tracked) - 22 credited days', amount: gross },
        { type: 'tax', description: 'Withholding tax (Withholding 5%, 5%)', amount: -500 },
      ] },
    },
  })
  const old = await payslipFor(january.id, 10000)
  await payslipFor(february.id, 12000)
  assert.equal(await prisma.payrollRosterSnapshot.count({ where: { periodId: january.id } }), 0)

  // Lazy backfill on the first read of the period, once.
  const roster = await getJson(baseUrl, `/payroll/reports/roster?periodId=${january.id}`, people.payroll)
  assert.deepEqual(roster.period, { id: january.id, startDay: '2032-01-01', endDay: '2032-01-31', payDay: roster.period.payDay, status: 'draft' })
  assert.equal(roster.rows.length, 1)
  assert.deepEqual(
    [roster.rows[0].userId, roster.rows[0].payslipId, roster.rows[0].grossPay, roster.rows[0].taxAmount, roster.rows[0].netPay, roster.rows[0].hoursWorked, roster.rows[0].employmentType],
    [people.intern.id, old.id, 10000, 500, 9500, 120, 'Intern'],
  )
  assert.deepEqual(roster.summary.byCategory, [{ value: 'Intern', count: 1 }])
  assert.deepEqual(roster.summary.totals, { grossPay: 10000, taxAmount: 500, netPay: 9500 })
  await getJson(baseUrl, `/payroll/reports/roster?periodId=${january.id}`, people.payroll)
  assert.equal(await prisma.payrollRosterSnapshot.count({ where: { periodId: january.id } }), 1, 'a second read adds nothing')

  // One person across periods, newest first; the February payslip is backfilled by this read.
  const history = await getJson(baseUrl, `/payroll/reports/roster?userId=${people.intern.id}`, people.payroll)
  assert.equal(history.employee.id, people.intern.id)
  assert.deepEqual(history.rows.map((entry: JsonRecord) => entry.periodId), [february.id, january.id])
  assert.deepEqual(history.summary.totals, { grossPay: 22000, taxAmount: 1000, netPay: 21000 })

  // CSV: a download name, the byte order mark, and the formula-looking name defused.
  const csv = await call(baseUrl, `/payroll/reports/roster.csv?periodId=${january.id}`, people.payroll)
  assert.equal(csv.status, 200)
  assert.match(csv.headers.get('content-type') ?? '', /^text\/csv/)
  assert.equal(csv.headers.get('content-disposition'), 'attachment; filename="deskii-employee-history-2032-01-01-to-2032-01-31.csv"')
  assert.equal(csv.headers.get('cache-control'), 'no-store')
  assert.ok(csv.text.startsWith('\uFEFFPeriod start,'))
  assert.ok(csv.text.includes(`,"'=HYPERLINK(""http://evil.test"",""x"")",`), 'the name is guarded and quoted')
  assert.ok(csv.text.includes(',Intern,Active,'), 'category and status labels')
  const personal = await call(baseUrl, `/payroll/reports/roster.csv?userId=${people.intern.id}`, people.payroll)
  assert.equal(personal.headers.get('content-disposition'), 'attachment; filename="deskii-payroll-history-hyperlink-http-evil-test-x.csv"')
  assert.equal(personal.text.trim().split('\r\n').length, 3, 'header and one line per period')
}

async function runLockTest(baseUrl: string, fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { february } = fixtures
  // Forcing the lock over unapproved payslips needs a signer since the review fix of
  // 2026-10-28; a configured admin email signs without a new person on the roster.
  const savedAdminEmails = config.adminEmails
  config.adminEmails = [...savedAdminEmails, people.payroll.email.toLowerCase()]
  try {
    await post(baseUrl, `/payroll/periods/${february.id}/lock`, people.payroll, { force: true })
  } finally {
    config.adminEmails = savedAdminEmails
  }
  // Every active internal employee is on the final roster, payslip or not.
  const roster = await getJson(baseUrl, `/payroll/reports/roster?periodId=${february.id}`, people.payroll)
  const byUser = new Map<string, JsonRecord>(roster.rows.map((entry: JsonRecord) => [entry.userId, entry]))
  for (const person of Object.values(people)) assert.ok(byUser.has(person.id), `${person.name} is on the locked roster`)
  assert.equal(byUser.get(people.probation.id)?.payslipStatus, 'locked')
  assert.equal(byUser.get(people.payroll.id)?.payslipStatus, null, 'no payslip, still on the roster')
  assert.equal(byUser.get(people.payroll.id)?.grossPay, null)
  assert.equal(roster.period.status, 'processed')
}

async function runProfileRefreshTest(baseUrl: string, fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { january, february } = fixtures
  // January is open (draft), February was locked by runLockTest; the intern has a row in both.
  const openBefore = await snapshotOf(january.id, people.intern)
  const lockedBefore = await snapshotOf(february.id, people.intern)
  assert.ok(openBefore && lockedBefore, 'the intern has a row in the open and the locked period')
  await post(baseUrl, `/payroll/config/${people.intern.id}`, people.payroll, { employmentType: 'Temporary Hire', baseSalary: 24000 })
  const open = await snapshotOf(january.id, people.intern)
  assert.ok(open, 'the open row is still there')
  assert.deepEqual([open.employmentType, open.baseSalary], ['Temporary Hire', 24000], 'the open period follows the profile save')
  assert.deepEqual([open.payslipId, open.grossPay, open.payslipStatus], [openBefore.payslipId, openBefore.grossPay, 'draft'], 'pay fields keep the payslip')
  assert.ok(open.capturedAt.getTime() >= openBefore.capturedAt.getTime())
  assert.deepEqual(await snapshotOf(february.id, people.intern), lockedBefore, 'the locked period is untouched')
  // A save never creates a row: the probation person has none in January.
  await post(baseUrl, `/payroll/config/${people.probation.id}`, people.payroll, { employmentType: 'Intern' })
  assert.equal(await snapshotOf(january.id, people.probation), null)
}

async function main() {
  runPureTests()
  await runCaptureNeverThrowsTest()
  const savedEmail = emailService.sendPayslipNotification
  ;(emailService as any).sendPayslipNotification = async () => undefined
  let fixtures: Awaited<ReturnType<typeof createFixtures>> | null = null
  try {
    fixtures = await createFixtures()
    const ready = fixtures
    await withServer(async (baseUrl) => {
      await runGuardTests(baseUrl, ready.february.id)
      await runCaptureTests(baseUrl, ready)
      await runBackfillAndReadTests(baseUrl, ready)
      await runLockTest(baseUrl, ready)
      await runProfileRefreshTest(baseUrl, ready)
    })
  } finally {
    ;(emailService as any).sendPayslipNotification = savedEmail
    if (fixtures) await prisma.payrollPeriod.deleteMany({ where: { id: { in: [fixtures.january.id, fixtures.february.id] } } })
    await prisma.user.deleteMany({ where: { email: { in: Object.values(people).map((person) => person.email) } } })
    if (fixtures) await prisma.department.deleteMany({ where: { id: fixtures.department.id } })
    clearAccountStatusCache()
  }
  console.log('payroll.roster tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
