import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDeepLinkHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/dashboard-deep-links.ts');
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

test('dashboard actions point to exact workflow deep links', () => {
  const { DASHBOARD_DEEP_LINKS } = loadDeepLinkHelper();

  assert.equal(DASHBOARD_DEEP_LINKS.createTask, '/task-tracking?new=1');
  assert.equal(DASHBOARD_DEEP_LINKS.addDailyLog, '/daily-logs?new=1');
  assert.equal(DASHBOARD_DEEP_LINKS.reviewPayroll, '/payroll-calendar?tab=calendar');
  assert.equal(DASHBOARD_DEEP_LINKS.approvals, '/payroll-calendar?tab=employees&view=pending');
  assert.equal(DASHBOARD_DEEP_LINKS.overdueTasks, '/task-tracking?filter=overdue');
  assert.equal(DASHBOARD_DEEP_LINKS.inProgressTasks, '/task-tracking?filter=in_progress');
  assert.equal(DASHBOARD_DEEP_LINKS.announcements, '/announcements');
});

test('recognizes modal-opening query parameters', () => {
  const { shouldOpenCreateFromSearch } = loadDeepLinkHelper();

  assert.equal(shouldOpenCreateFromSearch(new URLSearchParams('new=1')), true);
  assert.equal(shouldOpenCreateFromSearch(new URLSearchParams('new=true')), false);
  assert.equal(shouldOpenCreateFromSearch(new URLSearchParams()), false);
});

test('resolves payroll tab deep links with management guardrails', () => {
  const {
    getEmployeeOverviewViewFromSearch,
    getPayrollTabFromSearch,
  } = loadDeepLinkHelper();

  assert.equal(getPayrollTabFromSearch(new URLSearchParams('tab=calendar'), true), 'calendar');
  assert.equal(getPayrollTabFromSearch(new URLSearchParams('tab=employees'), true), 'employees');
  assert.equal(getPayrollTabFromSearch(new URLSearchParams('tab=employees'), false), 'calendar');
  assert.equal(getPayrollTabFromSearch(new URLSearchParams('tab=unknown'), true), 'calendar');
  assert.equal(getEmployeeOverviewViewFromSearch(new URLSearchParams('view=pending')), 'pending');
  assert.equal(getEmployeeOverviewViewFromSearch(new URLSearchParams('view=anything')), 'deployed');
});
