import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/member-role-management.ts');
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
    URLSearchParams,
    require: (moduleName) => {
      if (moduleName === './role-access') {
        return loadRoleAccessHelper();
      }
      throw new Error(`Unsupported test import: ${moduleName}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

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

test('builds member role assignment payloads from available role ids', () => {
  const { buildMemberRoleAssignmentPayload } = loadHelper();
  const payload = buildMemberRoleAssignmentPayload('role-web-backend', [
    {
      id: 'role-web-backend',
      name: 'Backend / Technical Developer',
      departmentId: 'dept-web',
      department: { id: 'dept-web', name: 'Website Developers' },
    },
  ]);

  assert.deepEqual(plain(payload), {
    role: 'Backend / Technical Developer',
    departmentId: 'dept-web',
  });
});

test('encodes member role removal endpoints for role names with slashes', () => {
  const { buildMemberRoleRemovalEndpoint } = loadHelper();

  assert.equal(
    buildMemberRoleRemovalEndpoint('user-1', {
      role: 'Backend / Technical Developer',
      departmentId: 'dept-web',
    }),
    '/users/user-1/roles/Backend%20%2F%20Technical%20Developer?departmentId=dept-web',
  );
});

test('summarizes member authorization from assigned roles', () => {
  const { getMemberAuthorizationLabels } = loadHelper();

  assert.deepEqual(
    plain(getMemberAuthorizationLabels({
      roles: [{ role: 'Owner / Founder' }],
    })),
    ['Full access', 'Management', 'Payroll', 'Client ops'],
  );

  assert.deepEqual(
    plain(getMemberAuthorizationLabels({
      roles: [{ role: 'Bookkeeping' }],
    })),
    ['Payroll'],
  );

  assert.deepEqual(
    plain(getMemberAuthorizationLabels({
      roles: [],
    })),
    ['No active authorization'],
  );
});
