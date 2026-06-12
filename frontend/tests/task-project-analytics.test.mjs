import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskProjectAnalyticsHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-project-analytics.ts');
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

test('builds project analytics from visible task data and backend counts', () => {
  const { buildTaskProjectAnalytics } = loadTaskProjectAnalyticsHelper();
  const today = '2026-06-11';
  const projects = [
    { id: 'alpha', name: 'Alpha', status: 'active', taskCount: 4, targetDate: '2026-06-20' },
    { id: 'beta', name: 'Beta', status: 'paused', taskCount: 1, targetDate: '2026-06-01' },
  ];
  const tasks = [
    { id: 'a1', projectId: 'alpha', status: 'completed', priority: 'High', estimatedTime: 60, totalElapsed: 3600 },
    { id: 'a2', projectId: 'alpha', status: 'in_progress', priority: 'High', dueDate: today, estimatedTime: 120, totalElapsed: 1800 },
    { id: 'a3', projectId: 'alpha', status: 'review', priority: 'Med', dueDate: '2026-06-01', estimatedTime: 30, totalElapsed: 0 },
    { id: 'b1', projectId: 'beta', status: 'todo', priority: 'Low', dueDate: '2026-06-12', estimatedTime: 45, totalElapsed: 0 },
  ];

  const [alpha, beta] = buildTaskProjectAnalytics(projects, tasks, today);

  assert.equal(alpha.taskCount, 4);
  assert.equal(alpha.visibleTaskCount, 3);
  assert.equal(alpha.completionRate, 25);
  assert.equal(alpha.openCount, 2);
  assert.equal(alpha.overdueCount, 1);
  assert.equal(alpha.dueTodayCount, 1);
  assert.equal(alpha.highPriorityCount, 1);
  assert.equal(alpha.nextDueDate, today);
  assert.equal(alpha.remainingMinutes, 120);
  assert.equal(alpha.targetOverdue, false);

  assert.equal(beta.completionRate, 0);
  assert.equal(beta.targetOverdue, true);
});

test('summarizes project analytics for expanded overview metrics', () => {
  const {
    buildTaskProjectAnalytics,
    summarizeTaskProjectAnalytics,
  } = loadTaskProjectAnalyticsHelper();
  const analytics = buildTaskProjectAnalytics(
    [
      { id: 'alpha', name: 'Alpha', status: 'active', taskCount: 2 },
      { id: 'beta', name: 'Beta', status: 'completed', taskCount: 1 },
    ],
    [
      { id: 'a1', projectId: 'alpha', status: 'completed', priority: 'Med' },
      { id: 'a2', projectId: 'alpha', status: 'in_progress', priority: 'High', dueDate: '2026-06-01' },
      { id: 'b1', projectId: 'beta', status: 'completed', priority: 'Low' },
    ],
    '2026-06-11',
  );

  const summary = summarizeTaskProjectAnalytics(analytics);

  assert.equal(summary.totalProjects, 2);
  assert.equal(summary.activeProjects, 1);
  assert.equal(summary.completedProjects, 1);
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.openTasks, 1);
  assert.equal(summary.overdueTasks, 1);
  assert.equal(summary.averageCompletionRate, 75);
});
