import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientTicketFilters() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-ticket-filters.ts');
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

const tickets = [
  {
    id: 't1',
    title: 'Homepage review',
    description: 'Please review the draft hero copy',
    category: 'website',
    priority: 'normal',
    status: 'new',
    comments: [{ id: 'c1' }],
  },
  {
    id: 't2',
    title: 'Billing question',
    description: 'Invoice issue for this month',
    category: 'billing',
    priority: 'urgent',
    status: 'review',
    comments: [],
  },
  {
    id: 't3',
    title: 'Lead report',
    description: 'Can you explain last week calls?',
    category: 'reporting',
    priority: 'high',
    status: 'done',
    comments: [{ id: 'c2' }, { id: 'c3' }],
  },
];

test('filters client tickets by query and option sets without mutating input', () => {
  const { DEFAULT_CLIENT_TICKET_FILTERS, filterClientTickets } = loadClientTicketFilters();

  assert.deepEqual(filterClientTickets(tickets, DEFAULT_CLIENT_TICKET_FILTERS).map((ticket) => ticket.id), ['t1', 't2', 't3']);
  assert.deepEqual(filterClientTickets(tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, query: 'invoice' }).map((ticket) => ticket.id), ['t2']);
  assert.deepEqual(filterClientTickets(tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, query: 'calls' }).map((ticket) => ticket.id), ['t3']);
  assert.deepEqual(filterClientTickets(tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, status: 'open' }).map((ticket) => ticket.id), ['t1', 't2']);
  assert.deepEqual(filterClientTickets(tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, category: 'website', priority: 'normal' }).map((ticket) => ticket.id), ['t1']);
  assert.deepEqual(tickets.map((ticket) => ticket.id), ['t1', 't2', 't3']);
});

test('summarizes active client ticket filters for compact UI copy', () => {
  const { DEFAULT_CLIENT_TICKET_FILTERS, getClientTicketFilterSummary } = loadClientTicketFilters();

  assert.equal(getClientTicketFilterSummary(tickets, tickets, DEFAULT_CLIENT_TICKET_FILTERS), '3 requests');
  assert.equal(getClientTicketFilterSummary(tickets.slice(0, 1), tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, query: 'home' }), '1 of 3 requests');
  assert.equal(getClientTicketFilterSummary([], tickets, { ...DEFAULT_CLIENT_TICKET_FILTERS, status: 'done' }), '0 of 3 requests');
});
