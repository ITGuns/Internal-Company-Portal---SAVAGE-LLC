import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadOperationsSession() {
  const helperPath = path.resolve(__dirname, '../src/lib/operations-session.ts');
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

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('persists the last operations tab for route returns', () => {
  const { cacheOperationsTab, getInitialOperationsTab, isOperationsTab } = loadOperationsSession();
  const storage = createStorage();

  assert.equal(getInitialOperationsTab(storage), 'departments');
  assert.equal(isOperationsTab('members'), true);
  assert.equal(isOperationsTab('bad-tab'), false);

  cacheOperationsTab('members', storage);
  assert.equal(getInitialOperationsTab(storage), 'members');

  storage.setItem('mydeskii.operations.activeTab', 'bad-tab');
  assert.equal(getInitialOperationsTab(storage), 'departments');
});

test('throttles automatic operations org sync per user session', () => {
  const {
    markOperationsOrgCatalogSynced,
    shouldAutoSyncOperationsOrgCatalog,
  } = loadOperationsSession();
  const storage = createStorage();
  const now = 1_000_000;

  assert.equal(shouldAutoSyncOperationsOrgCatalog('', true, now, storage), false);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-1', false, now, storage), false);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-1', true, now, null), false);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-1', true, now, storage), true);

  markOperationsOrgCatalogSynced('admin-1', now, storage);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-1', true, now + 5 * 60 * 1000, storage), false);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-2', true, now + 5 * 60 * 1000, storage), true);
  assert.equal(shouldAutoSyncOperationsOrgCatalog('admin-1', true, now + 31 * 60 * 1000, storage), true);
});
