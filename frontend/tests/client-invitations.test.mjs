import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientInvitations() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-invitations.ts');
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
    require: () => ({}),
  }, { filename: helperPath });

  return compiledModule.exports;
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

test('builds sanitized client invite payloads', () => {
  const { createClientInvitePayload } = loadClientInvitations();

  assert.deepEqual(normalize(createClientInvitePayload({
    email: ' CLIENT@EXAMPLE.COM ',
    name: ' Client Contact ',
    role: 'client_admin',
    status: 'active',
  })), {
    email: 'client@example.com',
    name: 'Client Contact',
    role: 'client_admin',
    status: 'active',
  });

  assert.deepEqual(normalize(createClientInvitePayload({
    email: 'member@example.com',
    name: '   ',
    role: '',
    status: '',
  })), {
    email: 'member@example.com',
    role: 'client_member',
    status: 'active',
  });
});

test('labels client invite delivery state', () => {
  const { canSubmitClientInvite, getClientInviteDeliveryLabel } = loadClientInvitations();

  assert.equal(canSubmitClientInvite({ email: 'bad-email', name: '', role: 'client_member', status: 'active' }), false);
  assert.equal(canSubmitClientInvite({ email: 'owner@example.com', name: '', role: 'client_member', status: 'active' }), true);

  assert.equal(getClientInviteDeliveryLabel({ invite: { setupRequired: true, emailSent: true } }), 'Setup email sent');
  assert.equal(getClientInviteDeliveryLabel({ invite: { setupRequired: true, emailSent: false, setupUrl: 'http://localhost/reset' } }), 'Setup link ready');
  assert.equal(getClientInviteDeliveryLabel({ invite: { setupRequired: false, emailSent: false } }), 'Existing client user added');
});
