import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChatUserPicker() {
  const helperPath = path.resolve(__dirname, '../src/lib/chat-user-picker.ts');
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
  }, { filename: helperPath });

  return compiledModule.exports;
}

function user(id, name, managerId = null, role = 'Developer', department = 'Website Developers') {
  return {
    id,
    name,
    email: `${id}@example.test`,
    managerId,
    roles: [{ role, department: { id: `${department}-id`, name: department } }],
  };
}

test('groups chat users by org-chart relationship before the wider directory', () => {
  const { buildChatUserPickerSections } = loadChatUserPicker();
  const sections = buildChatUserPickerSections([
    user('owner', 'Owner'),
    user('manager', 'Manager', 'owner'),
    user('me', 'Me', 'manager'),
    user('peer', 'Peer', 'manager'),
    user('report', 'Report', 'me'),
    user('other', 'Other'),
  ], 'me');

  assert.deepEqual(JSON.parse(JSON.stringify(sections.map((section) => section.id))), ['manager', 'direct-reports', 'team', 'directory']);
  assert.deepEqual(JSON.parse(JSON.stringify(sections.map((section) => section.users.map((item) => item.id)))), [
    ['manager'],
    ['report'],
    ['peer'],
    ['other', 'owner'],
  ]);
});

test('filters chat picker by role and department context', () => {
  const { buildChatUserPickerSections, getChatUserRoleSummary } = loadChatUserPicker();
  const sections = buildChatUserPickerSections([
    user('me', 'Me'),
    user('payroll', 'Payroll Lead', null, 'Bookkeeping', 'Payroll / Finance'),
    user('dev', 'Developer'),
  ], 'me', 'payroll');

  assert.deepEqual(JSON.parse(JSON.stringify(sections.map((section) => section.users.map((item) => item.id)))), [['payroll']]);
  assert.equal(getChatUserRoleSummary(sections[0].users[0]), 'Bookkeeping - Payroll / Finance');
});
