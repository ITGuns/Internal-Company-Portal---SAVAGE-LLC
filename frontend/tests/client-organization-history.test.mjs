import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientOrganizationHistory() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-organization-history.ts');
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

const organizations = [
  { id: 'archived-1', name: 'Archived Client', status: 'archived' },
  { id: 'active-1', name: 'Active Client', status: 'active' },
  { id: 'paused-1', name: 'Paused Client', status: 'paused' },
  { id: 'archived-2', name: 'Legacy Client', status: ' Archived ' },
];

test('splits archived clients into history while keeping active and paused clients current', () => {
  const { splitClientOrganizationsByHistory } = loadClientOrganizationHistory();
  const split = splitClientOrganizationsByHistory(organizations);

  assert.deepEqual(split.current.map((organization) => organization.id), ['active-1', 'paused-1']);
  assert.deepEqual(split.history.map((organization) => organization.id), ['archived-1', 'archived-2']);
});

test('defaults to current clients before archived history unless a valid client is requested', () => {
  const { getDefaultClientOrganizationId } = loadClientOrganizationHistory();

  assert.equal(getDefaultClientOrganizationId(organizations), 'active-1');
  assert.equal(getDefaultClientOrganizationId(organizations, 'archived-1'), 'archived-1');
  assert.equal(getDefaultClientOrganizationId([{ id: 'history-only', status: 'archived' }]), 'history-only');
  assert.equal(getDefaultClientOrganizationId([], 'missing-client'), 'missing-client');
});
