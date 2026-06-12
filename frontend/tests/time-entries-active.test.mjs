import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTimeEntryHelpers(apiResponse) {
  const helperPath = path.resolve(__dirname, '../src/lib/time-entries.ts');
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
    require: (specifier) => {
      if (specifier === './api') {
        return {
          apiFetch: async () => ({
            status: 200,
            json: async () => apiResponse,
          }),
        };
      }

      throw new Error(`Unexpected import: ${specifier}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('ignores malformed active time-entry payloads', async () => {
  const { fetchActiveTimeEntry } = loadTimeEntryHelpers([]);

  assert.equal(await fetchActiveTimeEntry(), null);
});

test('maps valid active time-entry payloads', async () => {
  const activeEntry = {
    id: 'entry-1',
    userId: 'admin-1',
    start: '2026-06-12T01:00:00.000Z',
    duration: 15,
    notes: 'Clocked in from header',
  };
  const { fetchActiveTimeEntry } = loadTimeEntryHelpers(activeEntry);

  assert.deepEqual(
    JSON.parse(JSON.stringify(await fetchActiveTimeEntry())),
    {
      id: 'entry-1',
      userId: 'admin-1',
      start: '2026-06-12T01:00:00.000Z',
      notes: 'Clocked in from header',
      durationMin: 15,
    },
  );
});
