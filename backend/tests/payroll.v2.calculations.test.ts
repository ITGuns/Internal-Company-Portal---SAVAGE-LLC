import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
    bucketEntryHoursByDay,
    computeGrossPay,
    getPayrollRateContext,
    normalizePayBasis,
    paidOvertimeHoursForDay,
    parseDateKey,
    payrollDayKey,
    payrollDayWindow,
    payrollPeriodWindow,
    periodCoversDayKey,
    periodFraction,
    roundMoney,
    summarizePayrollHours,
    zonedMidnightUtc,
} from '../src/payroll/payroll.calculations'
import { selectAutoPayslipPeriod } from '../src/scheduler/scheduler.periods'
import {
    assertAdjustmentBounds,
    parseAdjustmentDraft,
    parseRequestHours,
    parseRequestStatus,
    unclaimedOvertimeHours,
} from '../src/payroll/time-requests.service'
import { computePayslipTotals, normalizeEditNote, normalizePayslipItems } from '../src/payroll/payslip-edit.service'
import { canReviewTimeRequests, filterPayrollProfileUpdate } from '../src/payroll/payroll.permissions'
import {
    canLoginApprovedUser,
    getLoginRefusalMessage,
    getOAuthNewUserState,
    INACTIVE_ACCOUNT_MESSAGE,
} from '../src/auth/signup.requests'
import { evaluateAccountState } from '../src/auth/account-status'
import { resolvePayrollTimezone } from '../src/config/env.config'
import { PayrollValidationError } from '../src/payroll/payroll.errors'

/**
 * Payroll and time v2 (docs/payroll-time-v2-spec.md): pure money math, day
 * bucketing, request validation and auth decisions. No database.
 */
const MANILA = 'Asia/Manila'

// ---------------------------------------------------------------------------
// Rule 1: day bucketing in PAYROLL_TIMEZONE, never UTC
// ---------------------------------------------------------------------------
{
    // 2026-07-01 23:30 UTC is already July 2 in Manila (UTC+8).
    assert.equal(payrollDayKey(new Date('2026-07-01T23:30:00Z'), MANILA), '2026-07-02')
    assert.equal(payrollDayKey(new Date('2026-07-01T15:59:00Z'), MANILA), '2026-07-01')
    assert.equal(payrollDayKey(new Date('2026-07-01T16:00:00Z'), MANILA), '2026-07-02')
    assert.equal(payrollDayKey(new Date('2026-07-01T23:30:00Z'), 'UTC'), '2026-07-01')

    assert.equal(zonedMidnightUtc('2026-07-02', MANILA).toISOString(), '2026-07-01T16:00:00.000Z')
    assert.equal(zonedMidnightUtc('2026-07-02', 'UTC').toISOString(), '2026-07-02T00:00:00.000Z')
    // DST zone: New York midnight on 2026-03-08 (DST starts at 02:00) is 05:00 UTC.
    assert.equal(zonedMidnightUtc('2026-03-08', 'America/New_York').toISOString(), '2026-03-08T05:00:00.000Z')
    assert.equal(zonedMidnightUtc('2026-03-09', 'America/New_York').toISOString(), '2026-03-09T04:00:00.000Z')

    const window = payrollDayWindow('2026-12-31', MANILA)
    assert.equal(window.start.toISOString(), '2026-12-30T16:00:00.000Z')
    assert.equal(window.end.toISOString(), '2026-12-31T16:00:00.000Z')

    // Two Manila-evening shifts that straddle UTC midnight land on the same day.
    const buckets = bucketEntryHoursByDay([
        { start: new Date('2026-07-01T10:00:00Z'), duration: 300 }, // 18:00 Manila Jul 1
        { start: new Date('2026-07-01T14:00:00Z'), duration: 240 }, // 22:00 Manila Jul 1
        { start: new Date('2026-07-01T17:00:00Z'), duration: 60 }, // 01:00 Manila Jul 2
    ], MANILA)
    assert.equal(buckets.get('2026-07-01'), 9)
    assert.equal(buckets.get('2026-07-02'), 1)
}

assert.equal(parseDateKey('2026-02-28'), '2026-02-28')
assert.equal(parseDateKey('2026-02-29'), null)
assert.equal(parseDateKey('2024-02-29'), '2024-02-29')
assert.equal(parseDateKey('2026-13-01'), null)
assert.equal(parseDateKey('2026-7-1'), null)
assert.equal(parseDateKey(20260701), null)
assert.throws(() => zonedMidnightUtc('nope', MANILA))

assert.equal(resolvePayrollTimezone({ PAYROLL_TIMEZONE: 'UTC', DAILY_DIGEST_TIMEZONE: MANILA } as NodeJS.ProcessEnv), 'UTC')
assert.equal(resolvePayrollTimezone({ DAILY_DIGEST_TIMEZONE: 'Asia/Tokyo' } as NodeJS.ProcessEnv), 'Asia/Tokyo')
assert.equal(resolvePayrollTimezone({ PAYROLL_TIMEZONE: 'Not/AZone' } as NodeJS.ProcessEnv), MANILA)
assert.equal(resolvePayrollTimezone({} as NodeJS.ProcessEnv), MANILA)

// ---------------------------------------------------------------------------
// Rule 2: paid OT hours = min(approved, actual - cap)
// ---------------------------------------------------------------------------
assert.equal(paidOvertimeHoursForDay(12, 8, 2), 2)
assert.equal(paidOvertimeHoursForDay(12, 8, 10), 4, 'approval above actual overtime is capped at actual')
assert.equal(paidOvertimeHoursForDay(7, 8, 3), 0, 'no overtime when under the cap')
assert.equal(paidOvertimeHoursForDay(10, 8, 0), 0, 'unapproved overtime is unpaid')
assert.equal(paidOvertimeHoursForDay(10, 8, -1), 0)
{
    const summary = summarizePayrollHours(
        new Map([['2026-07-01', 12], ['2026-07-02', 10], ['2026-07-03', 6]]),
        8,
        new Map([['2026-07-01', 6], ['2026-07-03', 2]]),
    )
    assert.equal(summary.totalHours, 28)
    assert.equal(summary.billableHours, 22)
    assert.equal(summary.overtimeHours, 6)
    assert.equal(summary.overtimeApprovedHours, 4) // min(6, 4) on Jul 1; Jul 3 has no overtime
    assert.equal(summary.overtimePendingHours, 2) // Jul 2 overtime not approved
}

assert.equal(unclaimedOvertimeHours(12, 8, 0), 4)
assert.equal(unclaimedOvertimeHours(12, 8, 3), 1)
assert.equal(unclaimedOvertimeHours(12, 8, 6), 0)
assert.equal(unclaimedOvertimeHours(6, 8, 0), 0)

// ---------------------------------------------------------------------------
// Rule 3: pay basis
// ---------------------------------------------------------------------------
assert.equal(normalizePayBasis('fixed_monthly'), 'fixed_monthly')
assert.equal(normalizePayBasis('hourly_rate'), 'hourly_rate')
assert.equal(normalizePayBasis('nonsense'), 'hourly_from_monthly')
assert.equal(normalizePayBasis(null), 'hourly_from_monthly')

{
    // hourly_from_monthly: flat_160_hours -> 1000/h. 80 billable + 4 approved OT at 1.25.
    const ctx = getPayrollRateContext(
        { baseSalary: 160000, payrollScheme: 'flat_160_hours', maxBillableHoursPerDay: 8 },
        new Date(2026, 6, 1), new Date(2026, 6, 15, 23, 59, 59),
    )
    const pay = computeGrossPay({
        payBasis: 'hourly_from_monthly',
        billableHours: 80,
        overtimeApprovedHours: 4,
        monthlySalary: ctx.monthlySalary,
        derivedHourlyRate: ctx.hourlyRate,
        overtimeMultiplier: 1.25,
        periodFraction: 0.5,
    })
    assert.equal(pay.hourlyRate, 1000)
    assert.equal(pay.basePay, 80000)
    assert.equal(pay.overtimeRate, 1250)
    assert.equal(pay.overtimePay, 5000)
    assert.equal(pay.grossPay, 85000)
}
{
    // fixed_monthly: half of the salary for a semi-monthly window, regardless of hours; OT priced from derived rate.
    const pay = computeGrossPay({
        payBasis: 'fixed_monthly',
        billableHours: 12,
        overtimeApprovedHours: 2,
        monthlySalary: 40000,
        derivedHourlyRate: 250,
        overtimeMultiplier: 1.5,
        periodFraction: 0.5,
    })
    assert.equal(pay.basePay, 20000)
    assert.equal(pay.overtimePay, 750)
    assert.equal(pay.grossPay, 20750)
}
{
    // hourly_rate: explicit rate, baseSalary ignored.
    const pay = computeGrossPay({
        payBasis: 'hourly_rate',
        billableHours: 40,
        overtimeApprovedHours: 2,
        monthlySalary: 999999,
        derivedHourlyRate: 999,
        explicitHourlyRate: 300,
        overtimeMultiplier: null,
        periodFraction: 0.5,
    })
    assert.equal(pay.hourlyRate, 300)
    assert.equal(pay.basePay, 12000)
    assert.equal(pay.overtimeRate, 375) // default multiplier 1.25
    assert.equal(pay.grossPay, 12750)
}
{
    // hourly_rate with no rate set is refused instead of silently paying 0.
    for (const explicitHourlyRate of [null, 0, -5]) {
        assert.throws(() => computeGrossPay({
            payBasis: 'hourly_rate',
            billableHours: 10,
            overtimeApprovedHours: 0,
            monthlySalary: 0,
            derivedHourlyRate: 0,
            explicitHourlyRate,
            periodFraction: 1,
        }), PayrollValidationError)
    }
}

// Money rounds half away from zero, same as the frontend editor.
assert.equal(roundMoney(2.345), 2.35)
assert.equal(roundMoney(-2.345), -2.35)
assert.equal(roundMoney(-0.005), -0.01)
assert.equal(roundMoney(-0.004), 0)
assert.equal(Object.is(roundMoney(-0.001), -0), false, 'no negative zero')

// Period windows: whole Manila days, half-open, consecutive periods share one boundary.
{
    const first = payrollPeriodWindow(new Date(2026, 9, 1), new Date(2026, 9, 15, 23, 59, 59), MANILA)
    const second = payrollPeriodWindow(new Date(2026, 9, 16), new Date(2026, 9, 31, 23, 59, 59), MANILA)
    assert.equal(first.start.toISOString(), '2026-09-30T16:00:00.000Z')
    assert.equal(first.end.toISOString(), '2026-10-15T16:00:00.000Z')
    assert.equal(second.start.getTime(), first.end.getTime(), 'no gap and no overlap between halves')
    assert.equal(second.end.toISOString(), '2026-10-31T16:00:00.000Z')
    const period = { startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 15, 23, 59, 59) }
    assert.equal(periodCoversDayKey(period, '2026-10-15'), true)
    assert.equal(periodCoversDayKey(period, '2026-10-16'), false)
}

// periodFraction: semi-monthly halves, whole month, else calendar days / days in start month.
assert.equal(periodFraction(new Date(2026, 1, 1), new Date(2026, 1, 15, 23, 59, 59)), 0.5)
assert.equal(periodFraction(new Date(2026, 1, 16), new Date(2026, 1, 28, 23, 59, 59)), 0.5)
assert.equal(periodFraction(new Date(2026, 0, 16), new Date(2026, 0, 31, 23, 59, 59)), 0.5)
assert.equal(periodFraction(new Date(2026, 6, 1), new Date(2026, 6, 31, 23, 59, 59)), 1)
assert.equal(periodFraction(new Date(2024, 1, 1), new Date(2024, 1, 29, 23, 59, 59)), 1)
assert.equal(periodFraction(new Date(2026, 6, 1), new Date(2026, 6, 7, 23, 59, 59)), 7 / 31)
assert.equal(periodFraction(new Date(2026, 5, 25), new Date(2026, 6, 4, 23, 59, 59)), 10 / 30)
assert.equal(periodFraction(new Date(2026, 6, 10), new Date(2026, 6, 1, 23, 59, 59)), 0)
// Stored UTC-midnight periods (Vercel, before 2026-10-09) read as the same calendar days.
assert.equal(periodFraction(new Date('2026-10-01T00:00:00Z'), new Date('2026-10-15T23:59:59Z')), 0.5)
assert.equal(periodFraction(new Date('2026-09-30T16:00:00Z'), new Date('2026-10-15T15:59:59Z')), 0.5)
{
    const legacy = payrollPeriodWindow(new Date('2026-10-01T00:00:00Z'), new Date('2026-10-15T23:59:59.999Z'), MANILA)
    assert.equal(legacy.start.toISOString(), '2026-09-30T16:00:00.000Z')
    assert.equal(legacy.end.toISOString(), '2026-10-15T16:00:00.000Z')
    const legacyPeriod = { startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-10-15T23:59:59Z') }
    assert.equal(periodCoversDayKey(legacyPeriod, '2026-10-15'), true)
    assert.equal(periodCoversDayKey(legacyPeriod, '2026-10-16'), false)
}

// ---------------------------------------------------------------------------
// Rule 8: scheduler picks the most recently ENDED draft period
// ---------------------------------------------------------------------------
{
    const now = new Date('2026-07-20T00:00:00Z')
    const periods = [
        { id: 'open', status: 'draft', endDate: new Date('2026-07-31T23:59:59Z') },
        { id: 'ended-latest', status: 'draft', endDate: new Date('2026-07-15T23:59:59Z') },
        { id: 'ended-older', status: 'draft', endDate: new Date('2026-06-30T23:59:59Z') },
        { id: 'processed', status: 'processed', endDate: new Date('2026-07-16T00:00:00Z') },
    ]
    assert.equal(selectAutoPayslipPeriod(periods, now)?.id, 'ended-latest')
    assert.equal(selectAutoPayslipPeriod([periods[0]], now), null, 'an open period is never selected')
    assert.equal(selectAutoPayslipPeriod([], now), null)
}

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------
assert.equal(parseRequestHours(2.5), 2.5)
assert.equal(parseRequestHours('3'), 3)
for (const bad of [0, -1, 25, 'abc', null]) {
    assert.throws(() => parseRequestHours(bad), PayrollValidationError)
}
assert.equal(parseRequestStatus(undefined), undefined)
assert.equal(parseRequestStatus('all'), undefined)
assert.equal(parseRequestStatus('approved'), 'approved')
assert.throws(() => parseRequestStatus('done'), PayrollValidationError)

const JULY_2 = new Date('2026-07-02T00:00:00Z')
{
    const create = parseAdjustmentDraft({
        action: 'create',
        proposedStart: '2026-07-01T01:00:00Z',
        proposedEnd: '2026-07-01T09:00:00Z',
        reason: 'Forgot to clock in',
    }, JULY_2)
    assert.equal(create.action, 'create')
    assert.equal(create.timeEntryId, null)

    const update = parseAdjustmentDraft({ timeEntryId: 'te_1', proposedEnd: '2026-07-01T09:00:00Z', reason: 'Left late' }, JULY_2)
    assert.equal(update.action, 'update', 'action defaults to update')
    assert.equal(update.proposedStart, null)

    const remove = parseAdjustmentDraft({ action: 'delete', timeEntryId: 'te_1', proposedStart: '2026-07-01T01:00:00Z', reason: 'Duplicate' }, JULY_2)
    assert.equal(remove.proposedStart, null, 'delete ignores proposed times')

    assert.throws(() => parseAdjustmentDraft({ action: 'create', proposedStart: '2026-07-01T01:00:00Z', reason: 'x' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ action: 'create', timeEntryId: 'te_1', proposedStart: '2026-07-01T01:00:00Z', proposedEnd: '2026-07-01T02:00:00Z', reason: 'x' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ action: 'update', reason: 'x', proposedEnd: '2026-07-01T09:00:00Z' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ action: 'update', timeEntryId: 'te_1', reason: 'x' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ action: 'update', timeEntryId: 'te_1', proposedStart: '2026-07-01T09:00:00Z', proposedEnd: '2026-07-01T08:00:00Z', reason: 'x' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ timeEntryId: 'te_1', proposedEnd: '2026-07-01T09:00:00Z', reason: '   ' }, JULY_2), PayrollValidationError)
    assert.throws(() => parseAdjustmentDraft({ action: 'move', timeEntryId: 'te_1', reason: 'x' }, JULY_2), PayrollValidationError)

    // Bounds: at most 24 hours long, not in the future, not older than 60 days.
    const draftCreate = (proposedStart: string, proposedEnd: string) =>
        () => parseAdjustmentDraft({ action: 'create', proposedStart, proposedEnd, reason: 'x' }, JULY_2)
    assert.doesNotThrow(draftCreate('2026-07-01T00:00:00Z', '2026-07-02T00:00:00Z'), 'exactly 24 hours is allowed')
    assert.throws(draftCreate('2026-06-30T23:00:00Z', '2026-07-02T00:00:00Z'), /at most 24 hours/)
    assert.throws(draftCreate('2026-07-01T23:00:00Z', '2026-07-02T01:00:00Z'), /future/)
    assert.throws(draftCreate('2026-05-01T01:00:00Z', '2026-05-01T09:00:00Z'), /60 days/)
    assert.throws(() => parseAdjustmentDraft({ timeEntryId: 'te_1', proposedEnd: '2026-07-03T09:00:00Z', reason: 'x' }, JULY_2), /future/)
    assert.doesNotThrow(() => parseAdjustmentDraft({ action: 'delete', timeEntryId: 'te_1', reason: 'old entry' }, JULY_2))
    assert.doesNotThrow(() => assertAdjustmentBounds(null, null, JULY_2))
    assert.throws(() => parseAdjustmentDraft({ timeEntryId: 'te_1', proposedEnd: '2026-07-01T09:00:00Z', reason: 'x'.repeat(501) }, JULY_2), /500/)
}

// ---------------------------------------------------------------------------
// Rule 5: payslip edit recompute
// ---------------------------------------------------------------------------
{
    const items = normalizePayslipItems([
        { type: 'regular_hours', description: 'Billable work hours', amount: 20000 },
        { type: 'overtime_approved', description: 'Approved overtime', amount: 1250.555 },
        { type: 'overtime_pending', description: 'Pending overtime', amount: 999 },
        { type: 'allowance', description: 'Internet', amount: 1000 },
        { type: 'deduction', description: 'Tax', amount: 1500 },
        { type: 'adjustment', description: 'Correction', amount: -200 },
    ])
    assert.equal(items[1].amount, 1250.56, 'amounts round to cents')
    assert.equal(items[2].amount, 0, 'pending overtime is informational')
    assert.equal(items[4].amount, -1500, 'deductions are stored negative')
    assert.deepEqual(computePayslipTotals(items), { grossPay: 22050.56, netPay: 20550.56 })
    assert.throws(() => normalizePayslipItems([]), PayrollValidationError)
    assert.throws(() => normalizePayslipItems([{ type: 'earning', description: 'x', amount: 1 }]), PayrollValidationError)
    assert.throws(() => normalizePayslipItems([{ type: 'allowance', description: '', amount: 1 }]), PayrollValidationError)
    assert.throws(() => normalizePayslipItems([{ type: 'allowance', description: 'x', amount: 'abc' }]), PayrollValidationError)
    assert.equal(normalizeEditNote('  Fixed rate  '), 'Fixed rate')
    assert.throws(() => normalizeEditNote(''), PayrollValidationError)
    assert.throws(() => normalizeEditNote(undefined), PayrollValidationError)
    assert.equal(normalizeEditNote('n'.repeat(500)).length, 500)
    assert.throws(() => normalizeEditNote('n'.repeat(501)), PayrollValidationError, 'note limit matches the frontend (500)')
}

// ---------------------------------------------------------------------------
// Permissions and profile fields
// ---------------------------------------------------------------------------
assert.equal(canReviewTimeRequests([{ role: 'Project Manager' }]), true, 'management reviews')
assert.equal(canReviewTimeRequests([{ role: 'Bookkeeping' }]), true, 'payroll reviews')
assert.equal(canReviewTimeRequests([{ role: 'Operations Manager' }]), true)
assert.equal(canReviewTimeRequests([{ role: 'Frontend Developer' }]), false)
assert.equal(canReviewTimeRequests([], true), true, 'ADMIN_EMAILS bypass')
assert.deepEqual(
    filterPayrollProfileUpdate({ payBasis: 'hourly_rate', hourlyRate: 300, overtimeMultiplier: 1.5 }, { isPrivileged: true }).data,
    { payBasis: 'hourly_rate', hourlyRate: 300, overtimeMultiplier: 1.5 },
)
assert.deepEqual(
    filterPayrollProfileUpdate({ payBasis: 'hourly_rate', hourlyRate: 300, overtimeMultiplier: 3 }, { isPrivileged: false }).rejectedFields,
    ['payBasis', 'hourlyRate', 'overtimeMultiplier'],
)

// ---------------------------------------------------------------------------
// Rules 6 and 7: inactive users and OAuth sign-ups
// ---------------------------------------------------------------------------
assert.equal(canLoginApprovedUser({ status: 'inactive', isApproved: true }), false)
assert.equal(canLoginApprovedUser({ status: 'active', isApproved: true }), true)
assert.equal(getLoginRefusalMessage({ status: 'inactive', isApproved: true }), INACTIVE_ACCOUNT_MESSAGE)
assert.equal(getLoginRefusalMessage({ status: 'pending', isApproved: false }), 'Account pending approval')
assert.deepEqual(evaluateAccountState({ status: 'active', isApproved: true }), { ok: true })
assert.deepEqual(evaluateAccountState({ status: 'inactive', isApproved: true }), { ok: false, httpStatus: 403, message: INACTIVE_ACCOUNT_MESSAGE })
assert.deepEqual(evaluateAccountState(null), { ok: false, httpStatus: 401, message: 'User no longer exists' })
assert.deepEqual(getOAuthNewUserState(false), { status: 'pending', isApproved: false })
assert.deepEqual(getOAuthNewUserState(true), { status: 'verified', isApproved: true })

const srcRoot = path.resolve(__dirname, '..', 'src')
const googleStrategySource = fs.readFileSync(path.join(srcRoot, 'auth', 'strategies', 'google.strategy.ts'), 'utf8')
assert.ok(googleStrategySource.includes('getOAuthNewUserState(isAdminEmail(email))'), 'Google sign-up uses the pending default')
assert.ok(!/status:\s*'verified',\s*\n\s*isApproved:\s*true/.test(googleStrategySource), 'Google sign-up no longer auto-approves')

// Migration matches the schema additions.
const migrationSql = fs.readFileSync(
    path.resolve(__dirname, '..', 'prisma', 'migrations', '202610080001_payroll_time_v2', 'migration.sql'),
    'utf8',
)
for (const fragment of [
    'CREATE TABLE "OvertimeRequest"',
    'CREATE TABLE "TimeEntryAdjustmentRequest"',
    '"payBasis" TEXT NOT NULL DEFAULT \'hourly_from_monthly\'',
    '"overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25',
    '"editedById" TEXT',
]) {
    assert.ok(migrationSql.includes(fragment), `migration contains ${fragment}`)
}

console.log('payroll.v2.calculations tests passed')
