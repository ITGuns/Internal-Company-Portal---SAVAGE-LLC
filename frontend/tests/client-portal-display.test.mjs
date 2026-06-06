import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientPortalDisplay() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-portal-display.ts');
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
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('labels current user comments when user ids are strings or numbers', () => {
  const { getClientCommentAuthorLabel } = loadClientPortalDisplay();
  const comment = {
    authorId: '42',
    visibility: 'client',
    author: { name: 'Client User', email: 'client@example.com' },
  };

  assert.equal(getClientCommentAuthorLabel(comment, '42'), 'You');
  assert.equal(getClientCommentAuthorLabel(comment, 42), 'You');
  assert.equal(getClientCommentAuthorLabel({ ...comment, visibility: 'internal' }, 42), 'Internal note');
  assert.equal(getClientCommentAuthorLabel({ ...comment, authorId: '7' }, 42), 'Client User');
});

test('uses assigned service tier as the billing tier label', () => {
  const { getClientBillingTierLabel } = loadClientPortalDisplay();

  assert.equal(
    getClientBillingTierLabel(
      { tier: { name: 'Premium Care' } },
      { planName: 'Legacy Billing Plan' },
    ),
    'Premium Care',
  );
  assert.equal(getClientBillingTierLabel({ tier: null }, { planName: 'Legacy Billing Plan' }), 'Legacy Billing Plan');
  assert.equal(getClientBillingTierLabel({ tier: null }, null), 'Current plan');
});
