import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientCommunication() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-communication.ts');
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

const baseTicket = {
  id: 'ticket-1',
  organizationId: 'org-1',
  title: 'Homepage edits',
  category: 'website',
  priority: 'normal',
  status: 'in_progress',
  createdById: 'client-1',
  assignedToId: 'staff-1',
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('derives client ticket next action from visible conversation state', () => {
  const { getClientTicketNextAction } = loadClientCommunication();

  assert.equal(getClientTicketNextAction({ ...baseTicket, comments: [] }, 'client-1').label, 'Waiting on team');
  assert.equal(getClientTicketNextAction({
    ...baseTicket,
    comments: [{ id: 'c1', body: 'Any update?', visibility: 'client', authorId: 'client-1' }],
  }, 'client-1').label, 'Waiting on team');
  assert.equal(getClientTicketNextAction({
    ...baseTicket,
    comments: [{ id: 'c2', body: 'Ready for review.', visibility: 'client', authorId: 'admin-1' }],
  }, 'client-1').label, 'Client review');
  assert.equal(getClientTicketNextAction({ ...baseTicket, status: 'done' }, 'client-1').label, 'Completed');
});

test('derives admin next action without exposing internal notes as client conversation', () => {
  const {
    getAdminTicketNextAction,
    getClientVisibleComments,
    getLastClientVisibleComment,
  } = loadClientCommunication();

  const ticket = {
    ...baseTicket,
    comments: [
      { id: 'i1', body: 'Assign to dev.', visibility: 'internal', authorId: 'admin-1' },
      { id: 'c1', body: 'Please confirm.', visibility: 'client', authorId: 'admin-1' },
    ],
  };

  assert.deepEqual(getClientVisibleComments(ticket).map((comment) => comment.id), ['c1']);
  assert.equal(getLastClientVisibleComment(ticket).id, 'c1');
  assert.equal(getAdminTicketNextAction(ticket).label, 'Waiting on client');
  assert.equal(getAdminTicketNextAction({
    ...baseTicket,
    comments: [{ id: 'c2', body: 'Can you revise?', visibility: 'client', authorId: 'client-1' }],
  }).label, 'Team response needed');
});

test('derives ticket assignment labels, project labels, and SLA state', () => {
  const {
    getAdminTicketNextAction,
    getClientTicketAssigneeName,
    getClientTicketProjectName,
    getClientTicketSlaState,
  } = loadClientCommunication();

  const unassignedTicket = { ...baseTicket, assignedToId: null, projectId: 'project-1' };
  assert.equal(getAdminTicketNextAction(unassignedTicket).label, 'Assign service staff');
  assert.equal(getClientTicketAssigneeName(unassignedTicket, []), 'Unassigned');
  assert.equal(getClientTicketProjectName(unassignedTicket, [{ id: 'project-1', name: 'Launch Sprint' }]), 'Launch Sprint');

  assert.equal(
    getClientTicketAssigneeName(baseTicket, [{ id: 'staff-1', email: 'ops@example.com', name: 'Ops Lead' }]),
    'Ops Lead',
  );

  assert.deepEqual(
    plain(
      getClientTicketSlaState({
        ...baseTicket,
        priority: 'urgent',
        updatedAt: '2026-06-15T00:00:00.000Z',
      }, new Date('2026-06-15T23:00:00.000Z')),
    ),
    {
      label: 'Due soon',
      description: '1h remaining',
      tone: 'warning',
    },
  );

  assert.equal(
    getClientTicketSlaState({
      ...baseTicket,
      priority: 'urgent',
      updatedAt: '2026-06-15T00:00:00.000Z',
    }, new Date('2026-06-16T02:00:00.000Z')).label,
    'Overdue',
  );
});
