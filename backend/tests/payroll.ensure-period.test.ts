import assert from 'node:assert/strict'
import { prisma } from '../src/database/prisma.service'
import { config } from '../src/config/env.config'
import { PayrollService } from '../src/payroll/payroll.service'
import {
  payrollDayKey,
  payrollPeriodForDay,
  periodEndDayKey,
  periodStartDayKey,
  semiMonthlyPeriodForDay,
  type PayrollPeriodCadence,
  type PeriodBounds,
} from '../src/payroll/payroll.calculations'
import { periodOverlapsWindow } from '../src/scheduler/scheduler.periods'

// ensureCurrentPeriodExists must hand back the period that covers today and
// create it when it is missing, even when an older period already exists.
// Before 20 Oct 2026 it returned the newest period whatever its dates.
// Since 20 Oct 2026 it follows PAYROLL_PERIOD_CADENCE (monthly by default) and
// reuses a semi-monthly half that already covers today instead of adding a month.

const DAY_MS = 24 * 60 * 60 * 1000

/** Rows near the window, widened by a day like the service query. */
function nearWindow(bounds: PeriodBounds) {
  return {
    startDate: { lte: new Date(bounds.end.getTime() + DAY_MS) },
    endDate: { gte: new Date(bounds.start.getTime() - DAY_MS) },
  }
}

/** Stored periods sharing a calendar day with the window. */
async function periodsOverlapping(bounds: PeriodBounds) {
  const rows = await prisma.payrollPeriod.findMany({ where: nearWindow(bounds) })
  return rows.filter((row) => periodOverlapsWindow(row, bounds))
}

async function createsThenReusesTodaysPeriod(service: PayrollService, cadence: PayrollPeriodCadence, created: string[]) {
  config.payrollPeriodCadence = cadence
  const today = payrollDayKey(new Date(), config.payrollTimezone)
  const expected = payrollPeriodForDay(today, config.payrollTimezone, cadence)

  // Start clean: no period may cover today (only periods without payslips are removed).
  await prisma.payrollPeriod.deleteMany({ where: { ...nearWindow(expected), payslips: { none: {} } } })

  // An older period that has already ended, the shape production had on 20 Oct.
  const oldDay = payrollDayKey(new Date(Date.now() - 45 * DAY_MS), config.payrollTimezone)
  const old = await service.createPayrollPeriod(payrollPeriodForDay(oldDay, config.payrollTimezone, cadence))
  created.push(old.id)

  const firstId = await service.ensureCurrentPeriodExists()
  assert.notEqual(firstId, old.id, `${cadence}: an ended period must not be returned as current`)
  created.push(firstId)
  const current = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id: firstId } })
  assert.equal(periodStartDayKey(current.startDate), periodStartDayKey(expected.start), `${cadence}: first day`)
  assert.equal(periodEndDayKey(current.endDate), periodEndDayKey(expected.end), `${cadence}: last day`)
  assert.equal(current.status, 'draft')

  const secondId = await service.ensureCurrentPeriodExists()
  assert.equal(secondId, firstId, `${cadence}: a second call must reuse the period, not create another`)
  assert.equal((await periodsOverlapping(expected)).length, 1, `${cadence}: exactly one period covers today`)
}

// Production keeps October 2026 in two halves. Under the monthly cadence the
// half that covers today is the current period; no whole month is added.
async function reusesSemiMonthlyHalfUnderMonthly(service: PayrollService, created: string[]) {
  config.payrollPeriodCadence = 'monthly'
  const today = payrollDayKey(new Date(), config.payrollTimezone)
  const month = payrollPeriodForDay(today, config.payrollTimezone, 'monthly')
  await prisma.payrollPeriod.deleteMany({ where: { ...nearWindow(month), payslips: { none: {} } } })

  const half = await service.createPayrollPeriod(semiMonthlyPeriodForDay(today, config.payrollTimezone))
  created.push(half.id)

  const id = await service.ensureCurrentPeriodExists()
  assert.equal(id, half.id, 'the half that covers today is reused under the monthly cadence')
  const overlapping = await periodsOverlapping(month)
  assert.deepEqual(overlapping.map((row) => row.id), [half.id], 'no whole month is added on top of the half')
}

async function main() {
  const saved = { timeZone: config.payrollTimezone, cadence: config.payrollPeriodCadence }
  config.payrollTimezone = 'Asia/Manila'
  const service = new PayrollService()
  const created: string[] = []

  try {
    await createsThenReusesTodaysPeriod(service, 'monthly', created)
    await createsThenReusesTodaysPeriod(service, 'semi_monthly', created)
    await reusesSemiMonthlyHalfUnderMonthly(service, created)
  } finally {
    await prisma.payrollPeriod.deleteMany({ where: { id: { in: created } } })
    config.payrollTimezone = saved.timeZone
    config.payrollPeriodCadence = saved.cadence
  }
  console.log('payroll.ensure-period tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
