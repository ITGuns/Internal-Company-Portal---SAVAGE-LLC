import assert from 'node:assert/strict'
import { prisma } from '../src/database/prisma.service'
import { config } from '../src/config/env.config'
import {
  backfillEntryTimes,
  backfillNote,
  enumerateDayKeys,
  isWeekendDayKey,
  MAX_BACKFILL_SPAN_DAYS,
  occupiedDayKeys,
  parseClockMinutes,
  planBackfillDays,
  validateBackfillInput,
} from '../src/payroll/backfill.calculations'
import { BackfillService } from '../src/payroll/backfill.service'
import {
  PayrollConflictError,
  PayrollForbiddenError,
  PayrollNotFoundError,
  PayrollValidationError,
} from '../src/payroll/payroll.errors'
import { zonedMidnightUtc } from '../src/payroll/payroll.calculations'

/** Hours backfill (POST /payroll/entries/backfill). Pure helpers plus the service with stubbed Prisma, no database. */

const MANILA = 'Asia/Manila'
const TODAY = '2026-10-14'
const NOW = new Date('2026-10-14T04:00:00Z') // noon in Manila
const base = { startDate: '2026-10-01', endDate: '2026-10-13', startTime: '09:00', endTime: '18:00' }

function rejectsWith(input: Record<string, unknown>, pattern: RegExp) {
  assert.throws(() => validateBackfillInput(input, TODAY), (error: unknown) =>
    error instanceof PayrollValidationError && pattern.test(error.message))
}

function testDayEnumeration() {
  assert.deepEqual(enumerateDayKeys('2026-09-29', '2026-10-02'), ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02'])
  assert.deepEqual(enumerateDayKeys('2026-12-31', '2027-01-01'), ['2026-12-31', '2027-01-01'])
  assert.deepEqual(enumerateDayKeys('2026-10-05', '2026-10-05'), ['2026-10-05'])
  assert.deepEqual(enumerateDayKeys('2026-10-06', '2026-10-05'), [])
}

function testWeekends() {
  assert.equal(isWeekendDayKey('2026-10-03'), true, 'Saturday')
  assert.equal(isWeekendDayKey('2026-10-04'), true, 'Sunday')
  assert.equal(isWeekendDayKey('2026-10-05'), false, 'Monday')
  assert.equal(isWeekendDayKey('2026-10-02'), false, 'Friday')

  const week = enumerateDayKeys('2026-10-01', '2026-10-07')
  const skipping = planBackfillDays(week, { skipWeekends: true, occupied: new Set() })
  assert.deepEqual(skipping.days, ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'])
  assert.deepEqual(skipping.skipped, ['2026-10-03: weekend', '2026-10-04: weekend'])
  const keeping = planBackfillDays(week, { skipWeekends: false, occupied: new Set() })
  assert.equal(keeping.days.length, 7)
  assert.deepEqual(keeping.skipped, [])
}

function testValidation() {
  const valid = validateBackfillInput({ ...base, notes: '  Paper timesheet  ' }, TODAY)
  assert.deepEqual(valid, {
    startKey: '2026-10-01',
    endKey: '2026-10-13',
    startMinutes: 9 * 60,
    endMinutes: 18 * 60,
    notes: 'Paper timesheet',
  })

  // 62-day cap: the end date may be at most 62 days after the start date.
  assert.equal(MAX_BACKFILL_SPAN_DAYS, 62)
  validateBackfillInput({ ...base, startDate: '2026-08-01', endDate: '2026-10-02' }, TODAY)
  rejectsWith({ ...base, startDate: '2026-08-01', endDate: '2026-10-03' }, /at most 62 days/)

  // No future days; today is allowed.
  validateBackfillInput({ ...base, endDate: TODAY }, TODAY)
  rejectsWith({ ...base, endDate: '2026-10-15' }, /cannot be in the future/)
  rejectsWith({ ...base, startDate: '2026-10-05', endDate: '2026-10-04' }, /on or after the start date/)
  rejectsWith({ ...base, startDate: '2026-02-30' }, /real dates/)
  rejectsWith({ ...base, endDate: undefined }, /real dates/)

  // 24 hour cap: both times are on the same day, so 00:00 to 23:59 is the longest window.
  const longest = validateBackfillInput({ ...base, startTime: '00:00', endTime: '23:59' }, TODAY)
  assert.ok(longest.endMinutes - longest.startMinutes < 24 * 60)
  assert.equal(parseClockMinutes('24:00'), null)
  assert.equal(parseClockMinutes('25:00'), null)
  assert.equal(parseClockMinutes('9:00'), null)
  assert.equal(parseClockMinutes('07:30'), 450)
  rejectsWith({ ...base, endTime: '24:00' }, /HH:MM/)
  rejectsWith({ ...base, startTime: '18:00', endTime: '09:00' }, /after the start time/)
  rejectsWith({ ...base, startTime: '09:00', endTime: '09:00' }, /after the start time/)

  rejectsWith({ ...base, notes: 42 }, /Notes must be text/)
  rejectsWith({ ...base, notes: 'x'.repeat(501) }, /at most 500 characters/)
}

function testEntryTimesAndOccupiedDays() {
  const window = backfillEntryTimes('2026-10-01', 9 * 60, 18 * 60, MANILA)
  assert.equal(window.start.toISOString(), '2026-10-01T01:00:00.000Z')
  assert.equal(window.end.toISOString(), '2026-10-01T10:00:00.000Z')

  const occupied = occupiedDayKeys([
    // A normal day.
    { start: new Date('2026-10-07T01:00:00Z'), end: new Date('2026-10-07T09:00:00Z') },
    // Overnight 22:00 to 06:00 Manila touches both days.
    { start: new Date('2026-10-08T14:00:00Z'), end: new Date('2026-10-08T22:00:00Z') },
    // Ends exactly at Manila midnight: only its own day.
    { start: new Date('2026-10-12T12:00:00Z'), end: new Date('2026-10-12T16:00:00Z') },
    // Still open: runs until now.
    { start: new Date('2026-10-14T00:30:00Z'), end: null },
  ], NOW, MANILA)
  assert.deepEqual([...occupied].sort(), ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-14'])

  // Existing days are skipped, not merged; a weekend reason wins over an existing entry.
  const plan = planBackfillDays(enumerateDayKeys('2026-10-06', '2026-10-12'), { skipWeekends: true, occupied })
  assert.deepEqual(plan.days, ['2026-10-06'])
  assert.deepEqual(plan.skipped, [
    '2026-10-07: existing entry',
    '2026-10-08: existing entry',
    '2026-10-09: existing entry',
    '2026-10-10: weekend',
    '2026-10-11: weekend',
    '2026-10-12: existing entry',
  ])
}

function testNoteSuffix() {
  assert.equal(backfillNote('', 'Ana Cruz', TODAY), 'Backfilled by Ana Cruz on 2026-10-14')
  assert.equal(backfillNote('Paper timesheet', 'books@example.test', TODAY), 'Paper timesheet Backfilled by books@example.test on 2026-10-14')
}

// ---------------------------------------------------------------------------
// Service with stubbed Prisma delegates.
// ---------------------------------------------------------------------------

type Stubs = Array<[any, string, unknown]>

async function withStubs(stubs: Stubs, run: () => Promise<void>) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]] as const)
  for (const [target, key, value] of stubs) target[key] = value
  try {
    await run()
  } finally {
    for (const [target, key, value] of saved) target[key] = value
  }
}

interface FakeState {
  users: Record<string, any>
  entries: Array<{ start: Date; end: Date | null }>
  lockedPeriods: Array<{ startDate: Date; endDate: Date }>
  created: any[][]
  entryQueries: any[]
}

function serviceStubs(state: FakeState): Stubs {
  const tx = {
    timeEntry: {
      findMany: async (args: any) => {
        state.entryQueries.push(args)
        return state.entries
      },
      createMany: async (args: any) => {
        state.created.push(args.data)
        return { count: args.data.length }
      },
    },
    payrollPeriod: { findMany: async () => state.lockedPeriods },
  }
  return [
    [prisma.user, 'findUnique', async (args: any) => state.users[args.where.id] ?? null],
    [prisma, '$transaction', async (fn: (client: unknown) => Promise<unknown>) => fn(tx)],
  ]
}

function freshState(): FakeState {
  return {
    users: {
      'u-emp': { status: 'active', roles: [{ role: 'Frontend Developer' }], clientMemberships: [] },
      'u-gone': { status: 'inactive', roles: [{ role: 'Frontend Developer' }], clientMemberships: [] },
      'u-client': { status: 'active', roles: [{ role: 'client' }], clientMemberships: [{ status: 'active' }] },
      'u-books': { name: 'Pay Roll', email: 'books@example.test' },
    },
    entries: [
      { start: new Date('2026-10-07T01:00:00Z'), end: new Date('2026-10-07T09:00:00Z') },
      { start: new Date('2026-10-08T14:00:00Z'), end: new Date('2026-10-08T22:00:00Z') },
    ],
    lockedPeriods: [],
    created: [],
    entryQueries: [],
  }
}

const payroll = { requesterId: 'u-books', isFullAccess: false }
const request = { ...base, startDate: '2026-09-29', userId: 'u-emp', skipWeekends: true, notes: 'Paper timesheet' }

;(async () => {
  const service = new BackfillService()
  await assert.rejects(
    service.backfill({ ...request, userId: 'u-books', dryRun: true }, payroll, NOW),
    (err: Error) => err instanceof PayrollForbiddenError && /own hours/.test(err.message),
  )
})()
const expectedDays = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-12', '2026-10-13']
const expectedSkipped = [
  '2026-10-03: weekend',
  '2026-10-04: weekend',
  '2026-10-07: existing entry',
  '2026-10-08: existing entry',
  '2026-10-09: existing entry',
  '2026-10-10: weekend',
  '2026-10-11: weekend',
]

async function testServiceDryRunAndCreate() {
  const state = freshState()
  await withStubs(serviceStubs(state), async () => {
    const service = new BackfillService()

    const preview = await service.backfill({ ...request, dryRun: true }, payroll, NOW)
    assert.deepEqual(preview, { created: 0, skipped: expectedSkipped, days: expectedDays })
    assert.equal(state.created.length, 0, 'a dry run writes nothing')
    // Entries overlapping Manila midnight of the first day through midnight after the last.
    assert.equal(state.entryQueries[0].where.start.lt.toISOString(), '2026-10-13T16:00:00.000Z')
    assert.equal(state.entryQueries[0].where.OR[1].end.gt.toISOString(), '2026-09-28T16:00:00.000Z')

    const result = await service.backfill(request, payroll, NOW)
    assert.deepEqual(result, { created: expectedDays.length, skipped: expectedSkipped, days: expectedDays })
    assert.equal(state.created.length, 1, 'all entries in one createMany')
    const rows = state.created[0]
    assert.equal(rows.length, expectedDays.length)
    assert.deepEqual(rows[0], {
      userId: 'u-emp',
      start: new Date('2026-09-29T01:00:00Z'),
      end: new Date('2026-09-29T10:00:00Z'),
      duration: 540,
      notes: 'Paper timesheet Backfilled by Pay Roll on 2026-10-14',
    })
    assert.equal(rows[rows.length - 1].start.toISOString(), '2026-10-13T01:00:00.000Z')
  })
}

async function testServiceRefusals() {
  const state = freshState()
  await withStubs(serviceStubs(state), async () => {
    const service = new BackfillService()
    await assert.rejects(service.backfill({ ...request, userId: 'u-missing' }, payroll, NOW), PayrollNotFoundError)
    await assert.rejects(service.backfill({ ...request, userId: 'u-client' }, payroll, NOW), PayrollValidationError)
    await assert.rejects(service.backfill({ ...request, userId: 'u-gone' }, payroll, NOW), PayrollForbiddenError)
    await service.backfill({ ...request, userId: 'u-gone', dryRun: true }, { requesterId: 'u-books', isFullAccess: true }, NOW)
    await assert.rejects(service.backfill({ ...request, userId: '' }, payroll, NOW), /Choose an employee/)
    await assert.rejects(service.backfill({ ...request, skipWeekends: 'yes' }, payroll, NOW), /skipWeekends must be true or false/)

    // Today's 18:00 end is still ahead at noon.
    await assert.rejects(service.backfill({ ...request, endDate: TODAY }, payroll, NOW), /cannot end in the future/)

    // A processed period is read-only.
    state.lockedPeriods = [{ startDate: zonedMidnightUtc('2026-09-16', MANILA), endDate: new Date('2026-09-30T15:59:59Z') }]
    await assert.rejects(service.backfill(request, payroll, NOW), PayrollConflictError)
    assert.equal(state.created.length, 0, 'refused requests write nothing')
  })
}

async function main() {
  const savedTimezone = config.payrollTimezone
  config.payrollTimezone = MANILA
  try {
    testDayEnumeration()
    testWeekends()
    testValidation()
    testEntryTimesAndOccupiedDays()
    testNoteSuffix()
    await testServiceDryRunAndCreate()
    await testServiceRefusals()
  } finally {
    config.payrollTimezone = savedTimezone
  }
  console.log('payroll.backfill tests passed')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
