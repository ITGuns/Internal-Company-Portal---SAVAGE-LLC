import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadOperationsOrgChart() {
  const helperPath = path.resolve(__dirname, '../src/lib/operations-org-chart.ts');
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
    require: (moduleName) => {
      if (moduleName === './member-role-management') {
        return {
          getMemberDisplayName: (member) => member.name?.trim() || member.email,
        };
      }
      throw new Error(`Unsupported test import: ${moduleName}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

function member(id, name, managerId = null) {
  return {
    id,
    name,
    email: `${id}@example.test`,
    managerId,
    roles: [],
  };
}

function rowNames(rows) {
  return JSON.parse(JSON.stringify(rows.map((row) => row.nodes.map((node) => node.member.name))));
}

test('builds org chart rows from roots down to deeper reports', () => {
  const { buildOperationsOrgChartRows } = loadOperationsOrgChart();

  const rows = buildOperationsOrgChartRows([
    member('owner', 'Owner'),
    member('ops', 'Operations Manager', 'owner'),
    member('developer', 'Developer', 'ops'),
    member('designer', 'Designer', 'ops'),
  ]);

  assert.deepEqual(rowNames(rows), [
    ['Owner'],
    ['Operations Manager'],
    ['Designer', 'Developer'],
  ]);
});

test('keeps members with missing managers as flexible roots', () => {
  const { buildOperationsOrgChartRows } = loadOperationsOrgChart();

  const rows = buildOperationsOrgChartRows([
    member('admin', 'Admin'),
    member('orphan', 'No Visible Manager', 'missing-manager'),
    member('report', 'Direct Report', 'admin'),
  ]);

  assert.deepEqual(rowNames(rows), [
    ['Admin', 'No Visible Manager'],
    ['Direct Report'],
  ]);
});

test('filters hierarchy rows while preserving matched ancestors', () => {
  const { buildOperationsOrgChartRows } = loadOperationsOrgChart();

  const rows = buildOperationsOrgChartRows([
    member('admin', 'Admin'),
    member('manager', 'Payroll Manager', 'admin'),
    member('developer', 'Website Developer', 'manager'),
  ], 'website');

  assert.deepEqual(rowNames(rows), [
    ['Admin'],
    ['Payroll Manager'],
    ['Website Developer'],
  ]);
});

test('collects descendants for safe manager assignment options', () => {
  const { buildOperationsOrgChartTree, collectOperationsDescendantIds } = loadOperationsOrgChart();
  const tree = buildOperationsOrgChartTree([
    member('admin', 'Admin'),
    member('manager', 'Manager', 'admin'),
    member('staff', 'Staff', 'manager'),
    member('peer', 'Peer'),
  ]);

  assert.deepEqual([...collectOperationsDescendantIds('admin', tree)].sort(), ['manager', 'staff']);
  assert.deepEqual([...collectOperationsDescendantIds('peer', tree)], []);
});
