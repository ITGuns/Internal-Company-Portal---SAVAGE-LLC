import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// audit-target.ts imports lib/payroll-dates.ts; the loader resolves it.
function loadPayrollAuditTargetHelper() {
  return loadTsModule(path.resolve(__dirname, '../src/lib/payroll-calendar/audit-target.ts'));
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

  // Whole Manila days (UTC+8): May 1 starts at 16:00 UTC on Apr 30, May 21 ends at 15:59:59.999 UTC.
  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollTimeEntryRange({ startDate: '2026-05-01', endDate: '2026-05-21' }))),
    {
      startIso: '2026-04-30T16:00:00.000Z',
      endIso: '2026-05-21T15:59:59.999Z',
    },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollTimeEntryRange({ startDate: '2026-10-28', endDate: '2026-10-28' }))),
    { startIso: '2026-10-27T16:00:00.000Z', endIso: '2026-10-28T15:59:59.999Z' },
    'a one-day audit covers exactly that Manila day',
  );

  // 16:30 UTC on Jun 11 is 00:30 on Jun 12 in Manila, so Today is the 12th.
  assert.equal(getPayrollAuditTodayDateInput(new Date('2026-06-11T16:30:00.000Z')), '2026-06-12');
  assert.equal(getPayrollAuditTodayDateInput(new Date('2026-06-11T15:30:00.000Z')), '2026-06-11');
  assert.equal(formatPayrollAuditDateLabel('2026-06-11'), 'Jun 11, 2026');
  assert.equal(formatPayrollAuditDateLabel('bad-date'), '');
  assert.equal(formatPayrollAuditDateLabel('2026-02-30'), '', 'an impossible day is not a date');
  assert.deepEqual(
    JSON.parse(JSON.stringify(getPayrollAuditDateRange(new URLSearchParams('start=2026-02-30&end=2026-03-01')))),
    { startDate: '', endDate: '2026-03-01' },
  );

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
