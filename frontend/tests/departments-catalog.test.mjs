import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDepartmentsHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/departments.ts');
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('matches the SAVAGE LLC onboarding org chart', () => {
  const { DEPARTMENTS, DEPARTMENT_ROLES } = loadDepartmentsHelper();

  assert.deepEqual(plain(DEPARTMENTS), [
    'All Departments',
    'Owners / Founders',
    'Project Management',
    'Operations',
    'Digital Marketing',
    'Analytics / Data',
    'Automation / Tech',
    'Website Developers',
    'Payroll / Finance',
  ]);

  assert.deepEqual(plain(DEPARTMENT_ROLES['Owners / Founders']), ['Owner / Founder']);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Project Management']), ['Project Manager']);
  assert.deepEqual(plain(DEPARTMENT_ROLES.Operations), [
    'Operations Manager',
    'Fulfillment / Logistics VA',
    'Inventory VA',
    'Customer Experience (CX) VA',
  ]);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Digital Marketing']), [
    'Digital Marketing Lead / Marketing VA',
    'Media Buyer / Ads Specialist',
    'Content Creator / Designer',
    'Email & SMS Marketer',
    'Influencer / Social Media VA',
  ]);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Analytics / Data']), ['Analytics / Data VA']);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Automation / Tech']), ['Automation / Tech VA']);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Website Developers']), [
    'Frontend Developer',
    'Backend / Technical Developer',
  ]);
  assert.deepEqual(plain(DEPARTMENT_ROLES['Payroll / Finance']), [
    'Bookkeeping',
    'Contractor & Salary Payments',
  ]);
});
