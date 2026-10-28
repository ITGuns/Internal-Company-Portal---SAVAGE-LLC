import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// day-audit.ts imports lib/payroll-dates.ts; the loader resolves it.
// Instants carry the Manila offset (+08:00) so the tests mean the same in any machine zone.
function loadPayrollDayAuditHelper() {
  return loadTsModule(path.resolve(__dirname, '../src/lib/payroll-calendar/day-audit.ts'));
}

test('summarizes a payroll day with sorted entries and total minutes', () => {
  const { getPayrollDayAudit } = loadPayrollDayAuditHelper();

  const audit = getPayrollDayAudit([
    {
      id: 'late',
      start: '2026-05-21T13:00:00+08:00',
      end: '2026-05-21T15:00:00+08:00',
      durationMin: 120,
    },
    {
      id: 'early',
      start: '2026-05-21T08:00:00+08:00',
      end: '2026-05-21T12:00:00+08:00',
      durationMin: 240,
    },
    {
      id: 'other-day',
      start: '2026-05-20T08:00:00+08:00',
      end: '2026-05-20T09:00:00+08:00',
      durationMin: 60,
    },
  ], {
    date: '2026-05-21',
    now: '2026-05-21T16:00:00+08:00',
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
      start: '2026-05-21T00:00:00+08:00',
      end: '2026-05-21T13:00:00+08:00',
      durationMin: 780,
    },
    {
      id: 'overlap',
      start: '2026-05-21T12:30:00+08:00',
      end: '2026-05-21T14:00:00+08:00',
      durationMin: 90,
    },
    {
      id: 'zero',
      start: '2026-05-21T15:00:00+08:00',
      end: '2026-05-21T15:00:00+08:00',
      durationMin: 0,
    },
    {
      id: 'active',
      start: '2026-05-21T16:00:00+08:00',
    },
  ], {
    date: '2026-05-21',
    now: '2026-05-21T17:00:00+08:00',
  });

  assert.equal(audit.hasActiveEntry, true);
  assert.deepEqual(Array.from(audit.warnings, (warning) => warning.code), [
    'missing_clock_out',
    'overlapping_entries',
    'long_shift',
    'zero_duration',
  ]);
});

test('buckets entries by the Manila day of their start, like the server', () => {
  const { getPayrollDayAudit } = loadPayrollDayAuditHelper();
  const entries = [
    // 23:30 Manila on Oct 27 (15:30 UTC): still Oct 27.
    { id: 'late-27', start: '2026-10-27T15:30:00.000Z', end: '2026-10-27T15:50:00.000Z', durationMin: 20 },
    // 00:30 Manila on Oct 28 (16:30 UTC on Oct 27): a UTC or US browser would call this Oct 27.
    { id: 'early-28', start: '2026-10-27T16:30:00.000Z', end: '2026-10-27T18:30:00.000Z', durationMin: 120 },
    // 09:00 Manila on Oct 28.
    { id: 'morning-28', start: '2026-10-28T01:00:00.000Z', end: '2026-10-28T09:00:00.000Z', durationMin: 480 },
  ];

  const oct28 = getPayrollDayAudit(entries, { date: '2026-10-28', now: '2026-10-28T10:00:00.000Z' });
  assert.deepEqual(Array.from(oct28.entries, (entry) => entry.id), ['early-28', 'morning-28']);
  assert.equal(oct28.totalMinutes, 600);

  const oct27 = getPayrollDayAudit(entries, { date: '2026-10-27', now: '2026-10-28T10:00:00.000Z' });
  assert.deepEqual(Array.from(oct27.entries, (entry) => entry.id), ['late-27']);
});
