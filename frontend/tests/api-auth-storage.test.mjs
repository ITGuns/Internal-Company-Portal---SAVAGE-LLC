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

function loadApiHelpers(localStorage, fetchImpl = async () => {
  throw new Error('Unexpected fetch call');
}, authSessionOverrides = {}) {
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
    fetch: fetchImpl,
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
          getAuthErrorMessage: (payload) => (typeof payload?.error === 'string' ? payload.error : ''),
          isAuthFailureResponse: async () => false,
          isDeactivatedAccountMessage: (message = '') => message.toLowerCase().includes('deactivated'),
          rememberDeactivatedLogin() {},
          SESSION_EXPIRED_MESSAGE: 'Session expired',
          ...authSessionOverrides,
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

test('keeps access tokens in memory instead of local storage', () => {
  const localStorage = createStorage();
  const { getAuthToken, setAuthToken } = loadApiHelpers(localStorage);

  setAuthToken('access-token-value');

  assert.equal(getAuthToken(), 'access-token-value');
  assert.equal(localStorage.has('accessToken'), false);
});

test('purges legacy local storage refresh tokens instead of reusing them', () => {
  const localStorage = createStorage({ refreshToken: 'legacy-refresh-token' });
  const { getRefreshToken } = loadApiHelpers(localStorage);

  assert.equal(getRefreshToken(), null);
  assert.equal(localStorage.has('refreshToken'), false);
});

test('shares one refresh-token rotation across concurrent callers', async () => {
  const localStorage = createStorage();
  let fetchCalls = 0;
  const { getAuthToken, refreshAccessToken } = loadApiHelpers(localStorage, async () => {
    fetchCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      ok: true,
      async json() {
        return { accessToken: 'rotated-access-token' };
      },
    };
  });

  const tokens = await Promise.all([
    refreshAccessToken(),
    refreshAccessToken(),
    refreshAccessToken(),
  ]);

  assert.equal(fetchCalls, 1);
  assert.deepEqual(tokens, [
    'rotated-access-token',
    'rotated-access-token',
    'rotated-access-token',
  ]);
  assert.equal(getAuthToken(), 'rotated-access-token');
});

test('notes a deactivated account when the refresh is refused with 403', async () => {
  const respond = (status, error) => async () => ({
    ok: false,
    status,
    async json() {
      return { error };
    },
  });
  let notices = 0;
  const overrides = { rememberDeactivatedLogin: () => { notices += 1; } };

  const deactivated = loadApiHelpers(
    createStorage(),
    respond(403, 'This account is deactivated. Contact an administrator.'),
    overrides,
  );
  assert.equal(await deactivated.refreshAccessToken(), null);
  assert.equal(notices, 1);

  const expired = loadApiHelpers(createStorage(), respond(403, 'Invalid or expired refresh token'), overrides);
  assert.equal(await expired.refreshAccessToken(), null);
  assert.equal(notices, 1, 'an expired refresh token is not a deactivation');
});
