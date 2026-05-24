import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadHelper() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-portal-summary.ts');
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

test('builds client portal summary from visible portal sections', () => {
  const { buildClientPortalSummary, getOpenClientTickets } = loadHelper();
  const tickets = [
    { id: 't1', status: 'new' },
    { id: 't2', status: 'resolved' },
    { id: 't3', status: 'in_progress' },
  ];

  assert.deepEqual(getOpenClientTickets(tickets).map((ticket) => ticket.id), ['t1', 't3']);
  const summary = buildClientPortalSummary({
    projects: [{ progress: 25 }, { progress: 75 }],
    tickets,
    updates: [{ id: 'u1' }],
    metrics: [{ id: 'm1' }, { id: 'm2' }],
    resources: [{ id: 'r1' }],
  });

  assert.deepEqual(JSON.parse(JSON.stringify(summary)), {
    projectCount: 2,
    openTicketCount: 2,
    updateCount: 1,
    metricCount: 2,
    resourceCount: 1,
    averageProgress: 50,
  });
});
