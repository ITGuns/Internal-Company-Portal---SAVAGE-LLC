import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSidebarNavigation() {
  const helperPath = path.resolve(__dirname, '../src/lib/sidebar-navigation.ts');
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

test('chooses mobile drawer or desktop collapse mode by viewport', () => {
  const { SIDEBAR_DESKTOP_MEDIA_QUERY, getSidebarToggleMode } = loadSidebarNavigation();

  assert.equal(SIDEBAR_DESKTOP_MEDIA_QUERY, '(min-width: 768px)');
  assert.equal(getSidebarToggleMode(false), 'mobile');
  assert.equal(getSidebarToggleMode(true), 'desktop');
});

test('labels navigation toggle by viewport and collapsed state', () => {
  const { getNavigationToggleLabel } = loadSidebarNavigation();

  assert.equal(getNavigationToggleLabel(false, false), 'Open navigation');
  assert.equal(getNavigationToggleLabel(false, true), 'Open navigation');
  assert.equal(getNavigationToggleLabel(false, false, true), 'Close navigation');
  assert.equal(getNavigationToggleLabel(true, false), 'Collapse navigation');
  assert.equal(getNavigationToggleLabel(true, true), 'Expand navigation');
});

test('keeps overlapping sidebar routes from activating parent and child together', () => {
  const { isSidebarNavItemActive } = loadSidebarNavigation();

  assert.equal(isSidebarNavItemActive('/operations', '/operations', 'exact'), true);
  assert.equal(isSidebarNavItemActive('/operations/clients', '/operations', 'exact'), false);
  assert.equal(isSidebarNavItemActive('/operations/clients', '/operations/clients'), true);
  assert.equal(isSidebarNavItemActive('/operations/clients/reports', '/operations/clients'), true);
});

test('keeps client portal routes anchored to the client portal item', () => {
  const { isSidebarNavItemActive } = loadSidebarNavigation();

  assert.equal(isSidebarNavItemActive('/client', '/client', 'exact'), true);
  assert.equal(isSidebarNavItemActive('/client/calendar', '/client', 'exact'), false);
  assert.equal(isSidebarNavItemActive('/client/calendar', '/client/calendar'), true);
  assert.equal(isSidebarNavItemActive('/operations/clients', '/client'), false);
});
