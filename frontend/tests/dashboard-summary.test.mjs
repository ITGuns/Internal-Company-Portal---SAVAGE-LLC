import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDashboardSummaryHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/dashboard-summary.ts');
  const dayAuditPath = path.resolve(__dirname, '../src/lib/payroll-calendar/day-audit.ts');
  const deepLinkPath = path.resolve(__dirname, '../src/lib/dashboard-deep-links.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const dayAuditSource = fs.readFileSync(dayAuditPath, 'utf8');
  const deepLinkSource = fs.readFileSync(deepLinkPath, 'utf8');
  const { outputText: helperOutput } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const { outputText: dayAuditOutput } = ts.transpileModule(dayAuditSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  const { outputText: deepLinkOutput } = ts.transpileModule(deepLinkSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const dayAuditModule = { exports: {} };
  vm.runInNewContext(dayAuditOutput, {
    module: dayAuditModule,
    exports: dayAuditModule.exports,
    console,
  }, { filename: dayAuditPath });

  const deepLinkModule = { exports: {} };
  vm.runInNewContext(deepLinkOutput, {
    module: deepLinkModule,
    exports: deepLinkModule.exports,
    console,
  }, { filename: deepLinkPath });

  const compiledModule = { exports: {} };
  vm.runInNewContext(helperOutput, {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
    require: (specifier) => {
      if (specifier === './payroll-calendar/day-audit') return dayAuditModule.exports;
      if (specifier === './dashboard-deep-links') return deepLinkModule.exports;
      throw new Error(`Unexpected require: ${specifier}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('builds employee dashboard metrics and attention items from live work data', () => {
  const { buildDashboardSummary } = loadDashboardSummaryHelper();

  const summary = buildDashboardSummary({
    userId: 'user-1',
    todayDate: '2026-05-21',
    now: '2026-05-21T10:00:00.000Z',
    tasks: [
      { id: 'task-1', title: 'Active work', status: 'in_progress', dueDate: '2026-05-21' },
      { id: 'task-2', title: 'Finished today', status: 'completed', completedAt: '2026-05-21T08:30:00.000Z' },
      { id: 'task-3', title: 'Late work', status: 'todo', dueDate: '2026-05-20' },
    ],
    timeEntries: [
      { id: 'entry-1', start: '2026-05-21T01:00:00.000Z', end: '2026-05-21T03:00:00.000Z', durationMin: 120 },
      { id: 'entry-2', start: '2026-05-21T04:00:00.000Z' },
    ],
    dailyLogs: [],
    pendingApprovals: 0,
    isManagement: false,
  });

  assert.equal(summary.metrics.todayMinutes, 480);
  assert.equal(summary.metrics.assignedTasks, 3);
  assert.equal(summary.metrics.inProgressTasks, 1);
  assert.equal(summary.metrics.completedToday, 1);
  assert.equal(summary.metrics.overdueTasks, 1);
  assert.equal(summary.metrics.pendingDailyLog, true);
  assert.equal(summary.metrics.payrollWarningCount, 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(summary.attentionItems.map((item) => item.id))),
    ['payroll-review', 'overdue-tasks', 'missing-daily-log'],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(summary.attentionItems.map((item) => item.href))),
    ['/payroll-calendar?tab=calendar', '/task-tracking?filter=overdue', '/daily-logs?new=1'],
  );
});

test('recognizes management roles and adds pending approval attention', () => {
  const { buildDashboardSummary, hasDashboardManagementAccess } = loadDashboardSummaryHelper();

  assert.equal(hasDashboardManagementAccess({ role: 'Operations Manager', roles: [] }), true);

  const summary = buildDashboardSummary({
    userId: 'manager-1',
    todayDate: '2026-05-21',
    now: '2026-05-21T12:00:00.000Z',
    tasks: [],
    timeEntries: [],
    dailyLogs: [
      { id: 'log-1', authorId: 'manager-1', date: '2026-05-21', logType: 'daily' },
    ],
    pendingApprovals: 2,
    isManagement: true,
  });

  assert.equal(summary.metrics.pendingApprovals, 2);
  assert.equal(summary.metrics.pendingDailyLog, false);
  assert.equal(summary.attentionItems[0].id, 'pending-approvals');
  assert.equal(summary.attentionItems[0].href, '/payroll-calendar?tab=employees&view=pending');
  assert.equal(summary.attentionItems[0].count, 2);
});
