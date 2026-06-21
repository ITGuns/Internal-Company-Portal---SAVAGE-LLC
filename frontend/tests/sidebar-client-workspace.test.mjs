import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSidebarClientWorkspaceHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/sidebar-client-workspace.ts');
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

test('does not put admin/client-operations users into client workspace resolving state', () => {
  const { getClientWorkspaceResolutionState } = loadSidebarClientWorkspaceHelper();

  const state = getClientWorkspaceResolutionState({
    userId: 'admin-1',
    canAccessClientOperations: true,
    hasRoleBasedClientPortalAccess: false,
    clientWorkspaceChecked: false,
  });

  assert.equal(state.shouldResolveClientWorkspace, false);
  assert.equal(state.isResolvingClientWorkspace, false);
});

test('does not resolve client workspace for users already known to be client portal users', () => {
  const { getClientWorkspaceResolutionState } = loadSidebarClientWorkspaceHelper();

  const state = getClientWorkspaceResolutionState({
    userId: 'client-1',
    canAccessClientOperations: false,
    hasRoleBasedClientPortalAccess: true,
    clientWorkspaceChecked: false,
  });

  assert.equal(state.shouldResolveClientWorkspace, false);
  assert.equal(state.isResolvingClientWorkspace, false);
});

test('only resolves client workspace for authenticated users without role-based workspace access', () => {
  const { getClientWorkspaceResolutionState } = loadSidebarClientWorkspaceHelper();

  const anonymousState = getClientWorkspaceResolutionState({
    userId: '',
    canAccessClientOperations: false,
    hasRoleBasedClientPortalAccess: false,
    clientWorkspaceChecked: false,
  });

  assert.equal(anonymousState.shouldResolveClientWorkspace, false);
  assert.equal(anonymousState.isResolvingClientWorkspace, false);

  const pendingState = getClientWorkspaceResolutionState({
    userId: 'member-1',
    canAccessClientOperations: false,
    hasRoleBasedClientPortalAccess: false,
    clientWorkspaceChecked: false,
  });

  assert.equal(pendingState.shouldResolveClientWorkspace, true);
  assert.equal(pendingState.isResolvingClientWorkspace, true);

  const checkedState = getClientWorkspaceResolutionState({
    userId: 'member-1',
    canAccessClientOperations: false,
    hasRoleBasedClientPortalAccess: false,
    clientWorkspaceChecked: true,
  });

  assert.equal(checkedState.shouldResolveClientWorkspace, true);
  assert.equal(checkedState.isResolvingClientWorkspace, false);
});
