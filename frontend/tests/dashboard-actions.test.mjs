import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDashboardActionsHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/dashboard-actions.ts');
  const roleAccessPath = path.resolve(__dirname, '../src/lib/role-access.ts');
  const deepLinksPath = path.resolve(__dirname, '../src/lib/dashboard-deep-links.ts');
  const source = fs.readFileSync(helperPath, 'utf8');
  const roleAccessSource = fs.readFileSync(roleAccessPath, 'utf8');
  const deepLinksSource = fs.readFileSync(deepLinksPath, 'utf8');

  const transpile = (code) => ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const roleAccessModule = { exports: {} };
  vm.runInNewContext(transpile(roleAccessSource), {
    module: roleAccessModule,
    exports: roleAccessModule.exports,
    console,
  }, { filename: roleAccessPath });

  const deepLinksModule = { exports: {} };
  vm.runInNewContext(transpile(deepLinksSource), {
    module: deepLinksModule,
    exports: deepLinksModule.exports,
    console,
  }, { filename: deepLinksPath });

  const compiledModule = { exports: {} };
  vm.runInNewContext(transpile(source), {
    module: compiledModule,
    exports: compiledModule.exports,
    console,
    require: (specifier) => {
      if (specifier === './role-access') return roleAccessModule.exports;
      if (specifier === './dashboard-deep-links') return deepLinksModule.exports;
      throw new Error(`Unexpected require: ${specifier}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('builds employee quick actions without payroll management shortcuts', () => {
  const { getDefaultDashboardActionIds, resolveDashboardActions } = loadDashboardActionsHelper();
  const employee = { id: 'employee-1', role: 'Support Specialist', roles: [] };

  assert.deepEqual(
    JSON.parse(JSON.stringify(getDefaultDashboardActionIds(employee))),
    ['createTask', 'addDailyLog', 'myTime', 'announcements'],
  );

  const actions = resolveDashboardActions(['reviewPayroll', 'clientOperations', 'createTask'], employee);
  assert.deepEqual(
    JSON.parse(JSON.stringify(actions.map((action) => action.id))),
    ['createTask', 'addDailyLog', 'myTime', 'announcements'],
  );
  assert.equal(actions.some((action) => action.id === 'reviewPayroll'), false);
});

test('builds management and payroll defaults from authorization roles', () => {
  const { getDefaultDashboardActionIds } = loadDashboardActionsHelper();

  assert.deepEqual(
    JSON.parse(JSON.stringify(getDefaultDashboardActionIds({ id: 'manager-1', role: 'Project Manager', roles: [] }))),
    ['clientOperations', 'approvals', 'createTask', 'addDailyLog'],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(getDefaultDashboardActionIds({ id: 'payroll-1', role: 'Bookkeeping', roles: [] }))),
    ['reviewPayroll', 'myTime', 'createTask', 'addDailyLog'],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(getDefaultDashboardActionIds({ id: 'ops-1', role: 'Operations Manager', roles: [] }))),
    ['clientOperations', 'approvals', 'reviewPayroll', 'createTask'],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(getDefaultDashboardActionIds({ id: 'dev-1', role: 'Website Developer', roles: [] }))),
    ['clientOperations', 'createTask', 'addDailyLog', 'myTime'],
  );
});

test('cleans saved quick-action preferences and fills missing defaults', () => {
  const { resolveDashboardActions } = loadDashboardActionsHelper();
  const payrollUser = { id: 'payroll-1', role: 'Bookkeeping', roles: [] };

  const actions = resolveDashboardActions(
    ['myTime', 'unknown', 'myTime', 'reviewPayroll', 'clientOperations'],
    payrollUser,
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(actions.map((action) => action.id))),
    ['myTime', 'reviewPayroll', 'createTask', 'addDailyLog'],
  );
});

test('stores quick-action preferences with a user-scoped key', () => {
  const {
    getDashboardActionsStorageKey,
    readStoredDashboardActionIds,
    writeStoredDashboardActionIds,
  } = loadDashboardActionsHelper();
  const storage = new Map();
  const localStorageLike = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };

  assert.equal(getDashboardActionsStorageKey('user-1'), 'dashboard_quick_actions:user-1');

  writeStoredDashboardActionIds('user-1', ['addDailyLog', 'createTask'], localStorageLike);
  assert.deepEqual(
    JSON.parse(JSON.stringify(readStoredDashboardActionIds('user-1', localStorageLike))),
    ['addDailyLog', 'createTask'],
  );

  storage.set(getDashboardActionsStorageKey('user-1'), '{"bad":true}');
  assert.equal(readStoredDashboardActionIds('user-1', localStorageLike), null);
});
