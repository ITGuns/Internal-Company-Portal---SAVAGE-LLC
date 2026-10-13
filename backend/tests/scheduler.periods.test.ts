import assert from 'node:assert/strict'
import { computeExpectedPeriodWindow } from '../src/scheduler/scheduler.periods'

/**
 * Unit tests for the semi-monthly payroll period boundaries used by the
 * period-advance scheduler job. This is the money-adjacent logic that decides
 * which pay window each auto-run creates, so the boundaries (15th/16th split,
 * month-end handling, leap February, year rollover, pay date) are pinned here.
 * Dates are asserted by local component (year/month/day) since the function
 * builds them in local time.
 */
function ymd(date: Date): [number, number, number] {
    return [date.getFullYear(), date.getMonth(), date.getDate()]
}

// First half of the month (day <= 15): 1st → 15th, pay date +5 days.
{
    const w = computeExpectedPeriodWindow(new Date(2026, 0, 10)) // Jan 10 2026
    assert.deepEqual(ymd(w.start), [2026, 0, 1])
    assert.deepEqual(ymd(w.end), [2026, 0, 15])
    assert.equal(w.end.getHours(), 23)
    assert.equal(w.end.getMinutes(), 59)
    assert.equal(w.end.getSeconds(), 59)
    assert.deepEqual(ymd(w.payDate), [2026, 0, 20]) // Jan 15 + 5
}

// Boundary: the 15th is still the first half.
{
    const w = computeExpectedPeriodWindow(new Date(2026, 0, 15))
    assert.deepEqual(ymd(w.start), [2026, 0, 1])
    assert.deepEqual(ymd(w.end), [2026, 0, 15])
}

// Boundary: the 16th flips to the second half.
{
    const w = computeExpectedPeriodWindow(new Date(2026, 0, 16))
    assert.deepEqual(ymd(w.start), [2026, 0, 16])
    assert.deepEqual(ymd(w.end), [2026, 0, 31]) // Jan has 31 days
    assert.deepEqual(ymd(w.payDate), [2026, 1, 5]) // Jan 31 + 5 = Feb 5
}

// Second half, non-leap February → ends on the 28th.
{
    const w = computeExpectedPeriodWindow(new Date(2026, 1, 20)) // Feb 20 2026
    assert.deepEqual(ymd(w.start), [2026, 1, 16])
    assert.deepEqual(ymd(w.end), [2026, 1, 28])
    assert.deepEqual(ymd(w.payDate), [2026, 2, 5]) // Feb 28 + 5 = Mar 5
}

// Second half, leap February → ends on the 29th.
{
    const w = computeExpectedPeriodWindow(new Date(2024, 1, 20)) // Feb 20 2024 (leap)
    assert.deepEqual(ymd(w.start), [2024, 1, 16])
    assert.deepEqual(ymd(w.end), [2024, 1, 29])
    assert.deepEqual(ymd(w.payDate), [2024, 2, 5]) // Feb 29 + 5 = Mar 5
}

// Year rollover: late December pay date lands in the next January.
{
    const w = computeExpectedPeriodWindow(new Date(2026, 11, 20)) // Dec 20 2026
    assert.deepEqual(ymd(w.start), [2026, 11, 16])
    assert.deepEqual(ymd(w.end), [2026, 11, 31])
    assert.deepEqual(ymd(w.payDate), [2027, 0, 5]) // Dec 31 + 5 = Jan 5 2027
}

console.log('scheduler.periods tests passed')
