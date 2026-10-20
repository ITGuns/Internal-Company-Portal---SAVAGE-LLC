import assert from 'node:assert/strict'
import {
    addDaysToKey,
    computeGrossPay,
    getPayrollRateContext,
    monthlyPeriodForDay,
    payrollPeriodForDay,
    periodEndDayKey,
    periodFraction,
    periodStartDayKey,
    roundMoney,
    semiMonthlyPeriodForDay,
    summarizePayrollHours,
    type PeriodBounds,
} from '../src/payroll/payroll.calculations'
import { isAutoPayslipDue, selectAutoPayslipPeriod } from '../src/scheduler/scheduler.periods'
import { resolvePayrollPeriodCadence } from '../src/config/env.config'

/**
 * Monthly payroll periods (2026-10-20). The company pays once a month, so new
 * periods run from the 1st to the last day of the month in the payroll
 * timezone unless PAYROLL_PERIOD_CADENCE=semi_monthly. Pure math, no database.
 */
const MANILA = 'Asia/Manila'

function iso(bounds: PeriodBounds) {
    return { start: bounds.start.toISOString(), end: bounds.end.toISOString(), payDate: bounds.payDate.toISOString() }
}

// 31-day month: Manila Oct 1 00:00 to Oct 31 23:59:59, pay date 5 days after the end.
assert.deepEqual(iso(monthlyPeriodForDay('2026-10-20', MANILA)), {
    start: '2026-09-30T16:00:00.000Z',
    end: '2026-10-31T15:59:59.000Z',
    payDate: '2026-11-05T15:59:59.000Z',
})
// The first and the last day of the month map to the same period.
assert.deepEqual(iso(monthlyPeriodForDay('2026-10-01', MANILA)), iso(monthlyPeriodForDay('2026-10-31', MANILA)))

// 30-day month.
assert.deepEqual(iso(monthlyPeriodForDay('2026-11-15', MANILA)), {
    start: '2026-10-31T16:00:00.000Z',
    end: '2026-11-30T15:59:59.000Z',
    payDate: '2026-12-05T15:59:59.000Z',
})

// February: 28 days in 2026, 29 in the 2028 leap year; the pay date moves into March.
assert.deepEqual(iso(monthlyPeriodForDay('2026-02-10', MANILA)), {
    start: '2026-01-31T16:00:00.000Z',
    end: '2026-02-28T15:59:59.000Z',
    payDate: '2026-03-05T15:59:59.000Z',
})
assert.equal(monthlyPeriodForDay('2028-02-29', MANILA).end.toISOString(), '2028-02-29T15:59:59.000Z')

// December: the pay date lands in the next January.
assert.equal(monthlyPeriodForDay('2026-12-31', MANILA).payDate.toISOString(), '2027-01-05T15:59:59.000Z')

// payrollPeriodForDay picks the shape by cadence.
assert.deepEqual(iso(payrollPeriodForDay('2026-10-20', MANILA, 'monthly')), iso(monthlyPeriodForDay('2026-10-20', MANILA)))
assert.deepEqual(iso(payrollPeriodForDay('2026-10-20', MANILA, 'semi_monthly')), iso(semiMonthlyPeriodForDay('2026-10-20', MANILA)))
assert.equal(payrollPeriodForDay('2026-10-20', MANILA, 'semi_monthly').start.toISOString(), '2026-10-15T16:00:00.000Z')
assert.equal(payrollPeriodForDay('2026-10-10', MANILA, 'semi_monthly').end.toISOString(), '2026-10-15T15:59:59.000Z')

// PAYROLL_PERIOD_CADENCE: monthly unless it says semi_monthly.
{
    const env = (value?: string) => ({ PAYROLL_PERIOD_CADENCE: value } as NodeJS.ProcessEnv)
    assert.equal(resolvePayrollPeriodCadence({} as NodeJS.ProcessEnv), 'monthly')
    assert.equal(resolvePayrollPeriodCadence(env('monthly')), 'monthly')
    assert.equal(resolvePayrollPeriodCadence(env('semi_monthly')), 'semi_monthly')
    assert.equal(resolvePayrollPeriodCadence(env(' Semi-Monthly ')), 'semi_monthly')
    assert.equal(resolvePayrollPeriodCadence(env('weekly')), 'monthly')
}

// periodFraction is 1 for a whole month of any length, stored at Manila or UTC midnight.
for (const day of ['2026-01-15', '2026-02-15', '2028-02-15', '2026-04-15', '2026-10-15']) {
    const month = monthlyPeriodForDay(day, MANILA)
    assert.equal(periodFraction(month.start, month.end), 1, `whole month of ${day}`)
}
assert.equal(periodFraction(new Date('2026-10-01T00:00:00Z'), new Date('2026-10-31T23:59:59Z')), 1, 'UTC-midnight month')

// Same pay as one month as it was as two halves.
{
    const profile = { baseSalary: 28000, payrollScheme: 'weekdays', maxBillableHoursPerDay: 8 }
    const weekdays = (bounds: PeriodBounds) => {
        const days: string[] = []
        for (let day = periodStartDayKey(bounds.start); day <= periodEndDayKey(bounds.end); day = addDaysToKey(day, 1)) {
            const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
            if (weekday !== 0 && weekday !== 6) days.push(day)
        }
        return days
    }
    const gross = (bounds: PeriodBounds, payBasis: 'hourly_from_monthly' | 'fixed_monthly') => {
        const rate = getPayrollRateContext(profile, bounds.start, bounds.end)
        const hours = summarizePayrollHours(new Map(weekdays(bounds).map((day) => [day, 8])), 8)
        return roundMoney(computeGrossPay({
            payBasis,
            billableHours: hours.billableHours,
            overtimeApprovedHours: 0,
            monthlySalary: profile.baseSalary,
            derivedHourlyRate: rate.hourlyRate,
            periodFraction: periodFraction(bounds.start, bounds.end),
        }).grossPay)
    }
    const october = monthlyPeriodForDay('2026-10-20', MANILA)
    const firstHalf = semiMonthlyPeriodForDay('2026-10-05', MANILA)
    const secondHalf = semiMonthlyPeriodForDay('2026-10-20', MANILA)
    assert.equal(weekdays(october).length, 22, 'October 2026 has 22 weekdays')
    // hourly_from_monthly, 8 h on every weekday: 22 x 8 h at 28,000 / 22 / 8.
    assert.equal(gross(october, 'hourly_from_monthly'), 28000)
    assert.equal(gross(firstHalf, 'hourly_from_monthly') + gross(secondHalf, 'hourly_from_monthly'), 28000)
    // fixed_monthly: the whole salary for the month, half for each half.
    assert.equal(gross(october, 'fixed_monthly'), 28000)
    assert.equal(gross(firstHalf, 'fixed_monthly'), 14000)
}

// Auto-payslip with whole-month periods. October is due as soon as it ends,
// the open month waits, and the retry on the 2nd targets the same month. With
// the old October halves still stored, the second half is the one picked.
{
    const september = monthlyPeriodForDay('2026-09-15', MANILA)
    const october = monthlyPeriodForDay('2026-10-15', MANILA)
    const november = monthlyPeriodForDay('2026-11-15', MANILA)
    const cronRun = new Date('2026-11-01T00:30:00Z') // 08:30 on 1 Nov in Manila
    const retryRun = new Date('2026-11-02T00:30:00Z')
    assert.equal(isAutoPayslipDue({ endDate: october.end, payDate: october.payDate }, cronRun), true)
    assert.equal(isAutoPayslipDue({ endDate: october.end, payDate: october.payDate }, new Date('2026-10-31T15:00:00Z')), false, 'open month waits')
    assert.equal(isAutoPayslipDue({ endDate: november.end, payDate: november.payDate }, cronRun), false)

    const months = [
        { id: 'nov', status: 'draft', endDate: november.end },
        { id: 'oct', status: 'draft', endDate: october.end },
        { id: 'sep', status: 'draft', endDate: september.end },
    ]
    assert.equal(selectAutoPayslipPeriod(months, cronRun)?.id, 'oct')
    assert.equal(selectAutoPayslipPeriod(months, retryRun)?.id, 'oct')

    const halves = [
        { id: 'nov', status: 'draft', endDate: november.end },
        { id: 'oct-16-31', status: 'draft', endDate: semiMonthlyPeriodForDay('2026-10-20', MANILA).end },
        { id: 'oct-1-15', status: 'draft', endDate: semiMonthlyPeriodForDay('2026-10-05', MANILA).end },
    ]
    assert.equal(selectAutoPayslipPeriod(halves, cronRun)?.id, 'oct-16-31')
}

console.log('payroll.cadence tests passed')
