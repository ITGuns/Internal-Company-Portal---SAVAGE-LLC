import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadTsModule, plain } from './helpers/load-ts.mjs';

// removeAvatar (lib/api.ts) backs the Profile page's Remove photo button (2026-10-30).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPath = path.resolve(__dirname, '../src/lib/api.ts');
const CACHED_USER = JSON.stringify({ id: 'admin-1', avatar: 'data:image/png;base64,iVBORw0KGgoA' });

function createStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function loadApi(fetchImpl, localStorage) {
  return loadTsModule(apiPath, {
    stubs: {
      './constants': { STORAGE_KEYS: { ACCESS_TOKEN: 'accessToken', LEGACY_REFRESH_TOKEN: 'refreshToken', USER: 'currentUser' } },
      './auth-session': {
        clearAuthSession() {},
        getAuthErrorMessage: () => '',
        isAuthFailureResponse: async () => false,
        isDeactivatedAccountMessage: () => false,
        rememberDeactivatedLogin() {},
        SESSION_EXPIRED_MESSAGE: 'Session expired',
      },
      './api-url': {
        buildApiUrl: (endpoint) => `/api${endpoint}`,
        buildAuthUrl: (endpoint) => `/backend-auth${endpoint}`,
      },
    },
    globals: { window: { localStorage }, localStorage, fetch: fetchImpl },
  });
}

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('removes a profile photo with DELETE /users/:id/avatar and leaves the cached user to the caller', async () => {
  const calls = [];
  const localStorage = createStorage({ currentUser: CACHED_USER });
  const { removeAvatar } = loadApi(async (url, options) => {
    calls.push({ url, method: options.method });
    return jsonResponse(200, { success: true, user: { id: 'user-1', avatar: null } });
  }, localStorage);

  const result = await removeAvatar('user-1');

  assert.deepEqual(plain(result), { success: true, user: { id: 'user-1', avatar: null } });
  assert.deepEqual(calls, [{ url: '/api/users/user-1/avatar', method: 'DELETE' }]);
  // The target may be someone else, so the cached current user is not overwritten here.
  assert.equal(localStorage.getItem('currentUser'), CACHED_USER);
});

test('surfaces the server refusal when the photo belongs to someone else', async () => {
  const { removeAvatar } = loadApi(
    async () => jsonResponse(403, { error: 'Unauthorized to update another user\'s avatar' }),
    createStorage(),
  );

  await assert.rejects(removeAvatar('user-2'), { message: 'Unauthorized to update another user\'s avatar' });
});
