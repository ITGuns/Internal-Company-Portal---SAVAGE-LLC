import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadReviewHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/daily-log-review.ts');
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

test('summarizes daily logs for manager review filters', () => {
  const { getDailyLogReviewSummary } = loadReviewHelper();

  const logs = [
    {
      id: 'log-1',
      authorId: 'user-1',
      author: 'Pol',
      date: '2026-05-21',
      status: 'completed',
      hoursLogged: 8,
      tasks: [{ id: 'task:one', text: 'One', completed: true }],
    },
    {
      id: 'log-2',
      authorId: 'user-1',
      author: 'Pol',
      date: '2026-05-20',
      status: 'blocked',
      hoursLogged: 4,
      tasks: [{ id: 'manual', text: 'Manual', completed: false }],
    },
    {
      id: 'log-3',
      authorId: 'user-2',
      author: 'Genrou',
      date: '2026-05-21',
      status: 'in-progress',
      hoursLogged: 6,
      tasks: [],
    },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(getDailyLogReviewSummary(logs, { selectedUserId: 'user-1' }))),
    {
      totalLogs: 2,
      completedLogs: 1,
      inProgressLogs: 0,
      blockedLogs: 1,
      totalHours: 12,
      linkedTaskCount: 1,
      lastLogDate: '2026-05-21',
    },
  );
});

test('ignores malformed legacy task entries when counting linked tasks', () => {
  const { getDailyLogReviewSummary } = loadReviewHelper();

  const summary = getDailyLogReviewSummary([
    {
      id: 'legacy-log',
      authorId: 'user-1',
      date: '2026-05-22',
      status: 'completed',
      hoursLogged: 1,
      tasks: ['legacy-task-id', null, { id: 'task:valid-linked' }, { text: 'missing id' }],
    },
  ]);

  assert.equal(summary.linkedTaskCount, 1);
});
