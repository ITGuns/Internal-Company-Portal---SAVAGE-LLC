import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

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
