import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadBackfillHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/backfill-hours.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports }, { filename: helperPath });
  return compiledModule.exports;
}

const helpers = loadBackfillHelpers();
const TODAY = '2026-10-14';

function form(overrides = {}) {
  return { ...helpers.getBackfillDefaults(TODAY, 'user-1'), ...overrides };
}

test('defaults run from October 1 to yesterday, 09:00 to 17:00, weekends skipped', () => {
  assert.deepEqual({ ...helpers.getBackfillDefaults(TODAY, 'user-1') }, {
    userId: 'user-1',
    startDate: '2026-10-01',
    endDate: '2026-10-13',
    startTime: '09:00',
    endTime: '17:00',
    skipWeekends: true,
    notes: '',
  });
  // Later in the year the default start moves up so the range stays within 62 days.
  const late = helpers.getBackfillDefaults('2026-12-20');
  assert.equal(late.endDate, '2026-12-19');
  assert.equal(late.startDate, '2026-10-18');
  assert.deepEqual({ ...helpers.validateBackfillForm({ ...late, userId: 'u' }, '2026-12-20') }, {});
});

test('payroll today is the Manila calendar day', () => {
  // 17:00 UTC on Oct 13 is already 01:00 on Oct 14 in Manila.
  assert.equal(helpers.payrollTodayKey(new Date('2026-10-13T17:00:00Z'), 'Asia/Manila'), '2026-10-14');
  assert.equal(helpers.payrollTodayKey(new Date('2026-10-13T15:00:00Z'), 'Asia/Manila'), '2026-10-13');
});

test('validation mirrors the server rules', () => {
  assert.deepEqual({ ...helpers.validateBackfillForm(form(), TODAY) }, {});
  assert.equal(helpers.validateBackfillForm(form({ userId: '' }), TODAY).userId, 'Choose an employee.');
  assert.equal(helpers.validateBackfillForm(form({ endDate: '2026-10-15' }), TODAY).endDate, 'The end date cannot be in the future.');
  assert.deepEqual({ ...helpers.validateBackfillForm(form({ endDate: TODAY }), TODAY) }, {}, 'today is allowed');
  assert.equal(
    helpers.validateBackfillForm(form({ startDate: '2026-10-05', endDate: '2026-10-04' }), TODAY).endDate,
    'The end date must be on or after the start date.',
  );
  assert.deepEqual({ ...helpers.validateBackfillForm(form({ startDate: '2026-08-01', endDate: '2026-10-02' }), TODAY) }, {}, '62 days is allowed');
  assert.equal(
    helpers.validateBackfillForm(form({ startDate: '2026-08-01', endDate: '2026-10-03' }), TODAY).endDate,
    'The end date can be at most 62 days after the start date.',
  );
  assert.equal(helpers.validateBackfillForm(form({ startDate: '2026-02-30' }), TODAY).startDate, 'Enter a valid start date.');
  assert.deepEqual({ ...helpers.validateBackfillForm(form({ startTime: '18:00', endTime: '09:00' }), TODAY) }, {}, 'ends the next day');
  assert.equal(
    helpers.validateBackfillForm(form({ startTime: '09:00', endTime: '09:00' }), TODAY).endTime,
    'The end time cannot be the same as the start time.',
  );
  assert.equal(helpers.validateBackfillForm(form({ endTime: '' }), TODAY).endTime, 'Enter an end time.');
  assert.deepEqual({ ...helpers.validateBackfillForm(form({ startTime: '00:00', endTime: '23:59' }), TODAY) }, {}, 'longest same-day window');
  assert.equal(helpers.validateBackfillForm(form({ notes: 'x'.repeat(501) }), TODAY).notes, 'Notes can be at most 500 characters.');
});

test('an end time earlier than the start ends the next day, never 24 hours', () => {
  assert.equal(helpers.backfillWindowMinutes('22:00', '06:00'), 8 * 60);
  assert.deepEqual({ ...helpers.validateBackfillForm(form({ startTime: '22:00', endTime: '06:00' }), TODAY) }, {});
  assert.equal(helpers.backfillWindowMinutes('09:00', '17:00'), 8 * 60);
  assert.equal(helpers.backfillWindowMinutes('09:00', '08:59'), 24 * 60 - 1, 'longest overnight window');
  assert.equal(helpers.backfillWindowMinutes('09:00', '09:00'), null);
  assert.equal(helpers.backfillWindowMinutes('09:00', ''), null);

  const result = { created: 0, days: ['2026-10-12', '2026-10-13'], skipped: [] };
  assert.equal(
    helpers.backfillPreviewMessage(result, { startTime: '22:00', endTime: '06:00' }),
    '2 days will be created (8 h each, ending the next day), 0 skipped (weekends 0, existing 0).',
  );
  assert.equal(
    helpers.backfillPreviewMessage(result, { startTime: '09:00', endTime: '16:30' }),
    '2 days will be created (7.5 h each), 0 skipped (weekends 0, existing 0).',
  );
});

test('payload trims notes and carries the dry-run flag', () => {
  assert.deepEqual({ ...helpers.buildBackfillPayload(form({ notes: '  Paper timesheet ' }), true) }, {
    userId: 'user-1',
    startDate: '2026-10-01',
    endDate: '2026-10-13',
    startTime: '09:00',
    endTime: '17:00',
    skipWeekends: true,
    notes: 'Paper timesheet',
    dryRun: true,
  });
  assert.equal('notes' in helpers.buildBackfillPayload(form({ notes: '   ' }), false), false);
});

test('preview message counts weekends and existing entries', () => {
  const result = {
    created: 0,
    days: ['2026-10-01', '2026-10-02', '2026-10-05'],
    skipped: ['2026-10-03: weekend', '2026-10-04: weekend', '2026-10-06: existing entry'],
  };
  assert.deepEqual({ ...helpers.countSkipped(result.skipped) }, { weekends: 2, existing: 1 });
  assert.equal(helpers.backfillPreviewMessage(result), '3 days will be created, 3 skipped (weekends 2, existing 1).');
  assert.equal(
    helpers.backfillPreviewMessage({ created: 0, days: ['2026-10-01'], skipped: [] }),
    '1 day will be created, 0 skipped (weekends 0, existing 0).',
  );
});
