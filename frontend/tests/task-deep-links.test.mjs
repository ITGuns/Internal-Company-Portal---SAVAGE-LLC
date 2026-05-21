import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskDeepLinkHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-deep-links.ts');
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

test('parses task tracking deep-link filters and task ids', () => {
  const { getTaskDeepLinkState } = loadTaskDeepLinkHelper();

  assert.deepEqual(
    JSON.parse(JSON.stringify(getTaskDeepLinkState(new URLSearchParams('filter=overdue&task=task-1')))),
    { filter: 'overdue', taskId: 'task-1' },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(getTaskDeepLinkState(new URLSearchParams('filter=unknown&task=')))),
    { filter: null, taskId: null },
  );
});

test('matches tasks for dashboard-driven filters', () => {
  const { taskMatchesDeepLinkFilter } = loadTaskDeepLinkHelper();
  const today = '2026-05-21';

  assert.equal(taskMatchesDeepLinkFilter({ status: 'todo', dueDate: '2026-05-20' }, 'overdue', today), true);
  assert.equal(taskMatchesDeepLinkFilter({ status: 'completed', dueDate: '2026-05-20' }, 'overdue', today), false);
  assert.equal(taskMatchesDeepLinkFilter({ status: 'in_progress', dueDate: '2026-05-22' }, 'in_progress', today), true);
  assert.equal(taskMatchesDeepLinkFilter({ status: 'todo', dueDate: '2026-05-22' }, null, today), true);
});

test('labels and clears dashboard-driven task filters while preserving other params', () => {
  const {
    getTaskFilterLabel,
    getTaskFilterDescription,
    getTaskUrlWithoutDeepLinkFilter,
  } = loadTaskDeepLinkHelper();

  assert.equal(getTaskFilterLabel('overdue'), 'Overdue tasks');
  assert.equal(getTaskFilterDescription('in_progress'), 'Showing active work already in progress.');

  assert.equal(
    getTaskUrlWithoutDeepLinkFilter(new URLSearchParams('filter=overdue&task=task-1&view=list')),
    '/task-tracking?task=task-1&view=list',
  );
  assert.equal(
    getTaskUrlWithoutDeepLinkFilter(new URLSearchParams('filter=in_progress')),
    '/task-tracking',
  );
});
