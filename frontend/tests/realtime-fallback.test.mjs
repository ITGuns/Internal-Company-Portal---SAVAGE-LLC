import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadRealtimeFallbackHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/realtime-fallback.ts');
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

test('polls only when realtime is off', () => {
  const { getFallbackPollInterval } = loadRealtimeFallbackHelpers();

  assert.equal(getFallbackPollInterval(false, 10000), 10000);
  assert.equal(getFallbackPollInterval(false, 30000), 30000);
  assert.equal(getFallbackPollInterval(true, 10000), false, 'the socket delivers updates, so no timer');
});

test('list queries refetch on focus and every interval only without realtime', () => {
  const { getFallbackListQueryOptions } = loadRealtimeFallbackHelpers();

  assert.deepEqual(
    { ...getFallbackListQueryOptions(false, 60000) },
    { refetchOnWindowFocus: true, refetchInterval: 60000 },
  );
  assert.deepEqual(
    { ...getFallbackListQueryOptions(true, 60000) },
    { refetchOnWindowFocus: false, refetchInterval: false },
  );
});

test('describes the polling interval in plain words', () => {
  const { describePollInterval } = loadRealtimeFallbackHelpers();

  assert.equal(describePollInterval(10000), 'Updates every 10 seconds');
  assert.equal(describePollInterval(30000), 'Updates every 30 seconds');
});
