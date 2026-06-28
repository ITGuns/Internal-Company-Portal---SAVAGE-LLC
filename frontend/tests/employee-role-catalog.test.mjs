import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEmployeeRoleCatalog() {
  const helperPath = path.resolve(__dirname, '../src/lib/payroll-calendar/employee-role-catalog.ts');
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
    require: (moduleName) => {
      if (moduleName === '@/lib/departments') {
        return {
          DEPARTMENTS: [
            'All Departments',
            'Operations',
            'Website Developers',
          ],
          DEPARTMENT_ROLES: {
            Operations: ['Operations Manager', 'Inventory VA'],
            'Website Developers': ['Frontend Developer'],
          },
        };
      }
      throw new Error(`Unsupported test import: ${moduleName}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('builds payroll employee role catalog from live operations departments', () => {
  const {
    buildEmployeeRoleCatalog,
    getEmployeeDepartmentNames,
    getEmployeeRolesForDepartment,
  } = loadEmployeeRoleCatalog();

  const catalog = buildEmployeeRoleCatalog([
    {
      id: 'dept-ops',
      name: 'Operations',
      availableRoles: [
        { id: 'role-ops', name: 'Operations Manager' },
        { id: 'role-ops-duplicate', name: ' operations manager ' },
        { id: 'role-custom', name: 'Marketplace QA Lead' },
      ],
    },
    {
      id: 'dept-custom',
      name: 'Creative Ops',
      availableRoles: [{ id: 'role-designer', name: 'Designer' }],
    },
  ]);

  assert.deepEqual(plain(getEmployeeDepartmentNames(catalog)), ['Operations', 'Creative Ops']);
  assert.deepEqual(plain(getEmployeeRolesForDepartment(catalog, 'Operations')), [
    'Operations Manager',
    'Marketplace QA Lead',
  ]);
  assert.deepEqual(plain(getEmployeeRolesForDepartment(catalog, 'Creative Ops')), ['Designer']);
});

test('falls back to static org chart roles when live catalog is unavailable', () => {
  const {
    buildEmployeeRoleCatalog,
    getEmployeeDepartmentNames,
    getEmployeeRolesForDepartment,
  } = loadEmployeeRoleCatalog();

  const catalog = buildEmployeeRoleCatalog();

  assert.deepEqual(plain(getEmployeeDepartmentNames(catalog)), ['Operations', 'Website Developers']);
  assert.deepEqual(plain(getEmployeeRolesForDepartment(catalog, 'Operations')), [
    'Operations Manager',
    'Inventory VA',
  ]);
});
