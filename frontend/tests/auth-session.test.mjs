import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAuthSessionHelpers() {
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
