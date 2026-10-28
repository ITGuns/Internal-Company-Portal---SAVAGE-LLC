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
// payslip-utils imports these lib modules, all pure with no imports of their own.
const PURE_LIB_MODULES = ['payroll-dates', 'payslip-edit', 'pay-basis', 'payslip-approval'];

function requireLibModule(id) {
  const moduleName = PURE_LIB_MODULES.find((name) => id.endsWith(`/${name}`));
  if (!moduleName) throw new Error(`Unexpected import in payslip-utils: ${id}`);
  const libPath = path.resolve(__dirname, `../src/lib/${moduleName}.ts`);
  const { outputText } = ts.transpileModule(fs.readFileSync(libPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const libModule = { exports: {} };
  vm.runInNewContext(outputText, { module: libModule, exports: libModule.exports }, { filename: libPath });
  return libModule.exports;
}

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
    require: requireLibModule,
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

test('getStatusColor maps known statuses and falls back for unknown', () => {
  const { getStatusColor } = loadPayslipUtils();
  assert.match(getStatusColor('paid'), /green/);
  assert.match(getStatusColor('issued'), /blue/);
  assert.match(getStatusColor('draft'), /gray/);
  assert.match(getStatusColor('something-else'), /gray/);
});

test('labels PDF earning lines by item type, never with the legacy base salary wording', () => {
  const { getPayslipEarningLines } = loadPayslipUtils();
  const describe = (lines) => Array.from(lines, (line) => line.label + ': ' + line.amount);

  const lines = getPayslipEarningLines({
    grossPay: 1500,
    items: [
      { id: 'i1', type: 'earning', description: 'Billable Work Hours (8 hrs)', amount: 1000 },
      { id: 'i2', type: 'overtime_approved', description: 'Approved overtime (2 h at 1.25x)', amount: 500 },
      { id: 'i3', type: 'deduction', description: 'SSS', amount: -100 },
      { id: 'i4', type: 'tax', description: 'Withholding tax (Withholding 5%, 5%)', amount: -75 },
      { id: 'i5', type: 'tax', description: 'Withholding tax (Exempt, 0%)', amount: 0 },
    ],
  });
  assert.deepEqual(describe(lines), ['Regular hours: 1000', 'Overtime (approved): 500'], 'tax lines are deductions, never earnings');

  assert.deepEqual(describe(getPayslipEarningLines({ grossPay: 900, items: [] })), ['Gross earnings: 900']);
  assert.deepEqual(describe(getPayslipEarningLines({ grossPay: 900 })), ['Gross earnings: 900']);
});

test('PDF earning lines carry the stored description, which names the scheme', () => {
  const { getPayslipEarningLines } = loadPayslipUtils();
  const lines = getPayslipEarningLines({
    grossPay: 22000,
    items: [
      { id: 'i1', type: 'regular_hours', description: 'Billable work hours (176 h credited, 184 h billable, 184 h tracked) - 22 credited days', amount: 22000 },
      { id: 'i2', type: 'uncredited_hours', description: 'Beyond 22 credited days, not paid (8 h)', amount: 0 },
      { id: 'i3', type: 'allowance', description: 'Allowance', amount: 0 },
    ],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(lines)), [
    { label: 'Regular hours', amount: 22000, detail: 'Billable work hours (176 h credited, 184 h billable, 184 h tracked) - 22 credited days' },
    { label: 'Beyond credited days, not paid', amount: 0, detail: 'Beyond 22 credited days, not paid (8 h)' },
    { label: 'Allowance', amount: 0 },
  ]);
});
