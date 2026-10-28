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
  const { outputText } = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, console, Date, Intl }, { filename: helperPath });
  return compiledModule.exports;
}

const options = () => loadHelper('../src/lib/payroll-options.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

const schemes = [
  { id: 's1', key: 'fixed_22_days', name: '22 credited days', kind: 'fixed_days', value: 22, maxCreditedDays: 22, isDefault: true, sortOrder: 0, archived: false, inUseCount: 3 },
  { id: 's2', key: 'weekdays', name: 'Weekdays of month', kind: 'weekdays', value: null, maxCreditedDays: null, isDefault: false, sortOrder: 1, archived: false, inUseCount: 1 },
  { id: 's3', key: 'flat_160_hours', name: 'Flat 160 hours', kind: 'fixed_hours', value: 160, maxCreditedDays: null, isDefault: false, sortOrder: 4, archived: false },
  { id: 's4', key: 'flat_24_days', name: 'Flat 24 days', kind: 'fixed_days', value: 24, maxCreditedDays: null, isDefault: false, sortOrder: 5, archived: true, inUseCount: 0 },
];

test('schemes resolve by key, unknown keys get the default row', () => {
  const { findScheme, getDefaultScheme } = options();
  assert.equal(findScheme(schemes, 'weekdays').name, 'Weekdays of month');
  assert.equal(findScheme(schemes, 'flat_24_days').name, 'Flat 24 days', 'archived rows still resolve');
  assert.equal(findScheme(schemes, 'flat_31').key, 'fixed_22_days');
  assert.equal(findScheme(schemes, null).key, 'fixed_22_days');
  assert.equal(findScheme(undefined, 'weekdays'), undefined, 'nothing until the list loads');
  assert.equal(getDefaultScheme(schemes).key, 'fixed_22_days');
});

test('scheme details are plain sentences', () => {
  const { describeScheme } = options();
  assert.equal(describeScheme(schemes[0]), 'Monthly salary divided by 22 days, at most 22 days credited per month');
  assert.equal(describeScheme(schemes[1]), 'Monthly salary divided by the weekdays in the month');
  assert.equal(describeScheme(schemes[2]), 'Monthly salary divided by 160 hours');
  assert.equal(describeScheme({ kind: 'fixed_days', value: 21.75, maxCreditedDays: 21.5 }), 'Monthly salary divided by 21.75 days, at most 21.5 days credited per month');
});

test('selects offer active rows plus the current archived or unknown value', () => {
  const { selectableSchemes, selectableOptions, getOptionLabel, inUseLabel } = options();
  assert.deepEqual(plain(selectableSchemes(schemes, 'weekdays').map((row) => row.key)), ['fixed_22_days', 'weekdays', 'flat_160_hours']);
  assert.deepEqual(plain(selectableSchemes(schemes, 'flat_24_days').map((row) => row.key)), ['fixed_22_days', 'weekdays', 'flat_160_hours', 'flat_24_days']);

  const frequencies = [
    { id: 'o2', category: 'payment_frequency', value: 'Semi-Monthly', label: 'Semi-Monthly (twice a month)', isDefault: false, sortOrder: 1, archived: false },
    { id: 'o1', category: 'payment_frequency', value: 'Monthly', label: 'Monthly (once a month)', isDefault: true, sortOrder: 0, archived: false },
    { id: 'o3', category: 'payment_frequency', value: 'Weekly', label: 'Weekly', isDefault: false, sortOrder: 3, archived: true },
  ];
  assert.deepEqual(plain(selectableOptions(frequencies, 'Monthly')), [
    { value: 'Monthly', label: 'Monthly (once a month)', archived: false },
    { value: 'Semi-Monthly', label: 'Semi-Monthly (twice a month)', archived: false },
  ]);
  assert.equal(selectableOptions(frequencies, 'Weekly').at(-1).archived, true, 'the archived current value stays selectable');
  assert.deepEqual(plain(selectableOptions(frequencies, 'Every 10 days')[0]), { value: 'Every 10 days', label: 'Every 10 days', archived: false }, 'an old value not in the list is kept');
  assert.equal(getOptionLabel(frequencies, 'Monthly'), 'Monthly (once a month)');
  assert.equal(getOptionLabel(frequencies, 'Every 10 days'), 'Every 10 days');
  assert.equal(getOptionLabel(frequencies, null), '');
  assert.equal(inUseLabel(0), 'Not in use');
  assert.equal(inUseLabel(1), 'In use by 1 employee');
  assert.equal(inUseLabel(4), 'In use by 4 employees');
  assert.equal(inUseLabel(undefined), '');
});

test('scheme drafts use the server rules and messages', () => {
  const { validateSchemeDraft, toSchemePayload, schemeToDraft, validateOptionDraft } = options();
  const ok = { name: 'Flat 24 days', kind: 'fixed_days', value: '24', maxCreditedDays: '' };
  assert.equal(validateSchemeDraft(ok).valid, true);
  assert.deepEqual(plain(toSchemePayload(ok)), { name: 'Flat 24 days', kind: 'fixed_days', value: 24, maxCreditedDays: null });
  assert.deepEqual(plain(toSchemePayload({ ...ok, kind: 'weekdays', maxCreditedDays: '22' })), { name: 'Flat 24 days', kind: 'weekdays', value: null, maxCreditedDays: 22 });
  assert.deepEqual(plain(schemeToDraft(schemes[1])), { name: 'Weekdays of month', kind: 'weekdays', value: '', maxCreditedDays: '' });

  const errors = (draft) => plain(validateSchemeDraft(draft).errors);
  assert.equal(errors({ ...ok, name: ' x ' }).name, 'Use 2 to 60 characters.');
  assert.match(errors({ ...ok, kind: 'monthly' }).kind, /^Choose how the salary is divided/);
  assert.equal(errors({ ...ok, value: '' }).value, 'Enter the days the monthly salary is divided by, from 10 to 31.');
  assert.equal(errors({ ...ok, value: '32' }).value, 'Enter the days the monthly salary is divided by, from 10 to 31.');
  assert.equal(errors({ ...ok, kind: 'fixed_hours', value: '0' }).value, 'Enter the hours the monthly salary is divided by, from 40 to 744.');
  assert.equal(errors({ ...ok, kind: 'weekdays', value: '' }).value, undefined, 'weekdays needs no value');
  assert.equal(errors({ ...ok, value: '2.2' }).value, 'Enter the days the monthly salary is divided by, from 10 to 31.', 'a 2.2 for 22 typo is refused');
  assert.equal(errors({ ...ok, kind: 'fixed_hours', value: '16' }).value, 'Enter the hours the monthly salary is divided by, from 40 to 744.', 'a 16 for 160 typo is refused');
  assert.equal(errors({ ...ok, maxCreditedDays: '0' }).maxCreditedDays, 'Credited days must be between 1 and 31, or empty for no cap.');
  assert.equal(errors({ ...ok, maxCreditedDays: '31.5' }).maxCreditedDays, 'Credited days must be between 1 and 31, or empty for no cap.');
  assert.equal(validateSchemeDraft({ ...ok, maxCreditedDays: '21.75' }).valid, true);

  assert.equal(validateOptionDraft({ label: 'Probationary' }).valid, true);
  assert.equal(plain(validateOptionDraft({ label: 'P' }).errors).label, 'Use 2 to 60 characters.');
});

test('live rates follow the scheme row like the server', () => {
  const { computeSchemeRates, weekdaysInMonth } = options();
  const july = new Date(2026, 6, 15);
  assert.equal(weekdaysInMonth(july), 23);
  assert.deepEqual(plain(computeSchemeRates({ baseSalary: 22000, scheme: schemes[0], capHours: 8, referenceDate: july })), {
    dailyRate: 1000,
    hourlyRate: 125,
    divisorLabel: '22 days',
    monthlyCreditedHoursCap: 176,
  });
  assert.deepEqual(plain(computeSchemeRates({ baseSalary: 23000, scheme: schemes[1], capHours: 8, referenceDate: july })), {
    dailyRate: 1000,
    hourlyRate: 125,
    divisorLabel: '23 weekdays this month',
    monthlyCreditedHoursCap: null,
  });
  const hours = computeSchemeRates({ baseSalary: 160000, scheme: schemes[2], capHours: 7.5, referenceDate: july });
  assert.equal(hours.hourlyRate, 1000);
  assert.equal(hours.dailyRate, 7500);
  assert.equal(hours.divisorLabel, '160 hours');
  assert.equal(computeSchemeRates({ baseSalary: 0, scheme: schemes[0], capHours: 8, referenceDate: july }), null, 'no salary, no rates');
  assert.equal(computeSchemeRates({ baseSalary: 22000, scheme: schemes[0], capHours: 0, referenceDate: july }).hourlyRate, 125, 'a missing cap uses 8 h');
});

test('calendar header names the scheme and its credited cap', () => {
  const { getCalendarPayHeader } = loadHelper('../src/lib/pay-basis.ts');
  const month = { baseSalary: 22000, hourlyRate: 100, maxBillableHoursPerDay: 8, dailyHours: Array(23).fill(8) };
  assert.deepEqual(plain(getCalendarPayHeader({ ...month, payBasis: 'hourly_from_monthly', schemeName: '22 credited days', maxCreditedDays: 22 })), {
    amount: 22000,
    label: 'Monthly base salary · 22 credited days · at most 22 days credited a month',
  });
  assert.equal(
    getCalendarPayHeader({ ...month, payBasis: 'fixed_monthly', schemeName: 'Weekdays of month', maxCreditedDays: null }).label,
    'Fixed monthly salary',
    'a fixed salary is paid as is, so the scheme is not named',
  );
  // hourly_rate: 23 days x 8 h = 184 h, credited up to 22 x 8 = 176 h.
  assert.deepEqual(plain(getCalendarPayHeader({ ...month, payBasis: 'hourly_rate', schemeName: '22 credited days', maxCreditedDays: 22 })), {
    amount: 17600,
    label: '₱100.00 per hour · 22 credited days · up to 8 h a day and 22 credited days a month, overtime not included',
  });
  assert.equal(getCalendarPayHeader({ ...month, payBasis: 'hourly_rate' }).amount, 18400, 'no cap without a scheme cap');
});
