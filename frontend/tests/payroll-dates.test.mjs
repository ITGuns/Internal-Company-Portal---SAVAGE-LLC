import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { loadTsModule } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPayrollDates() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-dates.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    Intl,
    Date,
  }, { filename: helperPath });
  return compiledModule.exports;
}

const { formatPayrollDate, payrollPeriodDayKey } = loadPayrollDates();

test('formats instants as Manila days, not UTC days', () => {
  // 17:30 UTC on Oct 8 is 01:30 on Oct 9 in Manila.
  assert.equal(formatPayrollDate('2026-10-08T17:30:00Z'), 'Oct 9, 2026');
  assert.equal(formatPayrollDate(new Date('2026-10-08T15:30:00Z')), 'Oct 8, 2026');
});

test('date-only strings stay on their calendar day', () => {
  assert.equal(formatPayrollDate('2026-10-15'), 'Oct 15, 2026');
});

test('period edges read the same for Manila-midnight and UTC-midnight storage', () => {
  // New rows: Manila midnight start, Manila 23:59:59 end.
  assert.equal(formatPayrollDate('2026-09-30T16:00:00.000Z', { edge: 'start' }), 'Oct 1, 2026');
  assert.equal(formatPayrollDate('2026-10-15T15:59:59.000Z', { edge: 'end' }), 'Oct 15, 2026');
  // Rows created on a UTC server before 2026-10-09.
  assert.equal(formatPayrollDate('2026-10-01T00:00:00.000Z', { edge: 'start' }), 'Oct 1, 2026');
  assert.equal(formatPayrollDate('2026-10-15T23:59:59.999Z', { edge: 'end' }), 'Oct 15, 2026');
  // Without the edge hint, a UTC end-of-day shows as the next Manila day.
  assert.equal(formatPayrollDate('2026-10-15T23:59:59.999Z'), 'Oct 16, 2026');
});

test('custom formats keep the Manila timezone', () => {
  assert.equal(
    formatPayrollDate('2026-09-30T16:00:00.000Z', { edge: 'start', format: { month: 'long', day: 'numeric' } }),
    'October 1',
  );
});

test('missing or invalid values use the fallback', () => {
  assert.equal(formatPayrollDate(null), 'N/A');
  assert.equal(formatPayrollDate('not a date'), 'N/A');
  assert.equal(formatPayrollDate(undefined, {}, ''), '');
});

test('payrollPeriodDayKey returns the calendar day of a period edge', () => {
  assert.equal(payrollPeriodDayKey('2026-09-30T16:00:00.000Z', 'start'), '2026-10-01');
  assert.equal(payrollPeriodDayKey('2026-10-15T23:59:59.999Z', 'end'), '2026-10-15');
  assert.equal(payrollPeriodDayKey('2026-10-15', 'end'), '2026-10-15');
  assert.equal(payrollPeriodDayKey(null, 'start'), null);
});

test('currentSemiMonthlyDayKeys splits on the 15th in Manila', () => {
  const { currentSemiMonthlyDayKeys } = loadPayrollDates();
  assert.deepEqual({ ...currentSemiMonthlyDayKeys(new Date('2026-10-15T15:00:00Z')) }, { start: '2026-10-01', end: '2026-10-15' });
  // 17:00 UTC on the 15th is already the 16th in Manila.
  assert.deepEqual({ ...currentSemiMonthlyDayKeys(new Date('2026-10-15T17:00:00Z')) }, { start: '2026-10-16', end: '2026-10-31' });
  assert.deepEqual({ ...currentSemiMonthlyDayKeys(new Date('2024-02-20T04:00:00Z')) }, { start: '2024-02-16', end: '2024-02-29' });
});

test('currentMonthlyDayKeys covers the whole Manila calendar month', () => {
  const { currentMonthlyDayKeys } = loadPayrollDates();
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2026-10-20T04:00:00Z')) }, { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2026-11-15T04:00:00Z')) }, { start: '2026-11-01', end: '2026-11-30' });
  // 15:00 UTC on Oct 31 is 23:00 in Manila, still October; 17:00 UTC is already Nov 1.
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2026-10-31T15:00:00Z')) }, { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2026-10-31T17:00:00Z')) }, { start: '2026-11-01', end: '2026-11-30' });
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2026-02-10T04:00:00Z')) }, { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual({ ...currentMonthlyDayKeys(new Date('2024-02-10T04:00:00Z')) }, { start: '2024-02-01', end: '2024-02-29' });
});

test('currentPeriodDayKeys follows the cadence, monthly unless semi_monthly', () => {
  const { currentPeriodDayKeys, parsePayrollPeriodCadence } = loadPayrollDates();
  const now = new Date('2026-10-20T04:00:00Z');
  assert.deepEqual({ ...currentPeriodDayKeys('monthly', now) }, { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual({ ...currentPeriodDayKeys('semi_monthly', now) }, { start: '2026-10-16', end: '2026-10-31' });
  assert.equal(parsePayrollPeriodCadence(undefined), 'monthly');
  assert.equal(parsePayrollPeriodCadence(''), 'monthly');
  assert.equal(parsePayrollPeriodCadence('monthly'), 'monthly');
  assert.equal(parsePayrollPeriodCadence('semi_monthly'), 'semi_monthly');
  assert.equal(parsePayrollPeriodCadence(' Semi-Monthly '), 'semi_monthly');
  assert.equal(parsePayrollPeriodCadence('weekly'), 'monthly');
});

// Manila helpers for the payroll calendar (2026-10-28). Each expectation is
// written in UTC so the test means the same in any machine zone; run the suite
// with TZ=America/Los_Angeles to check that.

test('manilaDayKey reads the Manila calendar day of an instant', () => {
  const { manilaDayKey } = loadPayrollDates();
  // 15:59:59.999 UTC is 23:59:59.999 in Manila, 16:00 UTC is already the next day.
  assert.equal(manilaDayKey('2026-10-28T15:59:59.999Z'), '2026-10-28');
  assert.equal(manilaDayKey('2026-10-28T16:00:00.000Z'), '2026-10-29');
  assert.equal(manilaDayKey(new Date('2026-12-31T16:30:00Z')), '2027-01-01');
  // Legacy UTC-midnight rows and Manila-midnight rows read as the same day.
  assert.equal(manilaDayKey('2026-10-28T00:00:00.000Z'), '2026-10-28');
  assert.equal(manilaDayKey('2026-10-27T16:00:00.000Z'), '2026-10-28');
  // Date-only strings are already days; impossible days and junk are null.
  assert.equal(manilaDayKey('2024-02-29'), '2024-02-29');
  assert.equal(manilaDayKey('2026-02-30'), null);
  assert.equal(manilaDayKey('not a date'), null);
  assert.equal(manilaDayKey(null), null);
  assert.equal(manilaDayKey(''), null);
});

test('manilaTodayKey is the Manila date, not the UTC or browser date', () => {
  const { manilaTodayKey } = loadPayrollDates();
  // 17:00 UTC on Oct 31 is 01:00 on Nov 1 in Manila.
  assert.equal(manilaTodayKey(new Date('2026-10-31T17:00:00Z')), '2026-11-01');
  assert.equal(manilaTodayKey(new Date('2026-10-31T15:00:00Z')), '2026-10-31');
  assert.match(manilaTodayKey(), /^\d{4}-\d{2}-\d{2}$/);
});

test('manilaInstant turns a Manila wall-clock time into a UTC instant', () => {
  const { manilaInstant } = loadPayrollDates();
  assert.equal(manilaInstant('2026-10-28', '09:00'), '2026-10-28T01:00:00.000Z');
  assert.equal(manilaInstant('2026-10-28', '00:00'), '2026-10-27T16:00:00.000Z');
  assert.equal(manilaInstant('2026-10-28', '23:59'), '2026-10-28T15:59:00.000Z');
  assert.equal(manilaInstant('2026-10-28', '07:30:15'), '2026-10-27T23:30:15.000Z');
  assert.equal(manilaInstant('2026-10-28', '24:00'), null);
  assert.equal(manilaInstant('2026-10-28', '9:00'), null);
  assert.equal(manilaInstant('2026-13-01', '09:00'), null);
  assert.equal(manilaInstant('', '09:00'), null);
});

test('manilaDayBounds covers one whole Manila day, end inclusive', () => {
  const { manilaDayBounds } = loadPayrollDates();
  assert.deepEqual({ ...manilaDayBounds('2026-10-28') }, {
    startIso: '2026-10-27T16:00:00.000Z',
    endIso: '2026-10-28T15:59:59.999Z',
  });
  // Month and leap-day edges roll over correctly.
  assert.deepEqual({ ...manilaDayBounds('2026-10-31') }, {
    startIso: '2026-10-30T16:00:00.000Z',
    endIso: '2026-10-31T15:59:59.999Z',
  });
  assert.equal(manilaDayBounds('2024-02-29').endIso, '2024-02-29T15:59:59.999Z');
  assert.equal(manilaDayBounds('2026-02-29'), null);
  assert.equal(manilaDayBounds('bad'), null);
});

test('manilaTimeInput and formatPayrollTime show Manila clock times', () => {
  const { manilaTimeInput, formatPayrollTime } = loadPayrollDates();
  assert.equal(manilaTimeInput('2026-10-28T01:05:00Z'), '09:05');
  assert.equal(manilaTimeInput(new Date('2026-10-28T16:30:00Z')), '00:30');
  assert.equal(manilaTimeInput('nope'), null);
  assert.equal(manilaTimeInput(undefined), null);
  // ICU may put a narrow no-break space before AM / PM.
  assert.equal(formatPayrollTime('2026-10-28T01:05:00Z').replace(/\s/g, ' '), '09:05 AM');
  assert.equal(formatPayrollTime('2026-10-28T09:45:00Z').replace(/\s/g, ' '), '05:45 PM');
  assert.equal(formatPayrollTime('nope', 'Open'), 'Open');
});

test('monthDayKeysFor and shiftMonth do month math without a timezone', () => {
  const { monthDayKeysFor, shiftMonth } = loadPayrollDates();
  assert.deepEqual({ ...monthDayKeysFor(2024, 2) }, { start: '2024-02-01', end: '2024-02-29' });
  assert.deepEqual({ ...monthDayKeysFor(2026, 10) }, { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual({ ...shiftMonth(2026, 1, -1) }, { year: 2025, month: 12 });
  assert.deepEqual({ ...shiftMonth(2026, 12, 1) }, { year: 2027, month: 1 });
  assert.deepEqual({ ...shiftMonth(2026, 10, 0) }, { year: 2026, month: 10 });
});

test('manilaDayKey agrees with the time-requests day key the day panel uses', () => {
  const { manilaDayKey } = loadPayrollDates();
  const { getPayrollDayKey } = loadTsModule(path.resolve(__dirname, '../src/lib/time-requests.ts'));
  for (const instant of [
    '2026-10-27T15:59:59.999Z',
    '2026-10-27T16:00:00.000Z',
    '2026-10-28T01:00:00.000Z',
    '2026-10-28T23:30:00.000Z',
    '2026-02-28T16:00:00.000Z',
  ]) {
    assert.equal(manilaDayKey(instant), getPayrollDayKey(instant), instant);
  }
});
