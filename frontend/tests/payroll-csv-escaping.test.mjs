import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadReporting() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-reporting.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
    TextEncoder,
    URLSearchParams,
  }, { filename: helperPath });
  return compiledModule.exports;
}

const FORMULA_NAME = '=HYPERLINK("http://evil.test","x")';

test('archive CSV cells defuse formulas the way the server CSV does', () => {
  const { csvCell } = loadReporting();
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('+63 912 000 0000'), "'+63 912 000 0000");
  assert.equal(csvCell('-cmd'), "'-cmd");
  assert.equal(csvCell('@SUM(A1:A9)'), "'@SUM(A1:A9)");
  assert.equal(csvCell('\tTabbed'), "'\tTabbed");
  assert.equal(csvCell('\rReturn'), `"'\rReturn"`, 'guarded, then quoted for the line break');
  assert.equal(csvCell(FORMULA_NAME), `"'=HYPERLINK(""http://evil.test"",""x"")"`);
  assert.equal(csvCell('Santos, Jade'), '"Santos, Jade"');
  assert.equal(csvCell('Karl'), 'Karl');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(undefined), '');
});

test('numbers are written with 2 decimals like the server CSV, negative ones included', () => {
  const { csvCell } = loadReporting();
  assert.equal(csvCell(30000), '30000.00');
  assert.equal(csvCell(-150.5), '-150.50', 'still a number, never prefixed');
  assert.equal(csvCell(0), '0.00');
  assert.equal(csvCell(1234.567), '1234.57');
  assert.equal(csvCell(Number.NaN), '');
});

test('the archive, department and period CSVs use the guarded cells', () => {
  const { buildPayslipArchiveCsv, buildDepartmentSummaryCsv, buildPayrollStatsCsv } = loadReporting();
  const archive = buildPayslipArchiveCsv([{
    id: 'ps-1',
    employeeId: 'u1',
    employeeName: FORMULA_NAME,
    employeeEmail: '@attacker.test',
    employeeDepartment: '+Finance',
    employeeRole: 'Bookkeeping',
    status: 'draft',
    payPeriodStart: '2026-10-01',
    payPeriodEnd: '2026-10-15',
    issueDate: '2026-10-16',
    hoursWorked: 88,
    grossPay: 15000,
    netPay: -150,
    deductions: [{ id: 'd1', type: 'other', name: 'Loan', amount: 15150 }],
  }]);
  const [, row] = archive.split('\n');
  assert.equal(
    row,
    `ps-1,"'=HYPERLINK(""http://evil.test"",""x"")",'@attacker.test,'+Finance,Bookkeeping,draft,2026-10-01,2026-10-15,2026-10-16,88.00,15000.00,15150.00,-150.00`,
  );
  // Money with 2 decimals; the payslip count stays a whole number.
  assert.match(buildDepartmentSummaryCsv([{ department: '=cmd', gross: 100, net: 90, deductions: 10, count: 1 }]), /\n'=cmd,100\.00,10\.00,90\.00,1$/);
  assert.match(buildPayrollStatsCsv([{ periodId: 'p1', label: '-x', gross: 1, net: 1, deductions: 0, count: 12 }]), /\np1,'-x,1\.00,0\.00,1\.00,12$/);
});
