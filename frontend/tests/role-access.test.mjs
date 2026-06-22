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
  const { hasFullAccess, hasManagementAccess, normalizeRoleName } = loadRoleAccessHelper();

  assert.equal(normalizeRoleName('Operations Manager'), 'operations_manager');
  assert.equal(normalizeRoleName(' operations-manager '), 'operations_manager');
  assert.equal(normalizeRoleName('Backend / Technical Developer'), 'backend_technical_developer');
  assert.equal(normalizeRoleName('Contractor & Salary Payments'), 'contractor_salary_payments');

  assert.equal(typeof hasFullAccess, 'function');
  assert.equal(hasFullAccess({ role: 'Owner / Founder' }), true);
  assert.equal(hasFullAccess({ role: 'admin' }), true);
  assert.equal(hasFullAccess({ role: 'Operations Manager' }), false);

  assert.equal(hasManagementAccess({ role: 'employee' }), false);
  assert.equal(hasManagementAccess({ role: 'Manager' }), true);
  assert.equal(hasManagementAccess({ role: 'employee', roles: ['Operations Manager'] }), true);
  assert.equal(hasManagementAccess({ role: null, roles: ['administrator'] }), true);
  assert.equal(hasManagementAccess({ role: 'Chief Operations Officer' }), true);
  assert.equal(hasManagementAccess({ role: 'Project Manager' }), true);
  assert.equal(hasManagementAccess({ role: 'Owner / Founder' }), true);
  assert.equal(hasManagementAccess({ role: 'Bookkeeping' }), false);
});

test('separates client portal and client operations navigation access', () => {
  const {
    getAuthenticatedLandingPath,
    hasManagementAccess,
    hasClientPortalAccess,
    hasClientOperationsAccess,
    hasClientWorkspaceShellAccess,
    isClientPortalRouteAllowed,
  } = loadRoleAccessHelper();

  assert.equal(hasClientPortalAccess({ role: 'client' }), true);
  assert.equal(hasClientPortalAccess({ role: 'Client Owner' }), true);
  assert.equal(hasClientPortalAccess({ role: 'employee' }), false);
  assert.equal(hasClientPortalAccess({ role: 'admin' }), false);

  assert.equal(hasClientOperationsAccess({ role: 'Operations Manager' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'admin' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Web Developer' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'webdev' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Frontend Developer' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Backend / Technical Developer' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Project Manager' }), true);
  assert.equal(hasClientOperationsAccess({ role: 'Bookkeeping' }), false);
  assert.equal(hasClientOperationsAccess({ role: 'Content Creator / Designer' }), false);
  assert.equal(hasClientOperationsAccess({ role: 'client' }), false);
  assert.equal(hasManagementAccess({ role: 'Frontend Developer' }), false);

  assert.equal(hasClientWorkspaceShellAccess({ role: 'client' }), true);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'member' }, true), true);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'member' }, false), false);
  assert.equal(hasClientWorkspaceShellAccess({ role: 'admin' }, true), false);

  assert.equal(getAuthenticatedLandingPath({ role: 'client' }), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'Client Owner' }), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'member' }, true), '/client');
  assert.equal(getAuthenticatedLandingPath({ role: 'admin' }, true), '/dashboard');
  assert.equal(getAuthenticatedLandingPath({ role: 'web_developer' }), '/dashboard');

  assert.equal(isClientPortalRouteAllowed({ role: 'client' }, '/client'), true);
  assert.equal(isClientPortalRouteAllowed({ role: 'client' }, '/client/tickets'), true);
  assert.equal(isClientPortalRouteAllowed({ role: 'client' }, '/dashboard'), false);
  assert.equal(isClientPortalRouteAllowed({ role: 'client' }, '/operations'), false);
  assert.equal(isClientPortalRouteAllowed({ role: 'client' }, '/task-tracking'), false);
  assert.equal(isClientPortalRouteAllowed({ role: 'admin' }, '/operations'), true);
  assert.equal(isClientPortalRouteAllowed({ role: 'web_developer' }, '/task-tracking'), true);
});

test('separates payroll management from general management', () => {
  const { hasManagementAccess, hasPayrollManagementAccess } = loadRoleAccessHelper();

  assert.equal(typeof hasPayrollManagementAccess, 'function');
  assert.equal(hasPayrollManagementAccess({ role: 'Owner / Founder' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'admin' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'Operations Manager' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'Bookkeeper' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'Bookkeeping' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'Contractor & Salary Payments' }), true);
  assert.equal(hasPayrollManagementAccess({ role: 'Project Manager' }), false);
  assert.equal(hasPayrollManagementAccess({ role: 'Frontend Developer' }), false);
  assert.equal(hasManagementAccess({ role: 'Bookkeeping' }), false);
});
