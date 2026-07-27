import assert from 'node:assert/strict'
import { PayrollService } from '../src/payroll/payroll.service'

/**
 * Characterization tests for the payroll money math.
 *
 * These pin the calculation helpers that turn a compensation profile + tracked
 * hours into billable hours, overtime, rates, and gross pay. They are the
 * "silently pays the wrong amount" surface, so the goal here is regression
 * safety: lock in the current, correct behavior.
 *
 * The math lives in private methods on PayrollService. The service constructor
 * only wires the (lazy) Prisma singleton, so instantiating it touches no
 * database, and these helpers are pure — no query is issued. We reach the
 * private methods through an `any` cast intentionally; if the internal shape is
 * refactored into a dedicated module later, retarget these asserts at it.
 */
const service = new PayrollService() as any

// ---------------------------------------------------------------------------
// normalizePayrollScheme — only the four known schemes survive; else default.
// ---------------------------------------------------------------------------
assert.equal(service.normalizePayrollScheme('weekdays'), 'weekdays')
assert.equal(service.normalizePayrollScheme('flat_30'), 'flat_30')
assert.equal(service.normalizePayrollScheme('flat_20'), 'flat_20')
assert.equal(service.normalizePayrollScheme('flat_160_hours'), 'flat_160_hours')
assert.equal(service.normalizePayrollScheme('nonsense'), 'weekdays')
assert.equal(service.normalizePayrollScheme(undefined), 'weekdays')
assert.equal(service.normalizePayrollScheme(null), 'weekdays')

// ---------------------------------------------------------------------------
// normalizePositiveNumber — positive numbers pass; non-positive/invalid fall back.
// ---------------------------------------------------------------------------
assert.equal(service.normalizePositiveNumber(10, 8), 10)
assert.equal(service.normalizePositiveNumber('7.5', 8), 7.5)
assert.equal(service.normalizePositiveNumber(0, 8), 8)
assert.equal(service.normalizePositiveNumber(-5, 8), 8)
assert.equal(service.normalizePositiveNumber('abc', 8), 8)
assert.equal(service.normalizePositiveNumber(undefined, 8), 8)
assert.equal(service.normalizePositiveNumber(null, 8), 8)

// ---------------------------------------------------------------------------
// getWeekdaysInMonth — Mon–Fri count, excluding Sat/Sun. Covers leap February.
// ---------------------------------------------------------------------------
assert.equal(service.getWeekdaysInMonth(new Date(2026, 1, 14)), 20) // Feb 2026 (28d, starts Sun)
assert.equal(service.getWeekdaysInMonth(new Date(2024, 1, 14)), 21) // Feb 2024 (leap, 29d)
assert.equal(service.getWeekdaysInMonth(new Date(2026, 2, 14)), 22) // Mar 2026 (31d, starts Sun)

// ---------------------------------------------------------------------------
// summarizeDailyHours — per-day cap splits billable vs pending overtime.
// ---------------------------------------------------------------------------
{
    const summary = service.summarizeDailyHours(
        new Map([['2026-07-01', 10], ['2026-07-02', 6], ['2026-07-03', 8]]),
        8,
    )
    assert.equal(summary.totalHours, 24)
    assert.equal(summary.billableHours, 22)      // min(10,8)+6+8
    assert.equal(summary.pendingOvertimeHours, 2) // max(0,10-8)
}
{
    const empty = service.summarizeDailyHours(new Map(), 8)
    assert.deepEqual(empty, { totalHours: 0, billableHours: 0, pendingOvertimeHours: 0 })
}
{
    // Every day under the cap → nothing billed as overtime.
    const underCap = service.summarizeDailyHours(new Map([['d1', 5], ['d2', 7]]), 8)
    assert.equal(underCap.billableHours, 12)
    assert.equal(underCap.pendingOvertimeHours, 0)
}

// ---------------------------------------------------------------------------
// getPayrollRateContext — salary + scheme + daily cap → hourly/daily rate.
// ---------------------------------------------------------------------------
const start = new Date('2026-07-01T00:00:00Z')
const end = new Date('2026-07-31T00:00:00Z')

{
    // flat_160_hours: hourly = salary / 160, daily = hourly * cap.
    const ctx = service.getPayrollRateContext(
        { baseSalary: 160000, payrollScheme: 'flat_160_hours', maxBillableHoursPerDay: 8 },
        start, end,
    )
    assert.equal(ctx.hourlyRate, 1000)
    assert.equal(ctx.dailyRate, 8000)
    assert.equal(ctx.divisorHours, 160)
}
{
    // flat_30: daily = salary / 30, hourly = daily / cap.
    const ctx = service.getPayrollRateContext(
        { baseSalary: 30000, payrollScheme: 'flat_30', maxBillableHoursPerDay: 10 },
        start, end,
    )
    assert.equal(ctx.dailyRate, 1000)
    assert.equal(ctx.hourlyRate, 100)
    assert.equal(ctx.divisorDays, 30)
}
{
    // flat_20: daily = salary / 20.
    const ctx = service.getPayrollRateContext(
        { baseSalary: 20000, payrollScheme: 'flat_20', maxBillableHoursPerDay: 8 },
        start, end,
    )
    assert.equal(ctx.dailyRate, 1000)
    assert.equal(ctx.hourlyRate, 125)
    assert.equal(ctx.divisorDays, 20)
}
{
    // weekdays: divisor is the weekday count of the period midpoint's month.
    // Midpoint of Jul 1–31 2026 is mid-July; July 2026 has 23 weekdays.
    const ctx = service.getPayrollRateContext(
        { baseSalary: 23000, payrollScheme: 'weekdays', maxBillableHoursPerDay: 8 },
        start, end,
    )
    assert.equal(ctx.divisorDays, service.getWeekdaysInMonth(new Date(2026, 6, 16)))
    assert.equal(ctx.dailyRate, 23000 / ctx.divisorDays)
    assert.equal(ctx.hourlyRate, ctx.dailyRate / 8)
}
{
    // Missing salary → zero rates, never NaN.
    const ctx = service.getPayrollRateContext(
        { baseSalary: null, payrollScheme: 'flat_160_hours', maxBillableHoursPerDay: 8 },
        start, end,
    )
    assert.equal(ctx.hourlyRate, 0)
    assert.equal(ctx.dailyRate, 0)
}

// ---------------------------------------------------------------------------
// End-to-end gross pay (mirrors previewPayslip: grossPay = billable * hourly).
// Automatic gross must EXCLUDE hours beyond the daily billable cap.
// ---------------------------------------------------------------------------
{
    const profile = { baseSalary: 160000, payrollScheme: 'flat_160_hours', maxBillableHoursPerDay: 8 }
    const ctx = service.getPayrollRateContext(profile, start, end) // hourly = 1000
    const summary = service.summarizeDailyHours(new Map([['d1', 8], ['d2', 8]]), 8)
    assert.equal(summary.billableHours * ctx.hourlyRate, 16000)
}
{
    // A 12-hour day is capped at 8 billable; the extra 4h is pending overtime,
    // not silently paid into automatic gross.
    const profile = { baseSalary: 160000, payrollScheme: 'flat_160_hours', maxBillableHoursPerDay: 8 }
    const ctx = service.getPayrollRateContext(profile, start, end) // hourly = 1000
    const summary = service.summarizeDailyHours(new Map([['d1', 12]]), 8)
    assert.equal(summary.billableHours, 8)
    assert.equal(summary.pendingOvertimeHours, 4)
    assert.equal(summary.billableHours * ctx.hourlyRate, 8000)
}

console.log('payroll.calculations tests passed')
