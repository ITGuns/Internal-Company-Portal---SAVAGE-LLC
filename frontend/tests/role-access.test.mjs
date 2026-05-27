import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadRoleAccessHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/role-access.ts');
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

test('normalizes management roles from primary and secondary role fields', () => {
  const { hasManagementAccess, normalizeRoleName } = loadRoleAccessHelper();

  assert.equal(normalizeRoleName('Operations Manager'), 'operations_manager');
  assert.equal(normalizeRoleName(' operations-manager '), 'operations_manager');

  assert.equal(hasManagementAccess({ role: 'employee' }), false);
  assert.equal(hasManagementAccess({ role: 'Manager' }), true);
  assert.equal(hasManagementAccess({ role: 'employee', roles: ['Operations Manager'] }), true);
  assert.equal(hasManagementAccess({ role: null, roles: ['administrator'] }), true);
  assert.equal(hasManagementAccess({ role: 'Chief Operations Officer' }), true);
});

test('separates client portal and client operations navigation access', () => {
  const {
    getAuthenticatedLandingPath,
    hasManagementAccess,
    hasClientPortalAccess,
    hasClientOperationsAccess,
    hasClientWorkspaceShellAccess,
  } = loadRoleAccessHelper();

  assert.equal(hasClientPortalAccess({ role: 'client' }), true);
  assert.equal(hasClientPortalAccess({ role: 'Client Owner' }), true);
  assert.equal(hasClientPortalAccess({ role: 'employee' }), false);
  assert.equal(hasClientPortalAccess({ role: 'admin' }), false);

  assert.equal(hasClientOperationsAccess({ role: 'Operations Manager' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'admin' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Web Developer' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'webdev' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'client' }), false);
  assert.equal(hasManagementAccess({ role: 'Web Developer' }), false);

  assert.equal(hasClientWorkspaceShellAccess({ role: 'client' }), true);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'member' }, true), true);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'member' }, false), false);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'admin' }, true), false);

  assert.equal(getAuthenticatedLandingPath({ role: 'client' }), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'Client Owner' }), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'member' }, true), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'admin' }, true), '/dashboard');
  assert.equal(getAuthenticatedLandingPath({ role: 'web_developer' }), '/dashboard');
});
