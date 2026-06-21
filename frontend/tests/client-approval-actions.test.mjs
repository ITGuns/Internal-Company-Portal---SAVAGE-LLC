import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientApprovalActions() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-approval-actions.ts');
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

test('detects approvals that client users can still answer', () => {
  const { canClientRespondToApproval } = loadClientApprovalActions();

  assert.equal(canClientRespondToApproval({ status: 'pending', visibleToClient: true }), true);
  assert.equal(canClientRespondToApproval({ status: 'approved', visibleToClient: true }), false);
  assert.equal(canClientRespondToApproval({ status: 'changes_requested', visibleToClient: true }), false);
  assert.equal(canClientRespondToApproval({ status: 'pending', visibleToClient: false }), false);
});

test('requires a response note only for requested changes', () => {
  const { getClientApprovalResponseError } = loadClientApprovalActions();

  assert.equal(getClientApprovalResponseError('approved', ''), null);
  assert.equal(getClientApprovalResponseError('changes_requested', 'Update the CTA.'), null);
  assert.equal(getClientApprovalResponseError('changes_requested', '   '), 'Add a short note so the team knows what to revise.');
});
