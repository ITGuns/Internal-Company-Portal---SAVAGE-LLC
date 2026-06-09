import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadOperationsData() {
  const helperPath = path.resolve(__dirname, '../src/lib/operations-data.ts');
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
      if (moduleName === './api') {
        return { apiFetch: async () => new Response('[]') };
      }
      throw new Error(`Unsupported test import: ${moduleName}`);
    },
    Response,
  }, { filename: helperPath });

  return compiledModule.exports;
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('derives operations roles from department payload roles', () => {
  const { deriveOperationsRolesFromDepartments } = loadOperationsData();

  const roles = deriveOperationsRolesFromDepartments([
    {
      id: 'dept-website',
      name: 'Website Developers',
      availableRoles: [
        {
          id: 'role-backend',
          name: 'Backend / Technical Developer',
          departmentId: 'dept-website',
          department: { id: 'dept-website', name: 'Website Developers' },
        },
      ],
    },
    {
      id: 'dept-ops',
      name: 'Operations',
      availableRoles: [
        {
          id: 'role-fulfillment',
          name: 'Fulfillment / Logistics VA',
        },
      ],
    },
  ]);

  assert.deepEqual(plain(roles), [
    {
      id: 'role-fulfillment',
      name: 'Fulfillment / Logistics VA',
      departmentId: 'dept-ops',
      department: { id: 'dept-ops', name: 'Operations' },
    },
    {
      id: 'role-backend',
      name: 'Backend / Technical Developer',
      departmentId: 'dept-website',
      department: { id: 'dept-website', name: 'Website Developers' },
    },
  ]);
});

test('reads fresh cached operations departments and drops expired values', () => {
  const {
    OPERATIONS_CACHE_GC_MS,
    cacheOperationsDepartments,
    readCachedOperationsDepartments,
  } = loadOperationsData();
  const storage = createStorage();
  const now = 2_000_000;

  cacheOperationsDepartments([{ id: 'dept-1', name: 'Operations' }], now, storage);

  assert.deepEqual(plain(readCachedOperationsDepartments(now + 1000, storage)), {
    departments: [{ id: 'dept-1', name: 'Operations' }],
    cachedAt: now,
  });

  assert.equal(readCachedOperationsDepartments(now + OPERATIONS_CACHE_GC_MS + 1, storage), undefined);
});
