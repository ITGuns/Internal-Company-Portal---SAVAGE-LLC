import assert from 'node:assert/strict'
import type { PayrollPeriodCadence } from '../src/payroll/payroll.calculations'
import { computeExpectedPeriodWindow, isAutoPayslipDue, periodOverlapsWindow } from '../src/scheduler/scheduler.periods'

/**
 * Unit tests for the payroll period boundaries used by the period-advance
 * scheduler job, for both cadences: monthly (the default since 2026-10-20)
 * and semi-monthly (PAYROLL_PERIOD_CADENCE=semi_monthly). This is the
 * money-adjacent logic that decides which pay window each auto-run creates,
 * so the boundaries (15th/16th split, month-end handling, leap February, year
 * rollover, pay date) are pinned here. Periods are built in calendar days of
 * the payroll timezone (Asia/Manila), whatever the server timezone is, so the
 * assertions use UTC instants.
 */
const MANILA = 'Asia/Manila'

function window(nowIso: string, cadence: PayrollPeriodCadence = 'semi_monthly') {
    const w = computeExpectedPeriodWindow(new Date(nowIso), MANILA, cadence)
    return { start: w.start.toISOString(), end: w.end.toISOString(), payDate: w.payDate.toISOString() }
}

// ---------------------------------------------------------------------------
// semi_monthly (the split used until 2026-10-20)
// ---------------------------------------------------------------------------

// First half of the month (day <= 15): Manila Jan 1 00:00 to Jan 15 23:59:59, pay date +5 days.
assert.deepEqual(window('2026-01-10T04:00:00Z'), {
    start: '2025-12-31T16:00:00.000Z',
    end: '2026-01-15T15:59:59.000Z',
    payDate: '2026-01-20T15:59:59.000Z',
})

// Boundary: the 15th is still the first half.
assert.equal(window('2026-01-15T10:00:00Z').end, '2026-01-15T15:59:59.000Z')

// Boundary: 01:00 on the 16th in Manila is still the 15th in UTC, and already the second half.
assert.deepEqual(window('2026-01-15T17:00:00Z'), {
    start: '2026-01-15T16:00:00.000Z',
    end: '2026-01-31T15:59:59.000Z',
    payDate: '2026-02-05T15:59:59.000Z',
})

// Second half, non-leap February ends on the 28th.
assert.equal(window('2026-02-20T04:00:00Z').end, '2026-02-28T15:59:59.000Z')
assert.equal(window('2026-02-20T04:00:00Z').payDate, '2026-03-05T15:59:59.000Z')

// Second half, leap February ends on the 29th.
assert.equal(window('2024-02-20T04:00:00Z').end, '2024-02-29T15:59:59.000Z')

// Year rollover: late December pay date lands in the next January.
assert.deepEqual(window('2026-12-20T04:00:00Z'), {
    start: '2026-12-15T16:00:00.000Z',
    end: '2026-12-31T15:59:59.000Z',
    payDate: '2027-01-05T15:59:59.000Z',
})

// A period stored before 2026-10-09 at UTC midnight covers the same calendar days
// as the Manila-midnight window, so period-advance does not create a duplicate.
{
    const expected = computeExpectedPeriodWindow(new Date('2026-10-05T04:00:00Z'), MANILA, 'semi_monthly')
    const legacyUtc = { startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-10-15T23:59:59Z') }
    const previousHalf = { startDate: new Date('2026-09-16T00:00:00Z'), endDate: new Date('2026-09-30T23:59:59Z') }
    const nextHalfManila = computeExpectedPeriodWindow(new Date('2026-10-20T04:00:00Z'), MANILA, 'semi_monthly')
    assert.equal(periodOverlapsWindow(legacyUtc, expected), true)
    assert.equal(periodOverlapsWindow(previousHalf, expected), false)
    assert.equal(
        periodOverlapsWindow(legacyUtc, nextHalfManila),
        false,
        'a UTC-stored first half does not block the Manila second half',
    )
}

// ---------------------------------------------------------------------------
// monthly (the default): the whole Manila calendar month, pay date +5 days
// ---------------------------------------------------------------------------
assert.deepEqual(window('2026-10-20T04:00:00Z', 'monthly'), {
    start: '2026-09-30T16:00:00.000Z',
    end: '2026-10-31T15:59:59.000Z',
    payDate: '2026-11-05T15:59:59.000Z',
})

// Boundary: 23:00 on Oct 31 in Manila is still October; 01:00 on Nov 1 (17:00 UTC on
// Oct 31) is already November.
assert.equal(window('2026-10-31T15:00:00Z', 'monthly').end, '2026-10-31T15:59:59.000Z')
assert.deepEqual(window('2026-10-31T17:00:00Z', 'monthly'), {
    start: '2026-10-31T16:00:00.000Z',
    end: '2026-11-30T15:59:59.000Z',
    payDate: '2026-12-05T15:59:59.000Z',
})

// The cron at 00:00 UTC on the 1st and its retry on the 2nd expect the same month.
assert.deepEqual(window('2026-11-01T00:00:00Z', 'monthly'), window('2026-11-02T00:00:00Z', 'monthly'))

// Leap February and year rollover.
assert.equal(window('2024-02-10T04:00:00Z', 'monthly').end, '2024-02-29T15:59:59.000Z')
assert.equal(window('2026-02-10T04:00:00Z', 'monthly').end, '2026-02-28T15:59:59.000Z')
assert.equal(window('2026-12-20T04:00:00Z', 'monthly').payDate, '2027-01-05T15:59:59.000Z')

// The October halves already stored on production (one at UTC midnight, one at
// Manila midnight) overlap the monthly October window, so period-advance skips
// instead of adding a whole month on top of them. November overlaps neither.
{
    const october = computeExpectedPeriodWindow(new Date('2026-10-20T04:00:00Z'), MANILA, 'monthly')
    const november = computeExpectedPeriodWindow(new Date('2026-11-01T00:00:00Z'), MANILA, 'monthly')
    const firstHalfUtc = { startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-10-15T23:59:59Z') }
    const secondHalfManila = { startDate: new Date('2026-10-15T16:00:00Z'), endDate: new Date('2026-10-31T15:59:59Z') }
    assert.equal(periodOverlapsWindow(firstHalfUtc, october), true)
    assert.equal(periodOverlapsWindow(secondHalfManila, october), true)
    assert.equal(periodOverlapsWindow(firstHalfUtc, november), false)
    assert.equal(periodOverlapsWindow(secondHalfManila, november), false, 'the second half does not block November')
    // A September stored at UTC midnight ends at 07:59:59 on Oct 1 in Manila, still
    // September by calendar day, so it does not block October either.
    const septemberUtc = { startDate: new Date('2026-09-01T00:00:00Z'), endDate: new Date('2026-09-30T23:59:59Z') }
    assert.equal(periodOverlapsWindow(septemberUtc, october), false)
}

// Auto-payslip gate: an ended period generates immediately even though its pay
// date is 5 days out; a period still open waits until 2 days before pay date.
{
    const ended = { endDate: new Date('2026-10-15T23:59:59Z'), payDate: new Date('2026-10-20T23:59:59Z') }
    assert.equal(isAutoPayslipDue(ended, new Date('2026-10-16T00:30:00Z')), true, 'ended period is due right away')
    const open = { endDate: new Date('2026-10-31T23:59:59Z'), payDate: new Date('2026-11-05T23:59:59Z') }
    assert.equal(isAutoPayslipDue(open, new Date('2026-10-20T00:00:00Z')), false, 'open period keeps the gate')
    const openNoPayDate = { endDate: new Date('2026-10-31T23:59:59Z'), payDate: null }
    assert.equal(isAutoPayslipDue(openNoPayDate, new Date('2026-10-31T23:59:59Z')), true, 'no pay date: due from the end')
}

console.log('scheduler.periods tests passed')
