import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientWorkspaceLoading() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-workspace-loading.ts');
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
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('returns fulfilled secondary client load values', () => {
  const { getSettledClientLoadValue } = loadClientWorkspaceLoading();

  assert.deepEqual(getSettledClientLoadValue({
    status: 'fulfilled',
    value: ['activity-1'],
  }, []), ['activity-1']);
});

test('falls back and reports rejected secondary client load values', () => {
  const { getSettledClientLoadValue } = loadClientWorkspaceLoading();
  const reported = [];
  const error = new Error('queue unavailable');

  assert.deepEqual(getSettledClientLoadValue({
    status: 'rejected',
    reason: error,
  }, [], (reason) => reported.push(reason)), []);
  assert.deepEqual(reported, [error]);
});
