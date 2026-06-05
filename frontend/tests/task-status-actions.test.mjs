import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskStatusActions() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-status-actions.ts');
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

test('reopened task progress is recalculated from tracked time when possible', () => {
  const { getReopenedTaskProgress } = loadTaskStatusActions();

  assert.equal(getReopenedTaskProgress({ estimatedTime: 60, totalElapsed: 1800, progress: 100 }), 50);
});

test('reopened task progress never stays visually complete', () => {
  const { getReopenedTaskProgress } = loadTaskStatusActions();

  assert.equal(getReopenedTaskProgress({ estimatedTime: 60, totalElapsed: 7200, progress: 100 }), 99);
  assert.equal(getReopenedTaskProgress({ progress: 100 }), 99);
});
