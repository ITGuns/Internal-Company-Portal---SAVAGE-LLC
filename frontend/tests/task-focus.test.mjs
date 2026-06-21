import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskFocusHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-focus.ts');
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

test('selects pinned focus before automatic urgent task suggestions', () => {
  const { getSelectedFocusTask } = loadTaskFocusHelper();
  const tasks = [
    { id: 'overdue', title: 'Overdue task', status: 'todo', dueDate: '2026-06-09' },
    { id: 'pinned', title: 'Pinned task', status: 'review', dueDate: '2026-06-12' },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(getSelectedFocusTask(tasks, tasks, 'pinned', '2026-06-10'))),
    { task: tasks[1], mode: 'pinned' },
  );
});

test('falls back to automatic focus when pinned task is unavailable', () => {
  const { getSelectedFocusTask } = loadTaskFocusHelper();
  const tasks = [
    { id: 'later', title: 'Later task', status: 'todo', dueDate: '2026-06-14' },
    { id: 'active', title: 'Active task', status: 'in_progress', dueDate: '2026-06-13' },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(getSelectedFocusTask(tasks, tasks, 'missing-task', '2026-06-10'))),
    { task: tasks[1], mode: 'auto' },
  );
});

test('auto focus prioritizes overdue, today, in-progress, review, then todo tasks', () => {
  const { getSuggestedFocusTask } = loadTaskFocusHelper();

  assert.equal(
    getSuggestedFocusTask([
      { id: 'today', status: 'todo', dueDate: '2026-06-10' },
      { id: 'overdue', status: 'todo', dueDate: '2026-06-09' },
    ], '2026-06-10').id,
    'overdue',
  );

  assert.equal(
    getSuggestedFocusTask([
      { id: 'todo', status: 'todo' },
      { id: 'review', status: 'review' },
      { id: 'active', status: 'in_progress' },
    ], '2026-06-10').id,
    'active',
  );
});

test('builds user-scoped focus storage keys', () => {
  const { getTaskFocusStorageKey } = loadTaskFocusHelper();

  assert.equal(getTaskFocusStorageKey('u1'), 'deskii-task-focus:u1');
  assert.equal(getTaskFocusStorageKey(), 'deskii-task-focus:guest');
});
