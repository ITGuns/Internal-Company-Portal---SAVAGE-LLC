import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper(relativePath) {
  const helperPath = path.resolve(__dirname, relativePath);
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
    Date,
  }, { filename: helperPath });
  return compiledModule.exports;
}

const helpers = () => loadHelper('../src/lib/time-requests.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

test('overtime hours for a day are the hours above the cap, never negative', () => {
  const { getOvertimeHoursForDay } = helpers();
  assert.equal(getOvertimeHoursForDay(10 * 60, 8), 2);
  assert.equal(getOvertimeHoursForDay(8 * 60 + 45, 8), 0.75);
  assert.equal(getOvertimeHoursForDay(7 * 60, 8), 0);
  assert.equal(getOvertimeHoursForDay(9 * 60, 0), 1, 'falls back to the 8 hour default cap');
  assert.equal(getOvertimeHoursForDay(-30, 8), 0);
});

test('overtime form rejects hours above the overtime actually logged', () => {
  const { validateOvertimeRequestForm } = helpers();
  const base = { workDate: '2026-10-07', hours: '2', reason: '' };

  assert.equal(validateOvertimeRequestForm(base, { maxHours: 2, today: '2026-10-08' }).valid, true);

  const tooMany = validateOvertimeRequestForm({ ...base, hours: '2.5' }, { maxHours: 2 });
  assert.equal(tooMany.valid, false);
  assert.match(tooMany.errors.hours, /up to 2 h/);

  assert.equal(validateOvertimeRequestForm({ ...base, hours: '0' }, { maxHours: 2 }).errors.hours, 'Hours must be more than zero.');
  assert.equal(validateOvertimeRequestForm({ ...base, hours: '' }, { maxHours: 2 }).errors.hours, 'Enter the overtime hours.');
  assert.equal(
    validateOvertimeRequestForm(base, { maxHours: 0 }).errors.hours,
    'This day has no hours above your daily cap.',
  );
  assert.ok(validateOvertimeRequestForm({ ...base, workDate: '10/07/2026' }, { maxHours: 2 }).errors.workDate);
  assert.ok(validateOvertimeRequestForm({ ...base, workDate: '2026-10-09' }, { maxHours: 2, today: '2026-10-08' }).errors.workDate);
  assert.ok(validateOvertimeRequestForm({ ...base, reason: 'x'.repeat(501) }, { maxHours: 2 }).errors.reason);
});

test('adjustment form requires a reason and a valid time range', () => {
  const { validateAdjustmentRequestForm } = helpers();
  const now = new Date('2026-10-08T12:00:00');
  const update = {
    action: 'update',
    timeEntryId: 'entry-1',
    proposedStart: '2026-10-07T09:00',
    proposedEnd: '2026-10-07T17:30',
    reason: 'Forgot to clock out',
  };

  assert.equal(validateAdjustmentRequestForm(update, { now }).valid, true);
  assert.equal(validateAdjustmentRequestForm({ ...update, reason: '   ' }, { now }).errors.reason, 'Explain what needs to change.');
  assert.equal(
    validateAdjustmentRequestForm({ ...update, proposedEnd: '2026-10-07T08:00' }, { now }).errors.proposedEnd,
    'End time must be after the start time.',
  );
  assert.equal(
    validateAdjustmentRequestForm({ ...update, proposedEnd: '2026-10-08T13:00' }, { now }).errors.proposedEnd,
    'End time cannot be in the future.',
  );
  assert.ok(validateAdjustmentRequestForm({ ...update, timeEntryId: undefined }, { now }).errors.timeEntryId);
  assert.ok(validateAdjustmentRequestForm({ ...update, proposedStart: '' }, { now }).errors.proposedStart);
});

test('adjustment times are bounded like the server: 24 hours, not future, 60 days back', () => {
  const { validateAdjustmentRequestForm, MAX_ADJUSTMENT_SPAN_HOURS, MAX_ADJUSTMENT_LOOKBACK_DAYS, MAX_REASON_LENGTH } = helpers();
  assert.equal(MAX_ADJUSTMENT_SPAN_HOURS, 24);
  assert.equal(MAX_ADJUSTMENT_LOOKBACK_DAYS, 60);
  assert.equal(MAX_REASON_LENGTH, 500);
  const now = new Date('2026-10-08T12:00:00');
  const form = (proposedStart, proposedEnd) => ({ action: 'create', proposedStart, proposedEnd, reason: 'Missed clock in' });

  assert.equal(validateAdjustmentRequestForm(form('2026-10-07T09:00', '2026-10-08T09:00'), { now }).valid, true, 'exactly 24 hours');
  assert.match(
    validateAdjustmentRequestForm(form('2026-10-07T08:00', '2026-10-08T09:00'), { now }).errors.proposedEnd,
    /at most 24 hours/,
  );
  assert.equal(
    validateAdjustmentRequestForm(form('2026-10-08T13:00', '2026-10-08T14:00'), { now }).errors.proposedStart,
    'Start time cannot be in the future.',
  );
  assert.match(
    validateAdjustmentRequestForm(form('2026-08-01T09:00', '2026-08-01T17:00'), { now }).errors.proposedStart,
    /60 days/,
  );
});

test('overtime minutes are bucketed by the Manila payroll day, not the browser day', () => {
  const { getPayrollDayKey, getPayrollDayMinutes, getOvertimeHoursForDay, PAYROLL_TIME_ZONE } = helpers();
  assert.equal(PAYROLL_TIME_ZONE, 'Asia/Manila');
  // 23:30 UTC on Jul 1 is already Jul 2 in Manila.
  assert.equal(getPayrollDayKey('2026-07-01T23:30:00Z'), '2026-07-02');
  assert.equal(getPayrollDayKey('2026-07-01T15:59:00Z'), '2026-07-01');
  assert.equal(getPayrollDayKey('2026-07-01T23:30:00Z', 'UTC'), '2026-07-01');
  assert.equal(getPayrollDayKey('not a date'), null);

  const entries = [
    { start: '2026-07-01T10:00:00Z', end: '2026-07-01T15:00:00Z', durationMin: 300 }, // 18:00 Manila Jul 1
    { start: '2026-07-01T15:00:00Z', end: '2026-07-01T20:00:00Z' }, // 23:00 Manila Jul 1, no durationMin
    { start: '2026-07-01T17:00:00Z', end: '2026-07-01T18:00:00Z', durationMin: 60 }, // 01:00 Manila Jul 2
    { start: '2026-07-01T09:00:00Z' }, // still open: not counted
  ];
  assert.equal(getPayrollDayMinutes(entries, '2026-07-01'), 600);
  assert.equal(getPayrollDayMinutes(entries, '2026-07-02'), 60);
  assert.equal(getOvertimeHoursForDay(getPayrollDayMinutes(entries, '2026-07-01'), 8), 2);
});

test('adjustment create needs both times, delete needs only the entry and reason', () => {
  const { validateAdjustmentRequestForm } = helpers();
  const now = new Date('2026-10-08T12:00:00');

  const create = validateAdjustmentRequestForm({
    action: 'create', proposedStart: '2026-10-07T09:00', proposedEnd: '', reason: 'Missed clock in',
  }, { now });
  assert.equal(create.errors.proposedEnd, 'Enter the correct end time.');
  assert.equal(create.errors.timeEntryId, undefined, 'create has no entry id');

  const remove = validateAdjustmentRequestForm({
    action: 'delete', timeEntryId: 'entry-1', proposedStart: '', proposedEnd: '', reason: 'Duplicate entry',
  }, { now });
  assert.equal(remove.valid, true);
});

test('approved hours can only be lowered', () => {
  const { validateApprovedHours } = helpers();
  assert.deepEqual(plain(validateApprovedHours('', 3)), { valid: true });
  assert.deepEqual(plain(validateApprovedHours('2.5', 3)), { valid: true, hours: 2.5 });
  assert.equal(validateApprovedHours('3.5', 3).valid, false);
  assert.equal(validateApprovedHours('0', 3).valid, false);
});

test('request filters by status and person, and counts pending', () => {
  const { filterTimeRequests, countPending } = helpers();
  const rows = [
    { id: '1', status: 'pending', userId: 'a' },
    { id: '2', status: 'approved', userId: 'a' },
    { id: '3', status: 'pending', userId: 'b' },
  ];
  assert.deepEqual(filterTimeRequests(rows, { status: 'pending' }).map((r) => r.id).join(), ['1', '3'].join());
  assert.deepEqual(filterTimeRequests(rows, { status: 'all', userId: 'a' }).map((r) => r.id).join(), ['1', '2'].join());
  assert.deepEqual(filterTimeRequests(rows, {}).map((r) => r.id).join(), ['1', '2', '3'].join());
  assert.equal(countPending(rows), 2);
});

test('datetime-local helpers round-trip and reject blanks', () => {
  const { localInputToIso, isoToLocalInput } = helpers();
  assert.equal(localInputToIso(''), undefined);
  assert.equal(localInputToIso('not a date'), undefined);
  const iso = localInputToIso('2026-10-07T09:15');
  assert.equal(isoToLocalInput(iso), '2026-10-07T09:15');
  assert.equal(isoToLocalInput(null), '');
});

test('pay basis validation follows the chosen basis', () => {
  const { validatePayBasisConfig, getEffectiveHourlyRate, getPayBasisLabel } = loadHelper('../src/lib/pay-basis.ts');
  const base = { payBasis: 'hourly_from_monthly', baseSalary: '30000', hourlyRate: '', overtimeMultiplier: '1.25' };

  assert.equal(validatePayBasisConfig(base).valid, true);
  assert.ok(validatePayBasisConfig({ ...base, baseSalary: '' }).errors.baseSalary);
  assert.ok(validatePayBasisConfig({ ...base, payBasis: 'fixed_monthly', baseSalary: '0' }).errors.baseSalary);

  const hourly = { ...base, payBasis: 'hourly_rate', baseSalary: '' };
  assert.ok(validatePayBasisConfig(hourly).errors.hourlyRate, 'hourly basis needs a rate');
  assert.equal(validatePayBasisConfig({ ...hourly, hourlyRate: '250' }).valid, true, 'salary not needed for hourly');

  assert.ok(validatePayBasisConfig({ ...base, overtimeMultiplier: '0.9' }).errors.overtimeMultiplier);
  assert.ok(validatePayBasisConfig({ ...base, payBasis: 'weekly' }).errors.payBasis);

  assert.equal(getEffectiveHourlyRate('hourly_rate', 250, 170), 250);
  assert.equal(getEffectiveHourlyRate('fixed_monthly', 250, 170), 170);
  assert.equal(getPayBasisLabel(undefined), 'Hourly from monthly salary');
  assert.equal(getPayBasisLabel('hourly_rate'), 'Hourly rate');
});

test('hard delete needs the exact typed phrase', () => {
  const { getHardDeleteConfirmationPhrase, isHardDeleteConfirmed, isInactiveMember } = loadHelper('../src/lib/member-status.ts');
  assert.equal(getHardDeleteConfirmationPhrase(' Ana@Example.com '), 'delete ana@example.com');
  assert.equal(isHardDeleteConfirmed('delete ana@example.com', 'ana@example.com'), true);
  assert.equal(isHardDeleteConfirmed('  DELETE ana@example.com ', 'ana@example.com'), true);
  assert.equal(isHardDeleteConfirmed('delete', 'ana@example.com'), false);
  assert.equal(isHardDeleteConfirmed('', 'ana@example.com'), false);
  assert.equal(isInactiveMember('inactive'), true);
  assert.equal(isInactiveMember('active'), false);
});

test('describeOvertimeHours keeps the original ask visible after review', () => {
  const { describeOvertimeHours, paidRequestHours } = helpers();
  assert.equal(describeOvertimeHours({ status: 'pending', hours: 3 }), '3 h asked');
  assert.equal(describeOvertimeHours({ status: 'approved', hours: 3, approvedHours: 2 }), 'asked 3 h, approved 2 h');
  assert.equal(describeOvertimeHours({ status: 'approved', hours: 3, approvedHours: 3 }), '3 h approved');
  assert.equal(describeOvertimeHours({ status: 'approved', hours: 3, approvedHours: null }), '3 h approved');
  assert.equal(paidRequestHours({ status: 'approved', hours: 3, approvedHours: 2 }), 2);
  assert.equal(paidRequestHours({ status: 'approved', hours: 3 }), 3);
  assert.equal(paidRequestHours({ status: 'rejected', hours: 3 }), 0);
});

test('isOwnRequest compares ids as strings', () => {
  const { isOwnRequest } = helpers();
  assert.equal(isOwnRequest({ userId: 'u1' }, 'u1'), true);
  assert.equal(isOwnRequest({ userId: '7' }, 7), true);
  assert.equal(isOwnRequest({ userId: 'u1' }, 'u2'), false);
  assert.equal(isOwnRequest({ userId: 'u1' }, null), false);
});

test('correctionTimes shows the entry before and after the change', () => {
  const { correctionTimes } = helpers();
  const pending = correctionTimes({
    status: 'pending', action: 'update', proposedEnd: '2026-10-05T11:00:00Z',
    timeEntry: { start: '2026-10-05T01:00:00Z', end: '2026-10-05T09:00:00Z' },
  });
  assert.equal(pending.before.end, '2026-10-05T09:00:00Z');
  assert.equal(pending.after.start, '2026-10-05T01:00:00Z');
  assert.equal(pending.after.end, '2026-10-05T11:00:00Z');
  const approved = correctionTimes({
    status: 'approved', action: 'update', proposedEnd: '2026-10-05T11:00:00Z',
    previousStart: '2026-10-05T01:00:00Z', previousEnd: '2026-10-05T09:00:00Z',
    timeEntry: { start: '2026-10-05T01:00:00Z', end: '2026-10-05T11:00:00Z' },
  });
  assert.equal(approved.before.end, '2026-10-05T09:00:00Z', 'old times come from the copy taken at approval');
  assert.equal(correctionTimes({ status: 'pending', action: 'create', proposedStart: 'a', proposedEnd: 'b' }).before, null);
  assert.equal(correctionTimes({ status: 'approved', action: 'delete', previousStart: 'a', previousEnd: 'b' }).after, null);
});

test('requestsForDay buckets requests by Manila day', () => {
  const { requestsForDay, claimedOvertimeHours } = helpers();
  // workDate is Manila midnight stored as UTC (16:00 the day before).
  const overtime = [
    { id: 'a', workDate: '2026-10-04T16:00:00.000Z', status: 'approved', hours: 3, approvedHours: 2 },
    { id: 'b', workDate: '2026-10-05T16:00:00.000Z', status: 'pending', hours: 1 },
  ];
  const corrections = [
    { id: 'c', proposedStart: '2026-10-04T17:30:00.000Z' }, // 01:30 Oct 5 Manila
    { id: 'd', proposedStart: null, timeEntry: { start: '2026-10-05T02:00:00.000Z' } },
  ];
  const day = requestsForDay(overtime, corrections, '2026-10-05');
  assert.deepEqual(day.overtime.map((r) => r.id), ['a']);
  assert.deepEqual(day.corrections.map((r) => r.id), ['c', 'd']);
  assert.equal(claimedOvertimeHours([...overtime, { status: 'rejected', hours: 5 }]), 3);
});
