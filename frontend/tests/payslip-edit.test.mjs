import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPayslipEditHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/payslip-edit.ts');
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

test('recompute: net is the sum of all items, gross excludes deductions', () => {
  const { recomputePayslipTotals } = loadPayslipEditHelper();
  const totals = recomputePayslipTotals([
    { type: 'regular_hours', amount: '15000' },
    { type: 'overtime_approved', amount: '1250.50' },
    { type: 'overtime_pending', amount: '999' },
    { type: 'allowance', amount: 500 },
    { type: 'deduction', amount: '1200' },
    { type: 'adjustment', amount: '-100' },
  ]);
  assert.deepEqual({ ...totals }, { gross: 16650.5, net: 15450.5 });
});

test('deductions are always negative and pending overtime always 0', () => {
  const { normalizeItemAmount } = loadPayslipEditHelper();
  assert.equal(normalizeItemAmount('deduction', 300), -300);
  assert.equal(normalizeItemAmount('deduction', -300), -300);
  assert.equal(normalizeItemAmount('overtime_pending', 450), 0);
  assert.equal(normalizeItemAmount('adjustment', -12.346), -12.35);
  assert.equal(normalizeItemAmount('adjustment', 12.346), 12.35);
  assert.equal(normalizeItemAmount('allowance', Number.NaN), 0);
});

test('payslip edit requires a note, at least one item, and complete rows', () => {
  const { validatePayslipEdit } = loadPayslipEditHelper();
  const items = [
    { key: 'a', type: 'regular_hours', description: 'Hours', amount: '1000' },
    { key: 'b', type: 'overtime_pending', description: 'OT pending', amount: '' },
  ];

  assert.equal(validatePayslipEdit(items, 'Fixed rate').valid, true, 'pending overtime needs no amount');

  const noNote = validatePayslipEdit(items, '   ');
  assert.equal(noNote.valid, false);
  assert.equal(noNote.errors.note, 'Explain why this payslip was changed.');

  const empty = validatePayslipEdit([], 'note');
  assert.equal(empty.errors.items, 'Add at least one line item.');

  const badRow = validatePayslipEdit([{ key: 'c', type: 'allowance', description: ' ', amount: 'abc' }], 'note');
  assert.deepEqual({ ...badRow.errors.rows.c }, { description: 'Add a description.', amount: 'Enter an amount.' });
});

test('payload signs amounts by type and trims descriptions', () => {
  const { toPayslipItemPayload } = loadPayslipEditHelper();
  const payload = toPayslipItemPayload([
    { key: 'a', type: 'deduction', description: ' SSS ', amount: '500' },
    { key: 'b', type: 'fixed_salary', description: 'Salary', amount: '20000' },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), [
    { type: 'deduction', description: 'SSS', amount: -500 },
    { type: 'fixed_salary', description: 'Salary', amount: 20000 },
  ]);
});

test('money rounds half away from zero, like the server', () => {
  const { normalizeItemAmount, recomputePayslipTotals, MAX_NOTE_LENGTH, validatePayslipEdit } = loadPayslipEditHelper();
  assert.equal(normalizeItemAmount('adjustment', 2.345), 2.35);
  assert.equal(normalizeItemAmount('adjustment', -2.345), -2.35);
  assert.equal(normalizeItemAmount('deduction', 0.005), -0.01);
  assert.deepEqual(
    JSON.parse(JSON.stringify(recomputePayslipTotals([{ type: 'adjustment', amount: -0.005 }]))),
    { gross: -0.01, net: -0.01 },
  );
  assert.equal(MAX_NOTE_LENGTH, 500, 'matches backend payslip-edit.service MAX_NOTE_LENGTH');
  const items = [{ key: 'a', type: 'allowance', description: 'x', amount: '1' }];
  assert.equal(validatePayslipEdit(items, 'n'.repeat(500)).valid, true);
  assert.ok(validatePayslipEdit(items, 'n'.repeat(501)).errors.note);
});

test('legacy items get a type and locked periods are detected', () => {
  const { inferPayrollItemType, isPayrollPeriodLocked, getPayrollItemTypeLabel } = loadPayslipEditHelper();
  assert.equal(inferPayrollItemType(undefined, -50), 'deduction');
  assert.equal(inferPayrollItemType('earning', 50), 'regular_hours', 'legacy earnings open as regular hours');
  assert.equal(inferPayrollItemType('earning', -50), 'deduction');
  assert.equal(inferPayrollItemType('bonus', 50), 'adjustment');
  assert.equal(inferPayrollItemType('allowance', 50), 'allowance');
  assert.equal(isPayrollPeriodLocked('processed'), true);
  assert.equal(isPayrollPeriodLocked('draft'), false);
  assert.equal(isPayrollPeriodLocked(undefined), false);
  assert.equal(getPayrollItemTypeLabel('overtime_approved'), 'Overtime (approved)');
});
