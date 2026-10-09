import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/payslip-generate.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, { module: compiledModule, exports: compiledModule.exports }, { filename: helperPath });
  return compiledModule.exports;
}

const {
  buildGeneratePayslipBody,
  previewGrossPay,
  previewBasePay,
  totalDeductions,
  isEditedPayslipConflict,
} = loadHelper();

const preview = {
  payBasis: 'hourly_rate',
  billableHours: 16,
  hourlyRate: 500,
  basePay: 8000,
  overtimeApprovedHours: 2,
  overtimePendingHours: 3,
  overtimePay: 1250,
  grossPay: 9250,
};

test('default request body sends no hoursWorked and no grossPay', () => {
  const body = buildGeneratePayslipBody({ overrideHours: false, hoursWorked: 16, deductions: [] });
  assert.deepEqual({ ...body }, {});
  assert.equal('hoursWorked' in body, false);
  assert.equal('grossPay' in body, false);
});

test('override hours sends hoursWorked only, never grossPay', () => {
  const body = buildGeneratePayslipBody({ overrideHours: true, hoursWorked: 12, deductions: [] });
  assert.deepEqual({ ...body }, { hoursWorked: 12 });
});

test('deductions are sent when present, empty or zero rows are dropped', () => {
  const body = buildGeneratePayslipBody({
    overrideHours: false,
    hoursWorked: 0,
    deductions: [
      { type: 'tax', name: ' Withholding ', amount: 100 },
      { type: 'other', name: '', amount: 0 },
    ],
  });
  assert.equal('hoursWorked' in body, false);
  assert.deepEqual(JSON.parse(JSON.stringify(body.deductions)), [{ type: 'tax', name: 'Withholding', amount: 100 }]);
});

test('without override the gross is exactly the preview gross', () => {
  assert.equal(previewGrossPay(preview, { overrideHours: false, hoursWorked: 99 }), 9250);
});

test('override replaces the base line and keeps approved overtime', () => {
  assert.equal(previewBasePay(preview, { overrideHours: true, hoursWorked: 12 }), 6000);
  assert.equal(previewGrossPay(preview, { overrideHours: true, hoursWorked: 12 }), 7250);
  const fixed = { ...preview, payBasis: 'fixed_monthly', basePay: 20000, grossPay: 21250 };
  assert.equal(previewGrossPay(fixed, { overrideHours: true, hoursWorked: 1 }), 21250, 'fixed salary ignores hours');
});

test('totals and conflict detection', () => {
  assert.equal(totalDeductions([{ type: 'tax', name: 'a', amount: 10.005 }, { type: 'x', name: 'b', amount: -5 }]), 10.01);
  assert.equal(isEditedPayslipConflict('This payslip was edited by hand. Regenerating replaces those edits.'), true);
  assert.equal(isEditedPayslipConflict('Period not found'), false);
});
