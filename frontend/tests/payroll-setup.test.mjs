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
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports, console, Intl }, { filename: helperPath });
  return compiledModule.exports;
}

const setup = () => loadHelper('../src/lib/payroll-setup.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));
const defaults = { payrollScheme: 'fixed_22_days', employmentType: 'Full-Time', paymentFrequency: 'Monthly' };

test('a saved profile fills the form; missing values take the list defaults', () => {
  const { profileToSetupForm } = setup();
  const form = profileToSetupForm({
    jobTitle: 'Designer',
    employmentType: 'Contractor',
    baseSalary: 30000,
    currency: 'USD',
    paymentFrequency: 'Semi-Monthly',
    payrollScheme: 'weekdays',
    maxBillableHoursPerDay: 7.5,
    payBasis: 'fixed_monthly',
    hourlyRate: null,
    overtimeMultiplier: 1.5,
    bankAccount: null,
    taxId: 'TIN-1',
  }, defaults);
  assert.deepEqual(plain(form), {
    jobTitle: 'Designer',
    employmentType: 'Contractor',
    baseSalary: '30000',
    currency: 'USD',
    paymentFrequency: 'Semi-Monthly',
    payrollScheme: 'weekdays',
    maxBillableHoursPerDay: '7.5',
    bankAccount: '',
    taxId: 'TIN-1',
    payBasis: 'fixed_monthly',
    hourlyRate: '',
    overtimeMultiplier: '1.5',
  });

  const blank = profileToSetupForm({}, defaults);
  assert.equal(blank.payrollScheme, 'fixed_22_days');
  assert.equal(blank.employmentType, 'Full-Time');
  assert.equal(blank.paymentFrequency, 'Monthly');
  assert.equal(blank.currency, 'PHP');
  assert.equal(blank.payBasis, 'hourly_from_monthly');
  assert.equal(blank.maxBillableHoursPerDay, '8');
  assert.equal(blank.overtimeMultiplier, '1.25');
  assert.equal(profileToSetupForm(null, defaults).payrollScheme, 'fixed_22_days');
});

test('the save body keeps blank optional text out and the rate only for hourly rate', () => {
  const { buildSetupPayload, profileToSetupForm } = setup();
  const form = { ...profileToSetupForm({ baseSalary: 22000 }, defaults), jobTitle: '  ', bankAccount: ' 123 ', hourlyRate: '300' };
  const body = plain(buildSetupPayload(form));
  assert.deepEqual(body, {
    employmentType: 'Full-Time',
    baseSalary: 22000,
    currency: 'PHP',
    paymentFrequency: 'Monthly',
    payrollScheme: 'fixed_22_days',
    maxBillableHoursPerDay: 8,
    bankAccount: '123',
    payBasis: 'hourly_from_monthly',
    overtimeMultiplier: 1.25,
  });
  const hourly = plain(buildSetupPayload({ ...form, payBasis: 'hourly_rate', baseSalary: '' }));
  assert.equal(hourly.hourlyRate, 300);
  assert.equal('baseSalary' in hourly, false, 'an empty salary is not sent');
});

test('daily cap input rules', () => {
  const { validateCapHours } = setup();
  assert.equal(validateCapHours('8'), undefined);
  assert.equal(validateCapHours('0.25'), undefined);
  assert.equal(validateCapHours(''), 'Enter the most billable hours in a day.');
  assert.equal(validateCapHours('0'), 'Use 0.25 to 24 hours.');
  assert.equal(validateCapHours('25'), 'Use 0.25 to 24 hours.');
});

test('a saved profile updates an employee card without touching other fields', () => {
  const { applyProfileToEmployee } = setup();
  const employee = { id: 'u1', name: 'worker one', role: 'Member', department: 'Ops', avatar: 'W', hoursThisWeek: 4, salary: 0, performance: null, status: 'active', payrollScheme: 'weekdays', maxBillableHoursPerDay: 8, payBasis: 'hourly_rate' };
  const next = applyProfileToEmployee(employee, { payrollScheme: 'fixed_22_days', paymentFrequency: 'Monthly', baseSalary: 25000, jobTitle: 'Editor', currency: 'PHP' });
  assert.notEqual(next, employee, 'a new object');
  assert.equal(employee.payrollScheme, 'weekdays', 'the old row is not changed');
  assert.equal(next.payrollScheme, 'fixed_22_days');
  assert.equal(next.paymentFrequency, 'Monthly');
  assert.equal(next.salary, 25000);
  assert.equal(next.role, 'Editor');
  assert.equal(next.payBasis, 'hourly_rate', 'fields the profile did not send stay');
  assert.equal(next.hoursThisWeek, 4);
});

test('pay summary and amounts', () => {
  const { buildPaySummary, formatCapHours, formatPayAmount } = setup();
  assert.deepEqual(plain(buildPaySummary({ payBasisLabel: 'Hourly from monthly salary', schemeName: '22 credited days', capHours: 8, frequencyLabel: 'Monthly (once a month)' })), [
    'Hourly from monthly salary',
    '22 credited days',
    '8 h a day',
    'Monthly (once a month)',
  ]);
  assert.deepEqual(plain(buildPaySummary({ payBasisLabel: 'Hourly rate', capHours: 7.5 })), ['Hourly rate', '7.5 h a day'], 'empty parts are left out');
  assert.equal(formatCapHours(null), '8 h a day');
  assert.equal(formatPayAmount(25000, 'PHP'), '₱25,000.00');
  assert.match(formatPayAmount(1200.5, 'USD'), /1,200\.50/);
  assert.equal(formatPayAmount(10, 'NOT-A-CODE'), 'NOT-A-CODE 10.00', 'an unknown code still shows');
});

test('employee search matches every word in name, email, role or department', () => {
  const { matchesEmployeeSearch } = loadHelper('../src/lib/employee-search.ts');
  const worker = { name: 'Worker One', email: 'worker.one@local.test', role: 'Video Editor', department: 'Creatives' };
  assert.equal(matchesEmployeeSearch(worker, ''), true);
  assert.equal(matchesEmployeeSearch(worker, 'worker'), true);
  assert.equal(matchesEmployeeSearch(worker, 'EDITOR creat'), true);
  assert.equal(matchesEmployeeSearch(worker, 'local.test'), true);
  assert.equal(matchesEmployeeSearch(worker, 'finance'), false);
  assert.equal(matchesEmployeeSearch({ name: null, email: 'x@y.test' }, 'x@y'), true);
});
