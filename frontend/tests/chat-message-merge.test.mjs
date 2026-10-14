import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadChatMessageMergeHelpers() {
  const helperPath = path.resolve(__dirname, '../src/lib/chat-message-merge.ts');
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

function message(id, minute, overrides = {}) {
  return {
    id,
    conversationId: 'conv-1',
    senderId: 'user-2',
    content: `message ${id}`,
    createdAt: `2026-10-14T10:${String(minute).padStart(2, '0')}:00.000Z`,
    sender: { id: 'user-2', name: 'Ana', avatar: '', email: 'ana@example.com' },
    ...overrides,
  };
}

// Array.from builds the array in this realm, so deepEqual does not trip over the vm prototype.
const ids = (messages) => Array.from(messages, (item) => item.id);

test('adds polled messages once, however often the same page comes back', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const current = [message('a', 1), message('b', 2)];
  const incoming = [message('a', 1), message('b', 2), message('c', 3)];

  const first = mergePolledMessages(current, incoming);
  const second = mergePolledMessages(first, incoming);

  assert.deepEqual(ids(first), ['a', 'b', 'c']);
  assert.deepEqual(ids(second), ['a', 'b', 'c']);
});

test('returns the same array when nothing changed, so the view does not jump', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const current = [message('a', 1), message('b', 2)];

  const merged = mergePolledMessages(current, [message('a', 1), message('b', 2)]);

  assert.equal(merged, current);
});

test('takes the server copy for edits and reactions', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const current = [message('a', 1)];
  const edited = message('a', 1, {
    content: 'edited',
    editedAt: '2026-10-14T10:05:00.000Z',
    reactions: [{ id: 'r1', messageId: 'a', userId: 'user-1', emoji: '+1' }],
  });

  const merged = mergePolledMessages(current, [edited]);

  assert.equal(merged[0].content, 'edited');
  assert.equal(merged[0].reactions.length, 1);
});

test('keeps messages older than the polled page and drops ones deleted inside it', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const current = [message('old', 1), message('a', 2), message('deleted', 3), message('b', 4)];

  const merged = mergePolledMessages(current, [message('a', 2), message('b', 4)]);

  assert.deepEqual(ids(merged), ['old', 'a', 'b']);
});

test('keeps an optimistic message until its saved copy arrives', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const pending = message('temp-1', 5, { senderId: 'me', content: 'on my way' });
  const current = [message('a', 1), pending];

  const beforeSave = mergePolledMessages(current, [message('a', 1)]);
  assert.deepEqual(ids(beforeSave), ['a', 'temp-1']);

  const afterSave = mergePolledMessages(current, [
    message('a', 1),
    message('saved-1', 5, { senderId: 'me', content: 'on my way' }),
  ]);
  assert.deepEqual(ids(afterSave), ['a', 'saved-1']);
});

test('does not swap an optimistic message for an older saved one with the same text', () => {
  const { mergePolledMessages } = loadChatMessageMergeHelpers();
  const current = [
    message('saved-1', 1, { senderId: 'me', content: 'ok' }),
    message('temp-2', 2, { senderId: 'me', content: 'ok' }),
  ];

  const merged = mergePolledMessages(current, [message('saved-1', 1, { senderId: 'me', content: 'ok' })]);

  assert.deepEqual(ids(merged), ['saved-1', 'temp-2']);
});

test('settles a sent message without duplicating one a poll already added', () => {
  const { replacePendingMessage } = loadChatMessageMergeHelpers();
  const saved = message('saved-1', 5, { senderId: 'me', content: 'hello' });
  const pending = message('temp-1', 5, { senderId: 'me', content: 'hello' });

  assert.deepEqual(ids(replacePendingMessage([message('a', 1), pending], 'temp-1', saved)), ['a', 'saved-1']);
  assert.deepEqual(ids(replacePendingMessage([message('a', 1), saved, pending], 'temp-1', saved)), ['a', 'saved-1']);
});
