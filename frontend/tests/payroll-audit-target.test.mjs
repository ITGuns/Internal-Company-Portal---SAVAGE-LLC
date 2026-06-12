import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPayrollAuditTargetHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/audit-target.ts');
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

test('resolves payroll audit target from query params and current user', () => {
  const { getPayrollAuditTarget } = loadPayrollAuditTargetHelper();

  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollAuditTarget({
      searchParams: new URLSearchParams('userId=employee-1'),
      currentUserId: 'manager-1',
      hasManagementAccess: true,
    }))),
    { targetUserId: 'employee-1', isOwnView: false },
  );

  const restrictedTarget = getPayrollAuditTarget({
    searchParams: new URLSearchParams('userId=employee-1'),
    currentUserId: 'employee-2',
    hasManagementAccess: false,
  });

  assert.equal(restrictedTarget.targetUserId, undefined);
  assert.equal(restrictedTarget.isOwnView, true);
});

test('filters payroll audit employees and builds inclusive date ranges', () => {
  const {
    filterPayrollAuditUsers,
    formatPayrollAuditDateLabel,
    getPayrollAuditDateRange,
    getPayrollAuditSummary,
    getPayrollAuditTodayDateInput,
    getPayrollTimeEntryRange,
    getVisiblePayrollAuditUsers,
  } = loadPayrollAuditTargetHelper();

  const users = [
    { id: '1', name: 'Admin', email: 'admin@savage.com' },
    { id: '2', name: 'Pol Danyael H. Villorente', email: 'pol@savage.com' },
    { id: '3', name: 'Genrou Josh Catacutan', email: 'genrou@savage.com' },
  ];

  assert.deepEqual(
    filterPayrollAuditUsers(users, 'pol').map((user) => user.id),
    ['2'],
  );
  assert.deepEqual(
    filterPayrollAuditUsers(users, 'savage.com').map((user) => user.id),
    ['1', '2', '3'],
  );
  assert.deepEqual(
    getVisiblePayrollAuditUsers(users, 'genrou', '2').map((user) => user.id),
    ['2', '3'],
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollAuditDateRange(new URLSearchParams('start=2026-05-01&end=2026-05-21')))),
    { startDate: '2026-05-01', endDate: '2026-05-21' },
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollTimeEntryRange({ startDate: '2026-05-01', endDate: '2026-05-21' }))),
    {
      startIso: '2026-05-01T00:00:00.000Z',
      endIso: '2026-05-21T23:59:59.999Z',
    },
  );

  assert.equal(getPayrollAuditTodayDateInput(new Date('2026-06-11T16:30:00.000Z')), '2026-06-11');
  assert.equal(formatPayrollAuditDateLabel('2026-06-11'), 'Jun 11, 2026');
  assert.equal(formatPayrollAuditDateLabel('bad-date'), '');

  assert.equal(
    getPayrollAuditSummary({
      selectedUser: users[1],
      startDate: '2026-05-01',
      endDate: '2026-05-21',
    }),
    'Auditing Pol Danyael H. Villorente from May 1, 2026 to May 21, 2026',
  );
  assert.equal(
    getPayrollAuditSummary({
      selectedUser: null,
      startDate: '',
      endDate: '',
    }),
    'Auditing my time entries across all dates',
  );
});
