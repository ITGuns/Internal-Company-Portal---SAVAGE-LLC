import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientPortalNavigation() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-portal-navigation.ts');
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

test('defines the production client portal route structure in client-facing order', () => {
  const { CLIENT_PORTAL_NAV_ITEMS } = loadClientPortalNavigation();

  assert.deepEqual(Array.from(CLIENT_PORTAL_NAV_ITEMS, (item) => item.href), [
    '/client',
    '/client/work',
    '/client/tickets',
    '/client/approvals',
    '/client/messages',
    '/client/reports',
    '/client/resources',
    '/client/account',
    '/client/calendar',
  ]);

  assert.deepEqual(Array.from(CLIENT_PORTAL_NAV_ITEMS, (item) => item.label), [
    'Command Center',
    'Work',
    'Requests',
    'Approvals',
    'Messages',
    'Reports',
    'Resources',
    'Account',
    'Calendar',
  ]);
});

test('resolves exact and nested client portal route titles', () => {
  const { getClientPortalRouteTitle } = loadClientPortalNavigation();

  assert.deepEqual({ ...getClientPortalRouteTitle('/client') }, {
    title: 'Command Center',
    subtitle: 'Progress, approvals, requests, reports, and next actions',
  });
  assert.deepEqual({ ...getClientPortalRouteTitle('/client/tickets') }, {
    title: 'Requests',
    subtitle: 'Submit requests and review status with the team',
  });
  assert.deepEqual({ ...getClientPortalRouteTitle('/client/reports/monthly') }, {
    title: 'Reports',
    subtitle: 'Monthly performance, leads, reviews, and visibility',
  });
  assert.equal(getClientPortalRouteTitle('/dashboard'), null);
});
