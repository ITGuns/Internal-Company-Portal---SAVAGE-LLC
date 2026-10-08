import assert from 'node:assert/strict'
import { computeExpectedPeriodWindow, isAutoPayslipDue, periodOverlapsWindow } from '../src/scheduler/scheduler.periods'

/**
 * Unit tests for the semi-monthly payroll period boundaries used by the
 * period-advance scheduler job. This is the money-adjacent logic that decides
 * which pay window each auto-run creates, so the boundaries (15th/16th split,
 * month-end handling, leap February, year rollover, pay date) are pinned here.
 * Periods are built in calendar days of the payroll timezone (Asia/Manila),
 * whatever the server timezone is, so the assertions use UTC instants.
 */
const MANILA = 'Asia/Manila'

function window(nowIso: string) {
    const w = computeExpectedPeriodWindow(new Date(nowIso), MANILA)
    return { start: w.start.toISOString(), end: w.end.toISOString(), payDate: w.payDate.toISOString() }
}

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
    const expected = computeExpectedPeriodWindow(new Date('2026-10-05T04:00:00Z'), MANILA)
    const legacyUtc = { startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-10-15T23:59:59Z') }
    const previousHalf = { startDate: new Date('2026-09-16T00:00:00Z'), endDate: new Date('2026-09-30T23:59:59Z') }
    const nextHalfManila = computeExpectedPeriodWindow(new Date('2026-10-20T04:00:00Z'), MANILA)
    assert.equal(periodOverlapsWindow(legacyUtc, expected), true)
    assert.equal(periodOverlapsWindow(previousHalf, expected), false)
    assert.equal(
        periodOverlapsWindow(legacyUtc, nextHalfManila),
        false,
        'a UTC-stored first half does not block the Manila second half',
    )
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
