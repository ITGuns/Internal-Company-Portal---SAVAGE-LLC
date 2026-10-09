import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Compile the pure payslip helper in isolation. Type-only imports (./types) are
// elided by transpileModule, and the jspdf dynamic import lives inside an
// untested function so it is never resolved at load time.
function loadPayslipUtils() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/payslip-utils.ts');
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

test('calculateGrossPay divides annual salary by the period count', () => {
  const { calculateGrossPay } = loadPayslipUtils();
  assert.equal(calculateGrossPay(120000, 'monthly'), 10000);
  assert.equal(calculateGrossPay(120000, 'bi-weekly'), 4615); // round(120000/26)
  assert.equal(calculateGrossPay(120000, 'weekly'), 2308);    // round(120000/52)
  assert.equal(calculateGrossPay(120000, 'unknown-period'), 10000); // default = monthly
});

test('calculateStandardDeductions applies the fixed rates and flat contributions', () => {
  const { calculateStandardDeductions } = loadPayslipUtils();
  const deductions = calculateStandardDeductions(10000);
  // Rebuild in this realm: values returned from the vm carry the vm's prototypes.
  assert.deepEqual(
    Array.from(deductions, (d) => [d.name, d.amount]),
    [
      ['Income Tax', 1500],     // 15%
      ['SSS Contribution', 500], // 5%
      ['PhilHealth', 250],       // flat
      ['Pag-IBIG Fund', 100],    // flat
    ],
  );
});

test('calculateNetPay subtracts deductions and never goes negative', () => {
  const { calculateNetPay, calculateStandardDeductions, calculateTotalDeductions } = loadPayslipUtils();
  const deductions = calculateStandardDeductions(10000); // total 2350
  assert.equal(calculateTotalDeductions(deductions), 2350);
  assert.equal(calculateNetPay(10000, deductions), 7650);
  // Deductions exceeding gross floor the net pay at zero, not a negative number.
  assert.equal(calculateNetPay(1000, [{ id: 'x', type: 'tax', name: 'Big', amount: 5000 }]), 0);
});

test('validatePayslip reports missing and inconsistent fields', () => {
  const { validatePayslip } = loadPayslipUtils();
  assert.deepEqual(Array.from(validatePayslip({})), [
    'Employee ID is required',
    'Pay period start date is required',
    'Pay period end date is required',
  ]);

  assert.deepEqual(
    Array.from(validatePayslip({ employeeId: 1, payPeriodStart: '2026-07-01', payPeriodEnd: '2026-07-15' })),
    [],
  );

  assert.ok(
    validatePayslip({
      employeeId: 1,
      payPeriodStart: '2026-07-31',
      payPeriodEnd: '2026-07-01',
    }).includes('Pay period start must be before end date'),
  );

  assert.ok(
    validatePayslip({
      employeeId: 1,
      payPeriodStart: '2026-07-01',
      payPeriodEnd: '2026-07-15',
      grossPay: -5,
    }).includes('Gross pay cannot be negative'),
  );
});

test('YTD earnings and taxes sum only the current-year payslips for the employee', () => {
  const { calculateYTDEarnings, calculateYTDTaxes } = loadPayslipUtils();
  const year = new Date().getFullYear();
  const tax = (amount) => ({ id: 't', type: 'tax', name: 'Tax', amount });
  const payslips = [
    { employeeId: 7, payPeriodStart: `${year}-01-15`, grossPay: 10000, deductions: [tax(1500)] },
    { employeeId: 7, payPeriodStart: `${year}-02-15`, grossPay: 12000, deductions: [tax(1800), { id: 'i', type: 'insurance', name: 'PhilHealth', amount: 250 }] },
    { employeeId: 7, payPeriodStart: `${year - 1}-12-15`, grossPay: 9000, deductions: [tax(1350)] }, // prior year — excluded
    { employeeId: 99, payPeriodStart: `${year}-03-15`, grossPay: 8000, deductions: [tax(1200)] },     // other employee — excluded
  ];
  assert.equal(calculateYTDEarnings(payslips, 7), 22000); // 10000 + 12000
  assert.equal(calculateYTDTaxes(payslips, 7), 3300);     // 1500 + 1800 (insurance excluded)
});

test('getStatusColor maps known statuses and falls back for unknown', () => {
  const { getStatusColor } = loadPayslipUtils();
  assert.match(getStatusColor('paid'), /green/);
  assert.match(getStatusColor('issued'), /blue/);
  assert.match(getStatusColor('draft'), /gray/);
  assert.match(getStatusColor('something-else'), /gray/);
});
