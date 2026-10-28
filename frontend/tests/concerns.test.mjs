import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Compile the concerns helper alone; './api' is only used by the fetchers, so a stub is enough.
function loadConcerns() {
  const helperPath = path.resolve(__dirname, '../src/lib/concerns.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const compiledModule = { exports: {} };
  vm.runInNewContext(outputText, {
    module: compiledModule,
    exports: compiledModule.exports,
    URLSearchParams,
    require: (name) => {
      if (name === './api') return { apiFetch: async () => { throw new Error('not in tests'); } };
      throw new Error(`Unexpected import in concerns: ${name}`);
    },
  }, { filename: helperPath });
  return compiledModule.exports;
}

const concerns = loadConcerns();
// Values built inside the VM have another realm's prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

const person = (id) => ({ id, name: id, email: `${id}@example.test`, avatar: null });

test('status labels and tones', () => {
  assert.equal(concerns.getConcernStatusLabel('open'), 'Open');
  assert.equal(concerns.getConcernStatusLabel('answered'), 'Answered');
  assert.equal(concerns.getConcernStatusLabel('closed'), 'Closed');
  assert.equal(concerns.getConcernStatusLabel('weird'), 'Unknown');
  assert.equal(concerns.getConcernStatusTone('open'), 'warning');
  assert.equal(concerns.getConcernStatusTone('answered'), 'success');
  assert.equal(concerns.getConcernStatusTone('closed'), 'muted');
});

test('next step reads from the viewer side', () => {
  const ticket = (status) => ({ status, requester: person('worker'), assignee: person('boss') });
  assert.equal(concerns.getConcernNextStep(ticket('open'), 'boss'), 'Waiting for your reply');
  assert.equal(concerns.getConcernNextStep(ticket('open'), 'worker'), 'Waiting for a reply');
  assert.equal(concerns.getConcernNextStep(ticket('answered'), 'worker'), 'Reply received');
  assert.equal(concerns.getConcernNextStep(ticket('answered'), 'boss'), 'You replied');
  assert.equal(concerns.getConcernNextStep(ticket('answered'), 'admin'), 'Answered');
  assert.equal(concerns.getConcernNextStep(ticket('closed'), 'boss'), 'Closed');
});

test('URL filters parse safely and leave defaults out', () => {
  assert.equal(concerns.parseConcernBox('sent'), 'sent');
  assert.equal(concerns.parseConcernBox('everything'), 'inbox');
  assert.equal(concerns.parseConcernBox(null), 'inbox');
  assert.equal(concerns.parseConcernStatus('answered'), 'answered');
  assert.equal(concerns.parseConcernStatus('pending'), null);
  assert.equal(concerns.buildConcernsQuery({ box: 'inbox', status: null, q: '  ' }), '');
  assert.equal(concerns.buildConcernsQuery({ box: 'all', status: 'closed', q: ' pay day ' }), 'box=all&status=closed&q=pay+day');
});

test('only the parties or full access open a concern from a list', () => {
  const summary = { requester: person('worker'), assignee: person('boss') };
  assert.equal(concerns.canOpenConcern(summary, { id: 'worker', isFullAccess: false }), true);
  assert.equal(concerns.canOpenConcern(summary, { id: 'boss', isFullAccess: false }), true);
  assert.equal(concerns.canOpenConcern(summary, { id: 'manager', isFullAccess: false }), false);
  assert.equal(concerns.canOpenConcern(summary, { id: 'admin', isFullAccess: true }), true);
});

test('draft and reply validation match the server limits', () => {
  assert.deepEqual(plain(concerns.validateConcernDraft({ assigneeId: 'boss', subject: 'Pay day', body: 'When?' })), {});
  const errors = plain(concerns.validateConcernDraft({ assigneeId: '', subject: 'Hi', body: '   ' }));
  assert.deepEqual(Object.keys(errors).sort(), ['assigneeId', 'body', 'subject']);
  assert.ok(concerns.validateConcernDraft({ assigneeId: 'b', subject: 'x'.repeat(121), body: 'ok' }).subject);
  assert.ok(concerns.validateConcernDraft({ assigneeId: 'b', subject: 'Fine', body: 'x'.repeat(4001) }).body);
  assert.equal(concerns.hasDraftErrors({}), false);
  assert.equal(concerns.validateReply('  '), 'Write a reply first.');
  assert.equal(concerns.validateReply('Thanks'), null);
  assert.ok(concerns.validateReply('x'.repeat(4001)));
});

test('missing or forbidden concerns are told apart from other errors', () => {
  assert.equal(concerns.isConcernUnavailableError(new Error('Concern not found')), true);
  assert.equal(concerns.isConcernUnavailableError(new Error('You do not have access to this concern')), true);
  assert.equal(concerns.isConcernUnavailableError(new Error('Could not reach the Deskii backend.')), false);
});

test('dashboard attention item only appears for open inbox concerns', () => {
  const existing = [{ id: 'overdue-tasks' }];
  assert.deepEqual(plain(concerns.withOpenConcernsAttention(existing, 0)), existing);
  const items = plain(concerns.withOpenConcernsAttention(existing, 2));
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'open-concerns');
  assert.equal(items[0].href, '/concerns?status=open');
  assert.equal(items[0].count, 2);
  assert.equal(items[0].description, '2 open concerns need your reply.');
  assert.equal(plain(concerns.withOpenConcernsAttention(existing, 1))[0].description, '1 open concern needs your reply.');
  assert.equal(existing.length, 1, 'the input list is not changed');
});
