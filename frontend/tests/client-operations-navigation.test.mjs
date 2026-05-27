import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientOperationsNavigation() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-operations-navigation.ts');
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

test('defines focused client operations pages in admin workflow order', () => {
  const { CLIENT_OPERATIONS_NAV_ITEMS } = loadClientOperationsNavigation();

  assert.deepEqual(Array.from(CLIENT_OPERATIONS_NAV_ITEMS, (item) => item.href), [
    '/operations/clients',
    '/operations/clients/accounts',
    '/operations/clients/delivery',
    '/operations/clients/requests',
    '/operations/clients/approvals',
    '/operations/clients/reports',
    '/operations/clients/assets',
    '/operations/clients/billing',
    '/operations/clients/roadmap',
    '/operations/clients/calendar',
  ]);
});

test('resolves nested client operations route titles and preserves selected client links', () => {
  const {
    getClientOperationsRouteTitle,
    withClientOperationsClientParam,
  } = loadClientOperationsNavigation();

  assert.deepEqual({ ...getClientOperationsRouteTitle('/operations/clients/requests/ticket-1') }, {
    title: 'Client Requests',
    subtitle: 'Website change requests, support tickets, replies, and internal notes',
  });
  assert.deepEqual({ ...getClientOperationsRouteTitle('/operations/clients') }, {
    title: 'Client Operations',
    subtitle: 'Client workspaces, requests, approvals, reports, and delivery progress',
  });
  assert.equal(
    withClientOperationsClientParam('/operations/clients/reports', 'client 1'),
    '/operations/clients/reports?client=client%201',
  );
  assert.equal(withClientOperationsClientParam('/operations/clients/reports', ''), '/operations/clients/reports');
});
