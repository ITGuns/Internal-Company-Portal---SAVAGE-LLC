import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPayrollReporting() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-reporting.ts');
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
    TextEncoder,
    URLSearchParams,
  }, { filename: helperPath });

  return compiledModule.exports;
}

const payslips = [
  {
    id: 'ps-1',
    employeeId: 'user-1',
    employeeName: 'Payroll Lead',
    employeeEmail: 'payroll@example.test',
    employeeDepartment: 'Payroll / Finance',
    employeeRole: 'Bookkeeping',
    status: 'issued',
    payPeriodStart: '2026-06-01',
    payPeriodEnd: '2026-06-15',
    issueDate: '2026-06-16',
    hoursWorked: 72,
    grossPay: 30000,
    netPay: 28000,
    deductions: [{ id: 'ded-1', type: 'tax', name: 'Tax', amount: 2000 }],
  },
  {
    id: 'ps-2',
    employeeId: 'user-2',
    employeeName: 'Website Developer',
    employeeEmail: 'dev@example.test',
    employeeDepartment: 'Website Developers',
    employeeRole: 'Frontend Developer',
    status: 'paid',
    payPeriodStart: '2026-06-01',
    payPeriodEnd: '2026-06-15',
    issueDate: '2026-06-16',
    hoursWorked: 68,
    grossPay: 24000,
    netPay: 23000,
    deductions: [{ id: 'ded-2', type: 'other', name: 'Benefit', amount: 1000 }],
  },
];

test('filters payroll archive by department, status, and search context', () => {
  const { filterPayslipsForReport, getUniquePayslipDepartments } = loadPayrollReporting();

  assert.deepEqual(
    JSON.parse(JSON.stringify(getUniquePayslipDepartments(payslips))),
    ['Payroll / Finance', 'Website Developers'],
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(filterPayslipsForReport(payslips, { department: 'Payroll / Finance' }).map((payslip) => payslip.id))),
    ['ps-1'],
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(filterPayslipsForReport(payslips, { status: 'paid', query: 'frontend' }).map((payslip) => payslip.id))),
    ['ps-2'],
  );
});

test('builds department cost summaries and CSV exports', () => {
  const {
    buildDepartmentCostSummary,
    buildDepartmentSummaryCsv,
    buildPayslipArchiveCsv,
    buildPayrollReportSearchParams,
    summarizePayslipCosts,
  } = loadPayrollReporting();

  const summary = buildDepartmentCostSummary(payslips);
  assert.deepEqual(
    JSON.parse(JSON.stringify(summary.map((row) => ({ department: row.department, gross: row.gross, count: row.count })))),
    [
      { department: 'Payroll / Finance', gross: 30000, count: 1 },
      { department: 'Website Developers', gross: 24000, count: 1 },
    ],
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(summarizePayslipCosts(payslips))),
    { gross: 54000, net: 51000, deductions: 3000, hours: 140, count: 2 },
  );

  assert.equal(
    buildPayrollReportSearchParams({ department: 'Payroll / Finance', employeeId: 'user-1', status: 'issued' }),
    '?department=Payroll+%2F+Finance&userId=user-1&status=issued',
  );

  assert.match(buildPayslipArchiveCsv(payslips), /Payroll Lead/);
  assert.match(buildDepartmentSummaryCsv(summary), /Website Developers,24000,1000,23000,1/);
});

test('builds batch report files and a ZIP archive', () => {
  const {
    buildDepartmentCostSummary,
    buildPayrollReportBatchFiles,
    buildReportZipArchive,
  } = loadPayrollReporting();

  const files = buildPayrollReportBatchFiles({
    payslips,
    departmentSummary: buildDepartmentCostSummary(payslips),
    filters: { department: 'Payroll / Finance', status: 'issued' },
    generatedAt: '2026-06-18T00:00:00.000Z',
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(files.map((file) => file.filename))),
    ['payslip-archive.csv', 'department-cost-summary.csv', 'report-manifest.json'],
  );
  assert.match(files[2].content, /Payroll \/ Finance/);

  const zip = buildReportZipArchive(files, new Date('2026-06-18T00:00:00.000Z'));
  assert.equal(zip.constructor.name, 'Uint8Array');
  assert.deepEqual(Array.from(zip.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  assert.match(new TextDecoder().decode(zip), /payslip-archive\.csv/);
  assert.match(new TextDecoder().decode(zip), /department-cost-summary\.csv/);
  assert.match(new TextDecoder().decode(zip), /report-manifest\.json/);
});
