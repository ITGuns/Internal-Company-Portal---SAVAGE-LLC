import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule, plain } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// time-entry-form.ts imports lib/payroll-dates.ts; the loader resolves it.
// The form works in Manila wall-clock time, so instants below carry +08:00 or Z.
function loadTimeEntryFormHelper() {
  return loadTsModule(path.resolve(__dirname, '../src/lib/payroll-calendar/time-entry-form.ts'));
}

test('prefills edit form values from an existing time entry', () => {
  const { getTimeEntryFormDefaults } = loadTimeEntryFormHelper();

  const defaults = getTimeEntryFormDefaults({
    entry: {
      id: 'entry-1',
      userId: 'user-1',
      start: '2026-05-21T09:15:00+08:00',
      end: '2026-05-21T18:45:00+08:00',
      notes: 'Client work',
    },
    fallbackUserId: 'fallback-user',
  });

  assert.equal(defaults.manualDate, '2026-05-21');
  assert.equal(defaults.manualIn, '09:15');
  assert.equal(defaults.manualOut, '18:45');
  assert.equal(defaults.manualNotes, 'Client work');
  assert.equal(defaults.selectedUserId, 'user-1');
});

test('validates manual entry fields before API submission', () => {
  const { validateTimeEntryForm } = loadTimeEntryFormHelper();

  const result = validateTimeEntryForm({
    manualDate: '2026-05-21',
    manualIn: '18:00',
    manualOut: '09:00',
    manualNotes: '',
    selectedUserId: '',
    isPrivilegedUser: true,
    todayDate: '2026-05-21',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    userId: 'Employee is required',
    timeOut: 'Time Out must be after Time In',
    notes: 'Notes are required',
  });
});

test('an edited entry shows its Manila day and times whatever the browser zone', () => {
  const { getTimeEntryFormDefaults } = loadTimeEntryFormHelper();
  // 16:30 to 18:00 UTC on Oct 27 is 00:30 to 02:00 on Oct 28 in Manila.
  const defaults = getTimeEntryFormDefaults({
    entry: { id: 'entry-2', start: '2026-10-27T16:30:00.000Z', end: '2026-10-27T18:00:00.000Z' },
  });
  assert.equal(defaults.manualDate, '2026-10-28');
  assert.equal(defaults.manualIn, '00:30');
  assert.equal(defaults.manualOut, '02:00');

  const blank = getTimeEntryFormDefaults({ initialDate: '2026-10-05' });
  assert.deepEqual(plain(blank), {
    manualDate: '2026-10-05',
    manualIn: '09:00',
    manualOut: '17:00',
    manualNotes: '',
    selectedUserId: '',
  });
});

test('builds the payload as Manila instants: 09:00 to 17:00 is 01:00 to 09:00 UTC', () => {
  const { buildTimeEntryPayload } = loadTimeEntryFormHelper();
  const payload = buildTimeEntryPayload({
    manualDate: '2026-10-28',
    manualIn: '09:00',
    manualOut: '17:00',
    manualNotes: '  Client visit  ',
    selectedUserId: 'user-9',
  });
  assert.deepEqual(plain(payload), {
    startIso: '2026-10-28T01:00:00.000Z',
    endIso: '2026-10-28T09:00:00.000Z',
    notes: 'Client visit',
    userId: 'user-9',
  });
  assert.throws(() => buildTimeEntryPayload({
    manualDate: '2026-02-30', manualIn: '09:00', manualOut: '17:00', manualNotes: 'x', selectedUserId: 'u',
  }), /Invalid date or time/);
});

test('the future-date check uses the Manila date', () => {
  const { getTodayDateInput, validateTimeEntryForm } = loadTimeEntryFormHelper();
  // 17:00 UTC on Oct 27 is already Oct 28 in Manila.
  const today = getTodayDateInput(new Date('2026-10-27T17:00:00Z'));
  assert.equal(today, '2026-10-28');
  const base = { manualIn: '09:00', manualOut: '10:00', manualNotes: 'x', selectedUserId: 'u', isPrivilegedUser: true };
  assert.equal(validateTimeEntryForm({ ...base, manualDate: '2026-10-28', todayDate: today }).date, undefined);
  assert.equal(validateTimeEntryForm({ ...base, manualDate: '2026-10-29', todayDate: today }).date, 'Date cannot be in the future');
  assert.equal(validateTimeEntryForm({ ...base, manualDate: '2026-10-28', manualOut: '09:00', todayDate: today }).timeOut, 'Time Out must be after Time In');
});
