import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadTaskInvitations() {
  const helperPath = path.resolve(__dirname, '../src/lib/task-invitations.ts');
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

test('finds the current user pending task invite', () => {
  const { getPendingTaskInviteForUser } = loadTaskInvitations();

  const invite = getPendingTaskInviteForUser({
    collaborators: [
      { id: 'collab-1', userId: 'user-1', status: 'accepted' },
      { id: 'collab-2', userId: 'user-2', status: 'invited' },
    ],
  }, 'user-2');

  assert.equal(invite.id, 'collab-2');
});

test('ignores non-pending and missing task invites', () => {
  const { getPendingTaskInviteForUser } = loadTaskInvitations();

  assert.equal(getPendingTaskInviteForUser({
    collaborators: [
      { id: 'collab-1', userId: 'user-1', status: 'declined' },
      { id: 'collab-2', userId: 'user-2', status: 'accepted' },
    ],
  }, 'user-2'), null);
  assert.equal(getPendingTaskInviteForUser({ collaborators: [] }, 'user-2'), null);
  assert.equal(getPendingTaskInviteForUser({ collaborators: [{ id: 'collab-3', userId: 'user-2', status: 'invited' }] }, ''), null);
});
