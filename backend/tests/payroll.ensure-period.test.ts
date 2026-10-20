import assert from 'node:assert/strict'
import { prisma } from '../src/database/prisma.service'
import { config } from '../src/config/env.config'
import { PayrollService } from '../src/payroll/payroll.service'
import {
  payrollDayKey,
  periodEndDayKey,
  periodStartDayKey,
  semiMonthlyPeriodForDay,
} from '../src/payroll/payroll.calculations'

// ensureCurrentPeriodExists must hand back the period that covers today and
// create it when it is missing, even when an older period already exists.
// Before 20 Oct 2026 it returned the newest period whatever its dates.

const DAY_MS = 24 * 60 * 60 * 1000

async function main() {
  const savedTimezone = config.payrollTimezone
  config.payrollTimezone = 'Asia/Manila'
  const service = new PayrollService()
  const created: string[] = []

  try {
    const today = payrollDayKey(new Date(), config.payrollTimezone)
    const expected = semiMonthlyPeriodForDay(today, config.payrollTimezone)

    // Start clean: no period may cover today (only periods without payslips are removed).
    await prisma.payrollPeriod.deleteMany({
      where: {
        startDate: { lte: new Date(expected.end.getTime() + DAY_MS) },
        endDate: { gte: new Date(expected.start.getTime() - DAY_MS) },
        payslips: { none: {} },
      },
    })

    // An older period that has already ended, the shape production had on 20 Oct.
    const oldDay = payrollDayKey(new Date(Date.now() - 45 * DAY_MS), config.payrollTimezone)
    const old = await service.createPayrollPeriod(semiMonthlyPeriodForDay(oldDay, config.payrollTimezone))
    created.push(old.id)

    const firstId = await service.ensureCurrentPeriodExists()
    assert.notEqual(firstId, old.id, 'an ended period must not be returned as current')
    created.push(firstId)
    const current = await prisma.payrollPeriod.findUniqueOrThrow({ where: { id: firstId } })
    assert.equal(periodStartDayKey(current.startDate), periodStartDayKey(expected.start))
    assert.equal(periodEndDayKey(current.endDate), periodEndDayKey(expected.end))
    assert.equal(current.status, 'draft')

    const secondId = await service.ensureCurrentPeriodExists()
    assert.equal(secondId, firstId, 'a second call must reuse the period, not create another')
    const count = await prisma.payrollPeriod.count({
      where: {
        startDate: { lte: new Date(expected.end.getTime() + DAY_MS) },
        endDate: { gte: new Date(expected.start.getTime() - DAY_MS) },
      },
    })
    assert.equal(count, 1, 'exactly one period covers today')
  } finally {
    await prisma.payrollPeriod.deleteMany({ where: { id: { in: created } } })
    config.payrollTimezone = savedTimezone
  }
  console.log('payroll.ensure-period tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
