import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientMemberships() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-memberships.ts');
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

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

const memberships = [
  {
    id: 'm1',
    organizationId: 'org-1',
    userId: 'u1',
    role: 'client_owner',
    status: 'active',
    user: { id: 'u1', email: 'owner@example.com', name: 'Account Owner' },
  },
  {
    id: 'm2',
    organizationId: 'org-1',
    userId: 'u2',
    role: 'client_member',
    status: 'inactive',
    user: { id: 'u2', email: 'member@example.com', name: null },
  },
];

test('filters and names client memberships for account views', () => {
  const { getActiveClientMemberships, getClientMembershipDisplayName } = loadClientMemberships();

  assert.deepEqual(getActiveClientMemberships(memberships).map((membership) => membership.id), ['m1']);
  assert.equal(getClientMembershipDisplayName(memberships[0]), 'Account Owner');
  assert.equal(getClientMembershipDisplayName(memberships[1]), 'member@example.com');
});

test('builds minimal membership update payloads', () => {
  const {
    buildClientMembershipUpdatePayload,
    createClientMembershipEdit,
    hasClientMembershipEditChanges,
  } = loadClientMemberships();

  const unchanged = createClientMembershipEdit(memberships[0]);
  assert.equal(hasClientMembershipEditChanges(memberships[0], unchanged), false);
  assert.deepEqual(normalize(buildClientMembershipUpdatePayload(memberships[0], unchanged)), {});

  const changed = { role: 'client_admin', status: 'inactive' };
  assert.equal(hasClientMembershipEditChanges(memberships[0], changed), true);
  assert.deepEqual(normalize(buildClientMembershipUpdatePayload(memberships[0], changed)), changed);
});
