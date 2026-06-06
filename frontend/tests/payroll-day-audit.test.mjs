import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPayrollDayAuditHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/day-audit.ts');
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

test('summarizes a payroll day with sorted entries and total minutes', () => {
  const { getPayrollDayAudit } = loadPayrollDayAuditHelper();

  const audit = getPayrollDayAudit([
    {
      id: 'late',
      start: '2026-05-21T13:00:00',
      end: '2026-05-21T15:00:00',
      durationMin: 120,
    },
    {
      id: 'early',
      start: '2026-05-21T08:00:00',
      end: '2026-05-21T12:00:00',
      durationMin: 240,
    },
    {
      id: 'other-day',
      start: '2026-05-20T08:00:00',
      end: '2026-05-20T09:00:00',
      durationMin: 60,
    },
  ], {
    date: '2026-05-21',
    now: '2026-05-21T16:00:00',
  });

  assert.equal(audit.totalMinutes, 360);
  assert.deepEqual(Array.from(audit.entries, (entry) => entry.id), ['early', 'late']);
  assert.equal(audit.hasActiveEntry, false);
  assert.equal(audit.warnings.length, 0);
});

test('flags missing clock-out, overlapping entries, long shifts, and zero-duration rows', () => {
  const { getPayrollDayAudit } = loadPayrollDayAuditHelper();

  const audit = getPayrollDayAudit([
    {
      id: 'long',
      start: '2026-05-21T00:00:00',
      end: '2026-05-21T13:00:00',
      durationMin: 780,
    },
    {
      id: 'overlap',
      start: '2026-05-21T12:30:00',
      end: '2026-05-21T14:00:00',
      durationMin: 90,
    },
    {
      id: 'zero',
      start: '2026-05-21T15:00:00',
      end: '2026-05-21T15:00:00',
      durationMin: 0,
    },
    {
      id: 'active',
      start: '2026-05-21T16:00:00',
    },
  ], {
    date: '2026-05-21',
    now: '2026-05-21T17:00:00',
  });

  assert.equal(audit.hasActiveEntry, true);
  assert.deepEqual(Array.from(audit.warnings, (warning) => warning.code), [
    'missing_clock_out',
    'overlapping_entries',
    'long_shift',
    'zero_duration',
  ]);
});
