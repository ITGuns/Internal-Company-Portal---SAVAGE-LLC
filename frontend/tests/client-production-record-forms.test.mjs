import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadProductionRecordForms() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-production-record-forms.ts');
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

test('formats API dates for production record edit inputs', () => {
  const { toDateInputValue, toDateTimeLocalValue } = loadProductionRecordForms();

  assert.equal(toDateInputValue('2026-06-01T00:00:00.000Z'), '2026-06-01');
  assert.equal(toDateInputValue(null), '');
  assert.equal(toDateTimeLocalValue('2026-06-10T09:30:00.000Z'), '2026-06-10T09:30');
  assert.equal(toDateTimeLocalValue(undefined), '');
});

test('builds trimmed work-item and report update payloads', () => {
  const { buildWorkItemUpdatePayload, buildReportUpdatePayload } = loadProductionRecordForms();

  assert.deepEqual(normalize(buildWorkItemUpdatePayload({
    title: ' Build landing page ',
    description: ' Client-visible details ',
    status: 'in_progress',
    priority: 'high',
    progress: '82',
    dueAt: '2026-06-01',
    visibleToClient: true,
  })), {
    title: 'Build landing page',
    description: 'Client-visible details',
    status: 'in_progress',
    priority: 'high',
    progress: 82,
    dueAt: '2026-06-01',
    visibleToClient: true,
  });

  assert.deepEqual(normalize(buildReportUpdatePayload({
    title: ' June Report ',
    summary: '  ',
    status: 'published',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    leadsCaptured: '19',
    missedOpportunities: '',
    followUpStatus: 'Two pending callbacks',
    visibleToClient: false,
  })), {
    title: 'June Report',
    status: 'published',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    leadsCaptured: 19,
    followUpStatus: 'Two pending callbacks',
    visibleToClient: false,
  });
});

test('clamps numeric edit values before submission', () => {
  const { buildWorkItemUpdatePayload, buildBillingPayload } = loadProductionRecordForms();

  assert.equal(buildWorkItemUpdatePayload({
    title: 'Done',
    status: 'completed',
    priority: 'normal',
    progress: '130',
    dueAt: '',
    visibleToClient: true,
  }).progress, 100);

  assert.deepEqual(normalize(buildBillingPayload({
    planName: ' Growth ',
    status: 'active',
    monthlyAmount: '2500',
    currency: ' usd ',
    renewalAt: '2026-07-01',
    visibleToClient: true,
  })), {
    planName: 'Growth',
    status: 'active',
    monthlyAmount: 2500,
    currency: 'USD',
    renewalAt: '2026-07-01',
    visibleToClient: true,
  });
});

test('builds date-only calendar update payloads', () => {
  const { buildCalendarUpdatePayload } = loadProductionRecordForms();

  assert.deepEqual(normalize(buildCalendarUpdatePayload({
    title: ' Launch day ',
    description: ' Final checks ',
    channel: ' website ',
    status: 'scheduled',
    startAt: '2026-06-05',
    endAt: '',
    visibleToClient: true,
  })), {
    title: 'Launch day',
    description: 'Final checks',
    channel: 'website',
    status: 'scheduled',
    startAt: '2026-06-05',
    visibleToClient: true,
  });
});
