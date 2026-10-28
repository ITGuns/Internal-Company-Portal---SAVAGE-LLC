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
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, console }, { filename: helperPath });
  return compiledModule.exports;
}

const history = () => loadHelper('../src/lib/employee-history.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

// The employment type list after migration 202610280003, plus an archived row.
const options = [
  { id: 'o1', value: 'Full-Time', label: 'Full-Time', sortOrder: 0, archived: false, isDefault: true },
  { id: 'o4', value: 'Part-Time', label: 'Part-Time', sortOrder: 3, archived: false, isDefault: false },
  { id: 'o2', value: 'Probationary', label: 'Probationary', sortOrder: 1, archived: false, isDefault: false },
  { id: 'o3', value: 'Temporary Hire', label: 'Temporary Hire', sortOrder: 2, archived: false, isDefault: false },
  { id: 'o5', value: 'Contractor', label: 'Contractor / Freelance', sortOrder: 4, archived: false, isDefault: false },
  { id: 'o6', value: 'Intern', label: 'Intern', sortOrder: 5, archived: false, isDefault: false },
  { id: 'o7', value: 'Seasonal', label: 'Seasonal', sortOrder: 6, archived: true, isDefault: false },
];

test('a category label comes from the list, else the stored value, else Not set', () => {
  const { categoryLabel, NOT_SET_LABEL } = history();
  assert.equal(categoryLabel(options, 'Contractor'), 'Contractor / Freelance');
  assert.equal(categoryLabel(options, 'Legacy contract'), 'Legacy contract', 'older profiles keep their text');
  assert.equal(categoryLabel(options, null), NOT_SET_LABEL);
  assert.equal(categoryLabel(options, '   '), 'Not set');
  assert.equal(categoryLabel(undefined, 'Intern'), 'Intern', 'the list is still loading');
});

test('the category filter matches exact values, people without a type, or everyone', () => {
  const { matchesCategory, ALL_CATEGORIES, NOT_SET_CATEGORY } = history();
  assert.equal(matchesCategory('Intern', ALL_CATEGORIES), true);
  assert.equal(matchesCategory(null, ALL_CATEGORIES), true);
  assert.equal(matchesCategory('Intern', 'Intern'), true);
  assert.equal(matchesCategory('Intern', 'Probationary'), false);
  assert.equal(matchesCategory(null, NOT_SET_CATEGORY), true);
  assert.equal(matchesCategory(' ', NOT_SET_CATEGORY), true);
  assert.equal(matchesCategory('Intern', NOT_SET_CATEGORY), false);
});

test('chips list every active type in list order, then held archived or unlisted values, then Not set', () => {
  const { categoryCounts, NOT_SET_CATEGORY } = history();
  const values = ['Full-Time', 'Full-Time', 'Probationary', 'Intern', 'Seasonal', 'Legacy contract', null, ''];
  assert.deepEqual(plain(categoryCounts(values, options)), [
    { value: 'Full-Time', label: 'Full-Time', count: 2 },
    { value: 'Probationary', label: 'Probationary', count: 1 },
    { value: 'Temporary Hire', label: 'Temporary Hire', count: 0 },
    { value: 'Part-Time', label: 'Part-Time', count: 0 },
    { value: 'Contractor', label: 'Contractor / Freelance', count: 0 },
    { value: 'Intern', label: 'Intern', count: 1 },
    { value: 'Seasonal', label: 'Seasonal', count: 1 },
    { value: 'Legacy contract', label: 'Legacy contract', count: 1 },
    { value: NOT_SET_CATEGORY, label: 'Not set', count: 2 },
  ]);
  const quiet = plain(categoryCounts(['Full-Time'], options)).map((chip) => chip.value);
  assert.equal(quiet.includes('Seasonal'), false, 'an archived type nobody has is not offered');
  assert.equal(quiet.includes(NOT_SET_CATEGORY), false);
  assert.deepEqual(plain(categoryCounts([], undefined)), []);
});

test('the server headcount is labelled and put in list order, none last', () => {
  const { labelledHeadcount, NOT_SET_CATEGORY } = history();
  const counts = [
    { value: 'Intern', count: 3 },
    { value: null, count: 1 },
    { value: 'Legacy contract', count: 1 },
    { value: 'Full-Time', count: 2 },
    { value: 'Contractor', count: 1 },
  ];
  assert.deepEqual(plain(labelledHeadcount(counts, options)), [
    { value: 'Full-Time', label: 'Full-Time', count: 2 },
    { value: 'Contractor', label: 'Contractor / Freelance', count: 1 },
    { value: 'Intern', label: 'Intern', count: 3 },
    { value: 'Legacy contract', label: 'Legacy contract', count: 1 },
    { value: NOT_SET_CATEGORY, label: 'Not set', count: 1 },
  ]);
});

test('status words match the CSV the server builds', () => {
  const { memberStatusLabel, payslipStatusLabel, periodStatusLabel, formatRosterHours } = history();
  assert.equal(memberStatusLabel('verified'), 'Verified');
  assert.equal(memberStatusLabel('leave'), 'On leave');
  assert.equal(memberStatusLabel('archived'), 'archived', 'an unknown status shows as stored');
  assert.equal(payslipStatusLabel('approved'), 'Approved');
  assert.equal(payslipStatusLabel('locked'), 'Locked');
  assert.equal(payslipStatusLabel(null), 'No payslip');
  assert.equal(periodStatusLabel('draft'), 'Draft');
  assert.equal(periodStatusLabel('processed'), 'Locked');
  assert.equal(formatRosterHours(184), '184 h');
  assert.equal(formatRosterHours(7.456), '7.46 h');
});

test('roster queries and download names', () => {
  const { rosterQuery, fallbackCsvName, filenameFromDisposition } = history();
  assert.equal(rosterQuery({ periodId: 'cm 1&x' }), '?periodId=cm%201%26x');
  assert.equal(rosterQuery({ userId: 'u1' }), '?userId=u1');
  assert.equal(fallbackCsvName({ periodId: 'p' }), 'deskii-employee-history.csv');
  assert.equal(fallbackCsvName({ userId: 'u' }), 'deskii-payroll-history.csv');
  assert.equal(
    filenameFromDisposition('attachment; filename="deskii-employee-history-2026-10-01-to-2026-10-31.csv"', 'x.csv'),
    'deskii-employee-history-2026-10-01-to-2026-10-31.csv',
  );
  assert.equal(filenameFromDisposition('attachment; filename=deskii-payroll-history-karl.csv', 'x.csv'), 'deskii-payroll-history-karl.csv');
  assert.equal(filenameFromDisposition(null, 'fallback.csv'), 'fallback.csv');
  assert.equal(filenameFromDisposition('attachment; filename="../../evil.csv"', 'fallback.csv'), 'fallback.csv');
  assert.equal(filenameFromDisposition('attachment; filename="report.exe"', 'fallback.csv'), 'fallback.csv');
});
