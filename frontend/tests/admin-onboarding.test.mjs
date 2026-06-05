import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAdminOnboarding() {
  const helperPath = path.resolve(__dirname, '../src/lib/admin-onboarding.ts');
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
    require: (modulePath) => {
      if (modulePath === './api') return { apiFetch: async () => ({ json: async () => ({}) }) };
      throw new Error(`Unexpected require: ${modulePath}`);
    },
  }, { filename: helperPath });

  return compiledModule.exports;
}

test('normalizes admin onboarding emails and validates minimal form input', () => {
  const { canSubmitOnboardingInvite, normalizeOnboardingEmail } = loadAdminOnboarding();

  assert.equal(normalizeOnboardingEmail(' New.User@Example.COM '), 'new.user@example.com');
  assert.equal(canSubmitOnboardingInvite({ email: 'user@example.com', roleId: 'role-1' }), true);
  assert.equal(canSubmitOnboardingInvite({ email: '', roleId: 'role-1' }), false);
  assert.equal(canSubmitOnboardingInvite({ email: 'user@example.com', roleId: '' }), false);
});

test('labels onboarding role options with department context', () => {
  const { getOnboardingRoleLabel } = loadAdminOnboarding();

  assert.equal(
    getOnboardingRoleLabel({ id: 'role-1', name: 'Designer', department: { id: 'dept-1', name: 'Creative' } }),
    'Designer - Creative',
  );
  assert.equal(getOnboardingRoleLabel({ id: 'role-2', name: 'admin', department: null }), 'admin - Global');
});
