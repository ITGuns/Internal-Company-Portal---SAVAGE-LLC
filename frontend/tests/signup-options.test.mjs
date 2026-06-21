import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadSignupOptionsHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/signup-options.ts');
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

test('uses department availableRoles for signup role choices', () => {
  const { getSignupRoleOptions } = loadSignupOptionsHelper();

  const roles = getSignupRoleOptions([
    {
      id: 'dept-web',
      name: 'Website Developers',
      availableRoles: [
        { id: 'role-frontend', name: 'Frontend Developer', departmentId: 'dept-web' },
      ],
    },
    {
      id: 'dept-ops',
      name: 'Operations Manager',
      availableRoles: [
        { id: 'role-ops', name: 'Operations Manager', departmentId: 'dept-ops' },
      ],
    },
  ], 'dept-web');

  assert.deepEqual(roles, [
    { id: 'role-frontend', name: 'Frontend Developer', departmentId: 'dept-web' },
  ]);
});

test('returns no signup roles until a department is selected', () => {
  const { getSignupRoleOptions } = loadSignupOptionsHelper();
  const roles = getSignupRoleOptions([], '');

  assert.equal(Array.isArray(roles), true);
  assert.equal(roles.length, 0);
});
