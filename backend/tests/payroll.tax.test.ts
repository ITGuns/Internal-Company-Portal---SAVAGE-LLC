import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { prisma } from '../src/database/prisma.service'
import { JwtService } from '../src/auth/jwt.service'
import { clearAccountStatusCache } from '../src/auth/account-status'
import { config } from '../src/config/env.config'
import { emailService } from '../src/email/email.service'
import { periodBoundsForDays, zonedMidnightUtc } from '../src/payroll/payroll.calculations'
import { resolvePayrollScheme } from '../src/payroll/payroll-schemes'
import { PayrollController } from '../src/payroll/payroll.controller'
import { PayrollService } from '../src/payroll/payroll.service'
import { computePayslipTotals, normalizePayslipItems, PayslipEditService } from '../src/payroll/payslip-edit.service'
import {
  buildTaxLine,
  computeTaxAmount,
  formatTaxRate,
  NO_TAX,
  normalizeProfileTaxRule,
  parseTaxDefaultFlag,
  parseTaxRuleFields,
  resolveTaxRule,
  taxRuleKeyFor,
} from '../src/payroll/payroll-tax'
import { PayrollValidationError } from '../src/payroll/payroll.errors'

/**
 * Withholding tax rules (2026-10-28). Pure rules first, then the routes and
 * generated payslips against the test database: /payroll/tax-rules CRUD,
 * profile choices, the default rule, per-employee "no tax" and rule
 * overrides, rounding, an archived rule still applying, regeneration. Real
 * users, profiles, rules and a draft period in 2031 are created for the run
 * and removed afterwards.
 */
type JsonRecord = Record<string, any>

const stamp = Date.now().toString(36)
const people = {
  payroll: { email: `tax-payroll-${stamp}@example.test`, role: 'Bookkeeping', id: '' },
  manager: { email: `tax-manager-${stamp}@example.test`, role: 'Project Manager', id: '' },
  employee: { email: `tax-employee-${stamp}@example.test`, role: 'Frontend Developer', id: '' },
  followsDefault: { email: `tax-default-${stamp}@example.test`, role: 'Inventory VA', id: '' },
  noTax: { email: `tax-none-${stamp}@example.test`, role: 'Inventory VA', id: '' },
  ownRule: { email: `tax-own-${stamp}@example.test`, role: 'Inventory VA', id: '' },
}
type Person = typeof people.payroll

function runPureTests() {
  // Amount: gross x rate / 100 to cents, half away from zero, never below 0.
  assert.equal(computeTaxAmount(30000, 5), 1500)
  assert.equal(computeTaxAmount(10000.55, 5), 500.03, '500.0275 rounds up')
  assert.equal(computeTaxAmount(33333.33, 7.5), 2500, '2499.99975 rounds to 2500.00')
  assert.equal(computeTaxAmount(33333.33, 10), 3333.33)
  assert.equal(computeTaxAmount(0, 5), 0)
  assert.equal(computeTaxAmount(-100, 5), 0)
  assert.equal(computeTaxAmount(1000, 0), 0)
  assert.equal(formatTaxRate(5), '5')
  assert.equal(formatTaxRate(2.5), '2.5')
  assert.deepEqual(buildTaxLine({ name: 'Withholding 5%', rate: 5 }, 30000), {
    type: 'tax',
    description: 'Withholding tax (Withholding 5%, 5%)',
    amount: -1500,
  })
  assert.ok(Object.is(buildTaxLine({ name: 'Exempt', rate: 0 }, 30000).amount, 0), 'a zero line is 0, not -0')

  // Resolution: 'none' is no tax, null is the default, a key wins, an unknown key falls back.
  const rules = [
    { key: 'withholding_5', name: 'Withholding 5%', rate: 5, isDefault: true },
    { key: 'contractor_10', name: 'Contractor 10%', rate: 10 },
  ]
  assert.equal(resolveTaxRule(NO_TAX, rules).rule, null)
  assert.equal(resolveTaxRule(null, rules).rule?.key, 'withholding_5')
  assert.equal(resolveTaxRule('', rules).rule?.key, 'withholding_5')
  assert.equal(resolveTaxRule('contractor_10', rules).rule?.key, 'contractor_10')
  assert.deepEqual(resolveTaxRule('gone', rules), { rule: rules[0], known: false })
  assert.equal(resolveTaxRule(null, [rules[1]]).rule, null, 'no default rule means no tax')

  // Input rules.
  assert.deepEqual(parseTaxRuleFields({ name: ' Withholding  5% ', rate: '5' }, undefined, 3), { name: 'Withholding 5%', rate: 5, sortOrder: 3 })
  assert.throws(() => parseTaxRuleFields({ name: 'Too high', rate: 100.5 }), /from 0 to 100/)
  assert.throws(() => parseTaxRuleFields({ name: 'Negative', rate: -1 }), PayrollValidationError)
  assert.throws(() => parseTaxRuleFields({ name: 'Blank', rate: '' }), PayrollValidationError)
  assert.throws(() => parseTaxRuleFields({ name: 'X', rate: 5 }), PayrollValidationError)
  assert.equal(parseTaxRuleFields({ rate: 7.5 }, { name: 'Kept', rate: 5, sortOrder: 1 }).name, 'Kept')
  assert.equal(parseTaxDefaultFlag(false), false, 'a workspace may have no default')
  assert.throws(() => parseTaxDefaultFlag('yes'), PayrollValidationError)
  assert.equal(taxRuleKeyFor('Withholding 5%', new Set()), 'withholding_5')
  assert.equal(taxRuleKeyFor('None', new Set()), 'none_2', "'none' is reserved for no tax")
  assert.equal(taxRuleKeyFor('***', new Set(['tax_rule'])), 'tax_rule_2')
  assert.equal(normalizeProfileTaxRule(undefined), undefined)
  assert.equal(normalizeProfileTaxRule(null), null)
  assert.equal(normalizeProfileTaxRule('  '), null, 'blank follows the default')
  assert.equal(normalizeProfileTaxRule(' none '), NO_TAX)
  assert.throws(() => normalizeProfileTaxRule(5), PayrollValidationError)

  // Tax is a deduction: stored negative in edits, never part of gross.
  const items = normalizePayslipItems([
    { type: 'fixed_salary', description: 'Salary', amount: 30000 },
    { type: 'tax', description: 'Withholding tax (Withholding 5%, 5%)', amount: 1500 },
  ])
  assert.equal(items[1].amount, -1500)
  assert.deepEqual(computePayslipTotals(items), { grossPay: 30000, netPay: 28500 })
}

type Stub = [any, string, any]

async function withStubs(stubs: Stub[], run: () => Promise<void>) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    await run()
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

/**
 * Line order and base (stubbed Prisma, no database): the tax line comes after
 * the overtime lines and before the deductions sent with the request, and is
 * computed on the gross of the lines before it (regular pay plus approved overtime).
 */
async function runLineOrderTest() {
  const manila = 'Asia/Manila'
  const savedTimezone = config.payrollTimezone
  config.payrollTimezone = manila
  const bounds = periodBoundsForDays('2026-10-01', '2026-10-15', manila)
  const period = { id: 'per-tax', status: 'draft', startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate }
  const workDay = zonedMidnightUtc('2026-10-05', manila)
  // 10 h on one day: 8 h billable, 2 h over the cap, both approved.
  const entries = [{ start: new Date(workDay.getTime() + 8 * 3_600_000), duration: 600 }]
  const overtime = [{ workDate: workDay, hours: 2, approvedHours: 2 }]
  const inRange = (value: Date, range: any) => (!range?.gte || value >= range.gte) && (!range?.lt || value < range.lt) && (!range?.lte || value <= range.lte)
  const created: any[] = []
  try {
    await withStubs([
      [prisma.payrollPeriod, 'findUnique', async () => period],
      [prisma.payslip, 'findFirst', async () => null],
      [prisma.payslip, 'create', async (args: any) => { created.push(args.data); return { id: 'ps-tax', ...args.data } }],
      [prisma.employeeProfile, 'findUnique', async () => ({
        userId: 'u1', payBasis: 'hourly_rate', hourlyRate: 500, overtimeMultiplier: 1.25, maxBillableHoursPerDay: 8,
        baseSalary: 0, currency: 'PHP', payrollScheme: 'weekdays', taxRule: 'withholding_5',
      })],
      [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((entry) => inRange(entry.start, args.where.start))],
      [prisma.dailyLog, 'findMany', async () => []],
      [prisma.overtimeRequest, 'findMany', async (args: any) => overtime.filter((row) => inRange(row.workDate, args.where.workDate))],
      [prisma.user, 'findUnique', async () => null],
      [emailService, 'sendPayslipNotification', async () => undefined],
    ], async () => {
      const service = new PayrollService()
      const asked: unknown[] = []
      ;(service as any).options = { resolveScheme: async (key: unknown) => resolvePayrollScheme(key).scheme }
      ;(service as any).taxRules = {
        resolveForProfile: async (key: unknown) => {
          asked.push(key)
          return { key: 'withholding_5', name: 'Withholding 5%', rate: 5 }
        },
      }
      await service.generatePayslip('per-tax', 'u1', { deductions: [{ name: 'Loan', amount: 300, type: 'other' }] })
      assert.deepEqual(asked, ['withholding_5'], 'the profile value is resolved')
    })
  } finally {
    config.payrollTimezone = savedTimezone
  }
  const items = created[0].items.create as Array<{ type: string; description: string; amount: number }>
  assert.deepEqual(items.map((item) => item.type), ['regular_hours', 'overtime_approved', 'tax', 'deduction'])
  assert.deepEqual(items.map((item) => item.amount), [4000, 1250, -262.5, -300], 'tax is 5% of 4000 + 1250')
  assert.deepEqual([created[0].grossPay, created[0].netPay], [5250, 4687.5])
}

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
  app.use(express.json())
  app.use('/payroll', new PayrollController().router())
  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  }
}

async function createPeople() {
  for (const [key, person] of Object.entries(people)) {
    const user = await prisma.user.create({
      data: { email: person.email, name: key, status: 'active', isApproved: true },
    })
    person.id = user.id
    await prisma.userRole.create({ data: { userId: user.id, role: person.role } })
  }
  // Fixed monthly salaries: a whole-month period pays the salary, no time entries needed.
  const profile = (userId: string, baseSalary: number) => prisma.employeeProfile.create({
    data: { userId, payBasis: 'fixed_monthly', baseSalary, payrollScheme: 'fixed_22_days', paymentFrequency: 'Monthly' },
  })
  await profile(people.followsDefault.id, 30000)
  await profile(people.noTax.id, 30000)
  await profile(people.ownRule.id, 33333.33)
}

const byKey = (rows: JsonRecord[], key: string) => rows.find((row) => row.key === key)

async function runRuleRoutes(baseUrl: string) {
  const { payroll, manager, employee, noTax, ownRule } = people
  const before = await expectStatus(baseUrl, 'employee lists rules', 'GET', '/payroll/tax-rules', employee, 200)
  assert.ok(Array.isArray(before))
  assert.ok(before.every((row: JsonRecord) => !('inUseCount' in row)), 'no usage counts for employees')

  const draft = { name: 'Withholding 5%', rate: 5 }
  await expectStatus(baseUrl, 'employee cannot add', 'POST', '/payroll/tax-rules', employee, 403, draft)
  await expectStatus(baseUrl, 'plain manager cannot add', 'POST', '/payroll/tax-rules', manager, 403, draft)
  const five = await expectStatus(baseUrl, 'payroll adds', 'POST', '/payroll/tax-rules', payroll, 201, draft)
  assert.deepEqual([five.key, five.rate, five.isDefault, five.inUseCount], ['withholding_5', 5, false, 0])
  await expectStatus(baseUrl, 'duplicate name', 'POST', '/payroll/tax-rules', payroll, 409, { name: 'withholding 5%', rate: 6 })
  await expectStatus(baseUrl, 'rate above 100', 'POST', '/payroll/tax-rules', payroll, 400, { name: 'Odd', rate: 101 })
  await expectStatus(baseUrl, 'rate missing', 'POST', '/payroll/tax-rules', payroll, 400, { name: 'Odd' })
  const ten = await expectStatus(baseUrl, 'second rule', 'POST', '/payroll/tax-rules', payroll, 201, { name: 'Contractor 10%', rate: 10 })
  const none = await expectStatus(baseUrl, 'a rule named None', 'POST', '/payroll/tax-rules', payroll, 201, { name: 'None', rate: 0 })
  assert.equal(none.key, 'none_2')

  // Rename and rate change keep the key.
  const renamed = await expectStatus(baseUrl, 'edit', 'PATCH', `/payroll/tax-rules/${ten.id}`, payroll, 200, { name: 'Contractors 10%', rate: 10 })
  assert.deepEqual([renamed.key, renamed.name], ['contractor_10', 'Contractors 10%'])
  await expectStatus(baseUrl, 'employee cannot edit', 'PATCH', `/payroll/tax-rules/${ten.id}`, employee, 403, { rate: 1 })
  await expectStatus(baseUrl, 'unknown id', 'PATCH', '/payroll/tax-rules/does-not-exist', payroll, 404, { rate: 1 })

  // One default at most; it can be cleared; the default cannot be archived or deleted.
  await expectStatus(baseUrl, 'set default', 'PATCH', `/payroll/tax-rules/${ten.id}`, payroll, 200, { isDefault: true })
  await expectStatus(baseUrl, 'switch default', 'PATCH', `/payroll/tax-rules/${five.id}`, payroll, 200, { isDefault: true })
  let rows = await expectStatus(baseUrl, 'list after switch', 'GET', '/payroll/tax-rules', payroll, 200)
  assert.deepEqual(rows.filter((row: JsonRecord) => row.isDefault).map((row: JsonRecord) => row.key), ['withholding_5'])
  await expectStatus(baseUrl, 'default cannot be archived', 'PATCH', `/payroll/tax-rules/${five.id}`, payroll, 409, { archived: true })
  await expectStatus(baseUrl, 'default cannot be deleted', 'DELETE', `/payroll/tax-rules/${five.id}`, payroll, 409)
  await expectStatus(baseUrl, 'clear default', 'PATCH', `/payroll/tax-rules/${five.id}`, payroll, 200, { isDefault: false })
  rows = await expectStatus(baseUrl, 'list without default', 'GET', '/payroll/tax-rules', payroll, 200)
  assert.equal(rows.some((row: JsonRecord) => row.isDefault), false)

  // Profile choices: null, 'none' and active keys; unknown and newly chosen archived keys are refused.
  await expectStatus(baseUrl, 'no tax on a profile', 'POST', `/payroll/config/${noTax.id}`, payroll, 200, { taxRule: 'none' })
  await expectStatus(baseUrl, 'own rule on a profile', 'POST', `/payroll/config/${ownRule.id}`, payroll, 200, { taxRule: 'contractor_10' })
  const refusedUnknown = await expectStatus(baseUrl, 'unknown rule', 'POST', `/payroll/config/${noTax.id}`, payroll, 400, { taxRule: 'flat_99' })
  assert.match(refusedUnknown.error, /Choose a tax rule/)
  await expectStatus(baseUrl, 'employees cannot set their own tax', 'POST', `/payroll/config/${employee.id}`, employee, 403, { taxRule: 'none' })
  await expectStatus(baseUrl, 'archive unused rule', 'PATCH', `/payroll/tax-rules/${none.id}`, payroll, 200, { archived: true })
  const refusedArchived = await expectStatus(baseUrl, 'archived rule newly chosen', 'POST', `/payroll/config/${noTax.id}`, payroll, 400, { taxRule: 'none_2' })
  assert.match(refusedArchived.error, /archived/)
  rows = await expectStatus(baseUrl, 'usage counts', 'GET', '/payroll/tax-rules', payroll, 200)
  assert.equal(byKey(rows, 'contractor_10').inUseCount, 1)

  // Delete: unused only.
  const inUse = await expectStatus(baseUrl, 'delete in use', 'DELETE', `/payroll/tax-rules/${ten.id}`, payroll, 409)
  assert.match(inUse.error, /used by 1 employee/)
  assert.match(inUse.error, /Archive it instead/)
  await expectStatus(baseUrl, 'delete unused', 'DELETE', `/payroll/tax-rules/${none.id}`, payroll, 200)
  return { five, ten }
}

async function runGeneratedPayslips(baseUrl: string, rules: { five: JsonRecord; ten: JsonRecord }) {
  const { payroll, followsDefault, noTax, ownRule } = people
  const bounds = periodBoundsForDays('2031-05-01', '2031-05-31', config.payrollTimezone)
  const period = await prisma.payrollPeriod.create({ data: { startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate, status: 'draft' } })
  const service = new PayrollService()
  const generate = async (userId: string) => {
    const payslip = await service.generatePayslip(period.id, userId)
    const tax = payslip.items.filter((item) => item.type === 'tax')
    return { payslip, tax, types: payslip.items.map((item) => item.type) }
  }
  try {
    // No default rule yet: a profile that follows the default pays no tax (old behaviour).
    let result = await generate(followsDefault.id)
    assert.equal(result.tax.length, 0)
    assert.equal(result.payslip.netPay, 30000)

    // Default rule: applied after the salary and overtime lines, net = gross minus tax.
    await expectStatus(baseUrl, 'default back on', 'PATCH', `/payroll/tax-rules/${rules.five.id}`, payroll, 200, { isDefault: true })
    result = await generate(followsDefault.id)
    assert.deepEqual([...result.types].sort(), ['fixed_salary', 'tax'])
    assert.equal(result.tax[0].description, 'Withholding tax (Withholding 5%, 5%)')
    assert.equal(result.tax[0].amount, -1500)
    assert.deepEqual([result.payslip.grossPay, result.payslip.netPay], [30000, 28500])
    const preview = await service.previewPayslip(followsDefault.id, period.startDate, period.endDate)
    assert.deepEqual(preview.tax, { ruleKey: 'withholding_5', ruleName: 'Withholding 5%', rate: 5, amount: 1500 })

    // Per-employee 'none' overrides the default; a per-employee rule overrides it too.
    result = await generate(noTax.id)
    assert.equal(result.tax.length, 0)
    assert.equal(result.payslip.netPay, 30000)
    result = await generate(ownRule.id)
    assert.equal(result.tax[0].description, 'Withholding tax (Contractors 10%, 10%)')
    assert.equal(result.tax[0].amount, -3333.33)
    assert.equal(result.payslip.netPay, 30000)

    // Rounding, and regeneration recomputes after a rate change.
    await expectStatus(baseUrl, 'rate 7.5', 'PATCH', `/payroll/tax-rules/${rules.ten.id}`, payroll, 200, { rate: 7.5 })
    result = await generate(ownRule.id)
    assert.equal(result.tax[0].amount, -2500, '33333.33 x 7.5% = 2499.99975')
    assert.equal(result.payslip.netPay, 30833.33)

    // An archived rule still applies to the profiles on it.
    await expectStatus(baseUrl, 'archive in use', 'PATCH', `/payroll/tax-rules/${rules.ten.id}`, payroll, 200, { archived: true })
    result = await generate(ownRule.id)
    assert.equal(result.tax[0].description, 'Withholding tax (Contractors 10%, 7.5%)')
    await expectStatus(baseUrl, 'profile keeps its archived rule', 'POST', `/payroll/config/${ownRule.id}`, payroll, 200, { taxRule: 'contractor_10', jobTitle: 'Contractor' })

    // The tax line is editable and removable like any deduction.
    const edits = new PayslipEditService()
    const edited = await edits.editPayslip(result.payslip.id, payroll.id, {
      items: [{ type: 'fixed_salary', description: 'Fixed monthly salary', amount: 33333.33 }],
      note: 'Tax handled outside payroll this month',
    })
    assert.deepEqual([edited?.grossPay, edited?.netPay], [33333.33, 33333.33])
  } finally {
    await prisma.payrollPeriod.delete({ where: { id: period.id } })
  }
}

async function main() {
  runPureTests()
  await runLineOrderTest()
  const savedEmail = emailService.sendPayslipNotification
  ;(emailService as any).sendPayslipNotification = async () => undefined
  const existingRules = await prisma.payrollTaxRule.findMany({ select: { id: true } })
  try {
    await createPeople()
    await withServer(async (baseUrl) => {
      const rules = await runRuleRoutes(baseUrl)
      await runGeneratedPayslips(baseUrl, rules)
    })
  } finally {
    ;(emailService as any).sendPayslipNotification = savedEmail
    await prisma.payrollTaxRule.deleteMany({ where: { id: { notIn: existingRules.map((row) => row.id) } } })
    await prisma.user.deleteMany({ where: { email: { in: Object.values(people).map((person) => person.email) } } })
    clearAccountStatusCache()
  }
  console.log('payroll.tax tests passed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
