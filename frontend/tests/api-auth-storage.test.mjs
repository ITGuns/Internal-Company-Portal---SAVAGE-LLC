import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    has(key) {
      return store.has(key);
    },
  };
}

function loadApiHelpers(localStorage) {
  const helperPath = path.resolve(__dirname, '../src/lib/api.ts');
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
    window: { localStorage },
    localStorage,
    require: (specifier) => {
      if (specifier === './constants') {
        return {
          STORAGE_KEYS: {
            ACCESS_TOKEN: 'accessToken',
            LEGACY_REFRESH_TOKEN: 'refreshToken',
            USER: 'currentUser',
          },
        };
      }

      if (specifier === './auth-session') {
        return {
          clearAuthSession() {},
          isAuthFailureResponse: async () => false,
          SESSION_EXPIRED_MESSAGE: 'Session expired',
        };
      }

      if (specifier === './api-url') {
        return {
          buildApiUrl: (endpoint) => `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
          buildAuthUrl: (endpoint) => `/backend-auth${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
        };
      }

      throw new Error(`Unexpected import: ${specifier}`);
    },
    Response,
    TypeError,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('reads cached auth user from local storage', () => {
  const cachedUser = { id: 'admin-1', name: 'Demo Admin', email: 'admin@example.test' };
  const localStorage = createStorage({ currentUser: JSON.stringify(cachedUser) });
  const { getCurrentUser } = loadApiHelpers(localStorage);

  assert.deepEqual(JSON.parse(JSON.stringify(getCurrentUser())), cachedUser);
});

test('drops malformed cached auth user instead of throwing', () => {
  const localStorage = createStorage({ currentUser: '{bad-json' });
  const { getCurrentUser } = loadApiHelpers(localStorage);

  assert.equal(getCurrentUser(), null);
  assert.equal(localStorage.has('currentUser'), false);
});
