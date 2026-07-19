import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTimeUtils() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/time-utils.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('calculateMonthlySalary rounds annual salary / 12', () => {
  const { calculateMonthlySalary } = loadTimeUtils();
  assert.equal(calculateMonthlySalary(120000), 10000);
  assert.equal(calculateMonthlySalary(100000), 8333); // round(8333.33)
});

test('getWorkDays counts Mon-Fri, handling leap February', () => {
  const { getWorkDays } = loadTimeUtils();
  assert.equal(getWorkDays(1, 2026), 20); // Feb 2026 (28d, starts Sun)
  assert.equal(getWorkDays(1, 2024), 21); // Feb 2024 (leap, 29d)
  assert.equal(getWorkDays(2, 2026), 22); // Mar 2026 (31d)
});

test('calculateEntryHours returns clocked hours, clamped non-negative', () => {
  const { calculateEntryHours } = loadTimeUtils();
  assert.equal(
    calculateEntryHours({ date: '2026-05-21', clockIn: '08:00', clockOut: '12:30', type: 'work' }),
    4.5,
  );
  // No clock-out yet → zero.
  assert.equal(calculateEntryHours({ date: '2026-05-21', clockIn: '08:00', type: 'work' }), 0);
  // Clock-out before clock-in → clamped to zero, never negative.
  assert.equal(
    calculateEntryHours({ date: '2026-05-21', clockIn: '12:00', clockOut: '08:00', type: 'work' }),
    0,
  );
});

test('calculateMonthlyHours sums only work entries in the given month', () => {
  const { calculateMonthlyHours } = loadTimeUtils();
  const entries = [
    { date: '2026-05-05', clockIn: '08:00', clockOut: '12:00', type: 'work' }, // 4h May
    { date: '2026-05-20', clockIn: '09:00', clockOut: '17:00', type: 'work' }, // 8h May
    { date: '2026-05-10', clockIn: '08:00', clockOut: '16:00', type: 'leave' }, // excluded: not work
    { date: '2026-06-01', clockIn: '08:00', clockOut: '12:00', type: 'work' }, // excluded: June
  ];
  assert.equal(calculateMonthlyHours(entries, 4, 2026), 12); // May = month index 4
  assert.equal(calculateMonthlyHours(entries, 5, 2026), 4);  // June
});

test('formatTime zero-pads hours and minutes', () => {
  const { formatTime } = loadTimeUtils();
  assert.equal(formatTime(new Date(2026, 0, 1, 9, 5)), '09:05');
  assert.equal(formatTime(new Date(2026, 0, 1, 14, 0)), '14:00');
});

test('getMonthName maps index to name with a fallback', () => {
  const { getMonthName } = loadTimeUtils();
  assert.equal(getMonthName(0), 'January');
  assert.equal(getMonthName(11), 'December');
  assert.equal(getMonthName(99), 'Unknown');
});
