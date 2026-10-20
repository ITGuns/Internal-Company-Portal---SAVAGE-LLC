import assert from 'node:assert/strict'
import { prisma } from '../src/database/prisma.service'
import { config } from '../src/config/env.config'
import { emailService } from '../src/email/email.service'
import { PayrollService } from '../src/payroll/payroll.service'
import { PayrollValidationError } from '../src/payroll/payroll.errors'
import { getPayrollRateContext, periodBoundsForDays, zonedMidnightUtc } from '../src/payroll/payroll.calculations'
import {
  BUILT_IN_PAYROLL_SCHEMES,
  creditedHoursCap,
  PayrollSchemeDefinition,
  resolvePayrollScheme,
  schemeDivisor,
  splitCreditedHours,
  uncreditedHoursDescription,
} from '../src/payroll/payroll-schemes'
import {
  nextFreeKey,
  parseDefaultFlag,
  parseOptionFields,
  parseSchemeFields,
  slugifySchemeKey,
} from '../src/payroll/payroll-options.validation'

/**
 * Salary divisor schemes as data (2026-10-20): the pure helpers, the input
 * rules, and the pay a scheme row produces on a generated payslip. Prisma is
 * stubbed and the scheme list is injected, so no database is needed.
 */

const MANILA = 'Asia/Manila'
const TWENTY_TWO: PayrollSchemeDefinition = BUILT_IN_PAYROLL_SCHEMES.find((s) => s.key === 'fixed_22_days')!

/** The divisor of a rate context: days or hours, whichever the scheme uses. */
function divisorOf(ctx: ReturnType<typeof getPayrollRateContext>) {
  return 'divisorHours' in ctx ? { hours: ctx.divisorHours } : { days: ctx.divisorDays }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function runPureHelperTests() {
  // Legacy key resolution: built-in keys keep their row, unknown keys get the default.
  assert.equal(resolvePayrollScheme('flat_30').scheme.key, 'flat_30')
  assert.equal(resolvePayrollScheme('flat_30').known, true)
  const unknown = resolvePayrollScheme('flat_31')
  assert.deepEqual([unknown.scheme.key, unknown.known], ['fixed_22_days', false])
  assert.equal(resolvePayrollScheme(undefined).scheme.key, 'fixed_22_days')
  // A list with its own default wins over the built-in default.
  const rows: PayrollSchemeDefinition[] = [
    { key: 'weekdays', name: 'Weekdays of month', kind: 'weekdays', value: null, maxCreditedDays: null },
    { key: 'flat_24_days', name: 'Flat 24 days', kind: 'fixed_days', value: 24, maxCreditedDays: null, isDefault: true },
  ]
  assert.equal(resolvePayrollScheme('gone', rows).scheme.key, 'flat_24_days')
  assert.equal(resolvePayrollScheme(' weekdays ', rows).scheme.key, 'weekdays', 'keys are trimmed')

  // Divisors: days for weekdays and fixed_days, hours for fixed_hours, weekdays when a value is missing.
  assert.deepEqual(schemeDivisor({ kind: 'fixed_days', value: 22 }, 23), { unit: 'days', value: 22 })
  assert.deepEqual(schemeDivisor({ kind: 'fixed_hours', value: 160 }, 23), { unit: 'hours', value: 160 })
  assert.deepEqual(schemeDivisor({ kind: 'weekdays', value: null }, 23), { unit: 'days', value: 23 })
  assert.deepEqual(schemeDivisor({ kind: 'fixed_days', value: 0 }, 21), { unit: 'days', value: 21 }, 'bad data never divides by 0')

  // Credited hours cap: days x daily cap x period fraction, 2 decimals.
  assert.equal(creditedHoursCap(22, 8, 1), 176)
  assert.equal(creditedHoursCap(22, 8, 0.5), 88)
  assert.equal(creditedHoursCap(21.75, 8, 16 / 31), 89.81)
  assert.equal(creditedHoursCap(null, 8, 1), null)
  assert.equal(creditedHoursCap(0, 8, 1), null)

  // The brief's case: 23 weekdays x 8 h = 184 billable, 176 credited, 8 uncredited.
  assert.deepEqual(splitCreditedHours(23 * 8, creditedHoursCap(22, 8, 1)), {
    creditedHours: 176,
    uncreditedHours: 8,
    creditedHoursCap: 176,
  })
  assert.deepEqual(splitCreditedHours(100, 176), { creditedHours: 100, uncreditedHours: 0, creditedHoursCap: 176 })
  assert.deepEqual(splitCreditedHours(176.004, 176), { creditedHours: 176.004, uncreditedHours: 0, creditedHoursCap: 176 }, 'sub-cent overruns stay credited')
  assert.deepEqual(splitCreditedHours(190, null), { creditedHours: 190, uncreditedHours: 0, creditedHoursCap: null })
  assert.equal(uncreditedHoursDescription(22, 8), 'Beyond 22 credited days, not paid (8 h)')
  assert.equal(uncreditedHoursDescription(21.75, 4.5), 'Beyond 21.75 credited days, not paid (4.5 h)')

  // Rate context reads the row: fixed_days divides by value days, fixed_hours by value hours.
  const july = periodBoundsForDays('2026-07-01', '2026-07-31', MANILA)
  const twentyTwo = getPayrollRateContext({ baseSalary: 22000, maxBillableHoursPerDay: 8 }, july.start, july.end, TWENTY_TWO)
  assert.deepEqual(divisorOf(twentyTwo), { days: 22 })
  assert.equal(twentyTwo.dailyRate, 1000)
  assert.equal(twentyTwo.hourlyRate, 125)
  assert.equal(twentyTwo.payrollScheme, 'fixed_22_days')
  assert.equal(twentyTwo.payrollSchemeName, '22 credited days')
  assert.equal(twentyTwo.payrollSchemeLabel, '22 credited days', 'old field kept for older clients')
  assert.equal(twentyTwo.maxCreditedDays, 22)
  const hours = getPayrollRateContext(
    { baseSalary: 26000, maxBillableHoursPerDay: 8 },
    july.start,
    july.end,
    { key: 'flat_173_hours', name: 'Flat 173.33 hours', kind: 'fixed_hours', value: 173.33, maxCreditedDays: null },
  )
  assert.deepEqual(divisorOf(hours), { hours: 173.33 })
  assert.equal(Math.round(hours.hourlyRate * 100) / 100, 150)
  assert.equal(hours.dailyRate, hours.hourlyRate * 8)
  // Without a row the profile key is resolved against the built-in list (legacy math unchanged).
  const legacy = getPayrollRateContext({ baseSalary: 23000, payrollScheme: 'weekdays', maxBillableHoursPerDay: 8 }, july.start, july.end)
  assert.deepEqual(divisorOf(legacy), { days: 23 })
  assert.equal(legacy.dailyRate, 1000)
}

// ---------------------------------------------------------------------------
// Input rules (shared messages with the frontend)
// ---------------------------------------------------------------------------
function runValidationTests() {
  const created = parseSchemeFields({ name: '  Flat   24 days ', kind: 'fixed_days', value: '24' }, undefined, 5)
  assert.deepEqual(created, { name: 'Flat 24 days', kind: 'fixed_days', value: 24, maxCreditedDays: null, sortOrder: 5 })
  assert.equal(parseSchemeFields({ name: 'Weekdays capped', kind: 'weekdays', value: 30, maxCreditedDays: 22 }).value, null, 'weekdays never stores a value')
  assert.equal(parseSchemeFields({ name: 'Avg month', kind: 'fixed_days', value: 21.75 }).value, 21.75, 'decimal days are allowed')

  const rejects = (input: Record<string, unknown>, pattern: RegExp, label: string) =>
    assert.throws(() => parseSchemeFields(input), (error: unknown) => error instanceof PayrollValidationError && pattern.test(error.message), label)
  rejects({ name: 'X', kind: 'weekdays' }, /2 to 60 characters/, 'name too short')
  rejects({ name: 'a'.repeat(61), kind: 'weekdays' }, /2 to 60 characters/, 'name too long')
  rejects({ name: 'Monthly', kind: 'monthly' }, /Choose how the salary is divided/, 'unknown kind')
  rejects({ name: 'Flat days', kind: 'fixed_days' }, /days the monthly salary is divided by/, 'fixed_days needs a value')
  rejects({ name: 'Flat days', kind: 'fixed_days', value: 0 }, /from 10 to 31/, 'value must be above 0')
  rejects({ name: 'Flat days', kind: 'fixed_days', value: 2.2 }, /from 10 to 31/, 'a 2.2 for 22 typo is refused')
  rejects({ name: 'Flat days', kind: 'fixed_days', value: 32 }, /from 10 to 31/, 'days cap')
  rejects({ name: 'Flat hours', kind: 'fixed_hours', value: -1 }, /hours the monthly salary is divided by/, 'hours above 0')
  rejects({ name: 'Flat hours', kind: 'fixed_hours', value: 16 }, /from 40 to 744/, 'a 16 for 160 typo is refused')
  rejects({ name: 'Flat hours', kind: 'fixed_hours', value: 745 }, /from 40 to 744/, 'hours cap')
  rejects({ name: 'Capped', kind: 'weekdays', maxCreditedDays: 0 }, /between 1 and 31/, 'credited days floor')
  rejects({ name: 'Capped', kind: 'weekdays', maxCreditedDays: 32 }, /between 1 and 31/, 'credited days ceiling')
  rejects({ name: 'Sorted', kind: 'weekdays', sortOrder: 1.5 }, /whole number/, 'sort order is an integer')

  // PATCH keeps what was not sent; switching to a fixed kind needs a value again.
  const current = { name: 'Flat 24 days', kind: 'fixed_days' as const, value: 24, maxCreditedDays: 22, sortOrder: 3 }
  assert.deepEqual(parseSchemeFields({ name: 'Flat 24 working days' }, current), { ...current, name: 'Flat 24 working days' })
  assert.equal(parseSchemeFields({ maxCreditedDays: '' }, current).maxCreditedDays, null, 'empty clears the cap')
  assert.equal(parseSchemeFields({ kind: 'weekdays' }, current).value, null)
  assert.throws(() => parseSchemeFields({ kind: 'fixed_hours' }, current), /hours the monthly salary/)

  // Options: value defaults to the label and is locked afterwards.
  assert.deepEqual(parseOptionFields({ label: 'Probationary' }, undefined, 4), { value: 'Probationary', label: 'Probationary', sortOrder: 4 })
  assert.deepEqual(parseOptionFields({ label: 'Project based', value: 'Project' }), { value: 'Project', label: 'Project based', sortOrder: 0 })
  const option = { value: 'Contractor', label: 'Contractor / Freelance', sortOrder: 2 }
  assert.equal(parseOptionFields({ label: 'Freelance contractor' }, option).value, 'Contractor')
  assert.throws(() => parseOptionFields({ value: 'Freelance' }, option), /cannot change/)
  assert.doesNotThrow(() => parseOptionFields({ value: 'Contractor' }, option), 'sending the same value is fine')
  assert.throws(() => parseOptionFields({ label: ' ' }), /2 to 60 characters/)

  assert.equal(parseDefaultFlag(true), true)
  assert.equal(parseDefaultFlag(undefined), undefined)
  assert.throws(() => parseDefaultFlag(false), /set another item as the default/)

  assert.equal(slugifySchemeKey('Flat 24 days'), 'flat_24_days')
  assert.equal(slugifySchemeKey('  22 credited days!! '), '22_credited_days')
  assert.equal(slugifySchemeKey('***'), 'scheme')
  assert.equal(nextFreeKey('flat_24_days', new Set(['flat_24_days', 'flat_24_days_2'])), 'flat_24_days_3')
  assert.equal(nextFreeKey('weekly', new Set(['weekdays'])), 'weekly')
}

// ---------------------------------------------------------------------------
// Generated payslips use the scheme row
// ---------------------------------------------------------------------------
type Stubs = Array<[any, string, any]>

async function withStubs(stubs: Stubs, run: () => Promise<void>) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    await run()
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

function inRange(value: Date, range: any): boolean {
  return (!range?.gte || value >= range.gte) && (!range?.lt || value < range.lt) && (!range?.lte || value <= range.lte)
}

/** One 8 h entry (09:00 to 17:00 Manila) on a payroll day. */
function shift(key: string) {
  return { start: new Date(zonedMidnightUtc(key, MANILA).getTime() + 9 * 3_600_000), duration: 480 }
}

/** An 8 h entry on every weekday of a month ("2026-07": 23 days, 184 h). */
function weekdayEntries(month: string, days: number) {
  const entries: Array<{ start: Date; duration: number }> = []
  for (let day = 1; day <= days; day++) {
    const key = `${month}-${String(day).padStart(2, '0')}`
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) entries.push(shift(key))
  }
  return entries
}

const julyWeekdayEntries = () => weekdayEntries('2026-07', 31)

interface Scenario {
  profile: Record<string, unknown>
  scheme: PayrollSchemeDefinition
  overrides?: { hoursWorked?: number }
}

async function generate({ profile, scheme, overrides }: Scenario) {
  const bounds = periodBoundsForDays('2026-07-01', '2026-07-31', MANILA)
  const period = { id: 'per-july', status: 'draft', startDate: bounds.start, endDate: bounds.end, payDate: bounds.payDate }
  const entries = julyWeekdayEntries()
  assert.equal(entries.length, 23, 'July 2026 has 23 weekdays')
  const created: any[] = []
  const resolved: unknown[] = []
  await withStubs([
    [prisma.payrollPeriod, 'findUnique', async () => period],
    [prisma.payslip, 'findFirst', async () => null],
    [prisma.payslip, 'create', async (args: any) => { created.push(args.data); return { id: 'ps-july', ...args.data } }],
    [prisma.employeeProfile, 'findUnique', async () => ({ userId: 'u1', currency: 'PHP', maxBillableHoursPerDay: 8, ...profile })],
    [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((entry) => inRange(entry.start, args.where.start))],
    [prisma.dailyLog, 'findMany', async () => []],
    [prisma.overtimeRequest, 'findMany', async () => []],
    [prisma.user, 'findUnique', async () => null],
    [emailService, 'sendPayslipNotification', async () => undefined],
  ], async () => {
    const service = new PayrollService()
    ;(service as any).options = {
      resolveScheme: async (key: unknown) => {
        resolved.push(key)
        return resolvePayrollScheme(key, [scheme]).scheme
      },
    }
    await service.generatePayslip('per-july', 'u1', overrides)
  })
  const items = created[0].items.create as Array<{ type: string; description: string; amount: number }>
  return { payslip: created[0], items, byType: (type: string) => items.find((item) => item.type === type), resolved }
}

async function runGeneratedPayslipTests() {
  config.payrollTimezone = MANILA

  // hourly_from_monthly on 22 credited days: 184 billable h, 176 paid at 22000 / 22 / 8 = 125.
  const capped = await generate({
    profile: { payBasis: 'hourly_from_monthly', baseSalary: 22000, payrollScheme: 'fixed_22_days' },
    scheme: TWENTY_TWO,
  })
  assert.deepEqual(capped.resolved, ['fixed_22_days'], 'the profile key is resolved through the scheme list')
  assert.equal(capped.byType('regular_hours')?.amount, 22000, '176 credited h x 125')
  assert.equal(
    capped.byType('regular_hours')?.description,
    'Billable work hours (176 h credited, 184 h billable, 184 h tracked) - 22 credited days',
  )
  assert.deepEqual(capped.byType('uncredited_hours'), {
    type: 'uncredited_hours',
    description: 'Beyond 22 credited days, not paid (8 h)',
    amount: 0,
  })
  assert.equal(capped.byType('overtime_pending'), undefined, 'uncredited hours are not overtime')
  assert.equal(capped.payslip.grossPay, 22000)
  assert.equal(capped.items.map((item) => item.type).join(','), 'regular_hours,uncredited_hours')

  // hourly_rate: the scheme's divisor is not used, but its credited-days cap is.
  const hourly = await generate({
    profile: { payBasis: 'hourly_rate', hourlyRate: 100, baseSalary: 0, payrollScheme: 'fixed_22_days' },
    scheme: TWENTY_TWO,
  })
  assert.equal(hourly.byType('regular_hours')?.amount, 17600, '176 h x 100')
  assert.match(hourly.byType('regular_hours')?.description ?? '', / - Hourly rate, 22 credited days$/)
  assert.equal(hourly.byType('uncredited_hours')?.description, 'Beyond 22 credited days, not paid (8 h)')

  // fixed_monthly pays the salary whatever the hours: no cap, no uncredited line.
  const fixed = await generate({
    profile: { payBasis: 'fixed_monthly', baseSalary: 30000, payrollScheme: 'fixed_22_days' },
    scheme: TWENTY_TWO,
  })
  assert.equal(fixed.byType('fixed_salary')?.amount, 30000)
  assert.equal(fixed.byType('uncredited_hours'), undefined)

  // A legacy scheme without a cap pays every billable hour (old behaviour).
  const weekdays = BUILT_IN_PAYROLL_SCHEMES.find((s) => s.key === 'weekdays')!
  const legacy = await generate({
    profile: { payBasis: 'hourly_from_monthly', baseSalary: 23000, payrollScheme: 'weekdays' },
    scheme: weekdays,
  })
  assert.equal(legacy.byType('regular_hours')?.amount, 23000, '184 h x 23000 / 23 / 8')
  assert.equal(legacy.byType('regular_hours')?.description, 'Billable work hours (184 h billable, 184 h tracked) - Weekdays of month')
  assert.equal(legacy.byType('uncredited_hours'), undefined)

  // hourly_rate on an uncapped scheme keeps the old wording.
  const hourlyLegacy = await generate({
    profile: { payBasis: 'hourly_rate', hourlyRate: 100, payrollScheme: 'weekdays' },
    scheme: weekdays,
  })
  assert.equal(hourlyLegacy.byType('regular_hours')?.description, 'Billable work hours (184 h billable, 184 h tracked) - Hourly rate')
  assert.equal(hourlyLegacy.byType('regular_hours')?.amount, 18400)

  // A renamed row shows its new name on the next payslip.
  const renamed = await generate({
    profile: { payBasis: 'hourly_from_monthly', baseSalary: 22000, payrollScheme: 'fixed_22_days' },
    scheme: { ...TWENTY_TWO, name: 'Payroll rule: 22 days' },
  })
  assert.match(renamed.byType('regular_hours')?.description ?? '', / - Payroll rule: 22 days$/)
  assert.equal(renamed.byType('uncredited_hours')?.description, 'Beyond 22 credited days, not paid (8 h)')

  // Hand-entered hours replace the regular line and drop the uncredited note.
  const manual = await generate({
    profile: { payBasis: 'hourly_from_monthly', baseSalary: 22000, payrollScheme: 'fixed_22_days' },
    scheme: TWENTY_TWO,
    overrides: { hoursWorked: 184 },
  })
  assert.equal(manual.byType('regular_hours')?.amount, 23000, '184 h x 125, the admin decides')
  assert.equal(manual.byType('uncredited_hours'), undefined)
}

async function runPreviewTest() {
  config.payrollTimezone = MANILA
  const bounds = periodBoundsForDays('2026-07-01', '2026-07-31', MANILA)
  const entries = julyWeekdayEntries()
  await withStubs([
    [prisma.employeeProfile, 'findUnique', async () => ({
      userId: 'u1', payBasis: 'hourly_from_monthly', baseSalary: 22000, maxBillableHoursPerDay: 8, payrollScheme: 'fixed_22_days',
    })],
    [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((entry) => inRange(entry.start, args.where.start))],
    [prisma.dailyLog, 'findMany', async () => []],
    [prisma.overtimeRequest, 'findMany', async () => []],
  ], async () => {
    const service = new PayrollService()
    ;(service as any).options = { resolveScheme: async () => TWENTY_TWO }
    const preview = await service.previewPayslip('u1', bounds.start, bounds.end)
    assert.equal(preview.billableHours, 184)
    assert.equal(preview.creditedHours, 176)
    assert.equal(preview.uncreditedHours, 8)
    assert.equal(preview.creditedHoursCap, 176)
    assert.equal(preview.maxCreditedDays, 22)
    assert.equal(preview.payrollSchemeName, '22 credited days')
    assert.equal(preview.basePay, 22000)
    assert.equal(preview.grossPay, 22000)
  })
}

/**
 * maxCreditedDays counts per calendar month. March 2026 has 22 weekdays split
 * 10 / 12 between the semi-monthly halves: full attendance loses nothing, a
 * worked Saturday is the only uncredited time. (Cut by the month share, the
 * 16 to 31 half would have capped at 88 h and dropped 8 h of a 22-day month.)
 */
async function runSemiMonthlyCapTest() {
  config.payrollTimezone = MANILA
  const firstHalf = periodBoundsForDays('2026-03-01', '2026-03-15', MANILA)
  const secondHalf = periodBoundsForDays('2026-03-16', '2026-03-31', MANILA)
  const preview = async (bounds: { start: Date; end: Date }, entries: Array<{ start: Date; duration: number }>) => {
    let result: Awaited<ReturnType<PayrollService['previewPayslip']>> | undefined
    await withStubs([
      [prisma.employeeProfile, 'findUnique', async () => ({
        userId: 'u1', payBasis: 'hourly_from_monthly', baseSalary: 22000, maxBillableHoursPerDay: 8, payrollScheme: 'fixed_22_days',
      })],
      [prisma.timeEntry, 'findMany', async (args: any) => entries.filter((entry) => inRange(entry.start, args.where.start))],
      [prisma.dailyLog, 'findMany', async () => []],
      [prisma.overtimeRequest, 'findMany', async () => []],
    ], async () => {
      const service = new PayrollService()
      ;(service as any).options = { resolveScheme: async () => TWENTY_TWO }
      result = await service.previewPayslip('u1', bounds.start, bounds.end)
    })
    return result!
  }

  const march = weekdayEntries('2026-03', 31)
  assert.equal(march.length, 22, 'March 2026 has 22 weekdays')
  const first = await preview(firstHalf, march)
  assert.deepEqual([first.billableHours, first.creditedHours, first.uncreditedHours, first.creditedHoursCap], [80, 80, 0, 176])
  const second = await preview(secondHalf, march)
  assert.deepEqual([second.billableHours, second.creditedHours, second.uncreditedHours, second.creditedHoursCap], [96, 96, 0, 96])
  assert.equal(first.basePay + second.basePay, 22000, 'the two halves pay the monthly salary')

  const withSaturday = await preview(secondHalf, [...march, shift('2026-03-21')])
  assert.deepEqual([withSaturday.billableHours, withSaturday.creditedHours, withSaturday.uncreditedHours], [104, 96, 8])

  // Time off early in the month leaves room later: 8 weekdays first, then 12 plus a Saturday.
  const lighter = march.filter((entry) => !['2026-03-12', '2026-03-13'].some((key) => entry.start.getTime() === shift(key).start.getTime()))
  const catchUp = await preview(secondHalf, [...lighter, shift('2026-03-21')])
  assert.deepEqual([catchUp.creditedHours, catchUp.uncreditedHours, catchUp.creditedHoursCap], [104, 0, 112])

  // A period across two months keeps the month share of the cap.
  const across = periodBoundsForDays('2026-03-16', '2026-04-15', MANILA)
  const spanning = await preview(across, march)
  assert.equal(spanning.creditedHoursCap, Math.round(22 * 8 * (31 / 31) * 100) / 100)
}

async function main() {
  const savedTimezone = config.payrollTimezone
  try {
    runPureHelperTests()
    runValidationTests()
    await runGeneratedPayslipTests()
    await runPreviewTest()
    await runSemiMonthlyCapTest()
  } finally {
    config.payrollTimezone = savedTimezone
  }
  console.log('payroll.schemes tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
