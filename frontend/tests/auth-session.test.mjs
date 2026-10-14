import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAuthSessionHelpers(browserGlobals = {}) {
  const helperPath = path.resolve(__dirname, '../src/lib/auth-session.ts');
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
    require: (specifier) => {
      if (specifier === './constants') {
        return { STORAGE_KEYS: { USER: 'currentUser' } };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
    Event,
    ...browserGlobals,
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('treats expired token responses as auth failures without masking permission errors', () => {
  const { getAuthErrorMessage, isTokenAuthFailure } = loadAuthSessionHelpers();

  assert.equal(isTokenAuthFailure(401), true);
  assert.equal(isTokenAuthFailure(403, 'Invalid or expired token'), true);
  assert.equal(isTokenAuthFailure(403, 'Invalid or expired refresh token'), true);
  assert.equal(isTokenAuthFailure(403, 'Insufficient permissions'), false);
  assert.equal(isTokenAuthFailure(500, 'Invalid or expired token'), false);
  assert.equal(getAuthErrorMessage({ error: 'Invalid or expired token' }), 'Invalid or expired token');
  assert.equal(getAuthErrorMessage({ details: 'Insufficient permissions' }), 'Insufficient permissions');
});

test('leaves a one-shot deactivated notice for the login page', () => {
  const store = new Map();
  const sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  const {
    DEACTIVATED_ACCOUNT_MESSAGE,
    isDeactivatedAccountMessage,
    rememberDeactivatedLogin,
    takeLoginNotice,
  } = loadAuthSessionHelpers({ window: {}, sessionStorage });

  assert.equal(isDeactivatedAccountMessage('This account is deactivated. Contact an administrator.'), true);
  assert.equal(isDeactivatedAccountMessage('Invalid or expired refresh token'), false);
  assert.equal(isDeactivatedAccountMessage(), false);

  assert.equal(takeLoginNotice(), '');
  rememberDeactivatedLogin();
  assert.equal(takeLoginNotice(), DEACTIVATED_ACCOUNT_MESSAGE);
  assert.equal(DEACTIVATED_ACCOUNT_MESSAGE, 'This account is deactivated. Contact an administrator.');
  assert.equal(takeLoginNotice(), '', 'the notice is read once');
});

test('tries the cookie refresh only with a session hint or on the OAuth callback', () => {
  const { shouldTryRefreshSession } = loadAuthSessionHelpers();

  assert.equal(shouldTryRefreshSession(true, '/dashboard'), true, 'a stored user means a refresh cookie may exist');
  assert.equal(shouldTryRefreshSession(false, '/login'), false, 'logged-out visitors skip the refresh call');
  assert.equal(shouldTryRefreshSession(false, '/'), false);
  assert.equal(shouldTryRefreshSession(false, '/auth/callback'), true, 'OAuth lands here with a cookie and no stored user');
  assert.equal(shouldTryRefreshSession(false, '/auth/callback/'), true);
  assert.equal(shouldTryRefreshSession(false, '/auth/callbacks'), false);
  assert.equal(shouldTryRefreshSession(false, '/auth/sandbox'), false);
});
