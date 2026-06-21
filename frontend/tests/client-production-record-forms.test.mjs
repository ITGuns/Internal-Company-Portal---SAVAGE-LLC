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
    notes: ' Monthly retainer ',
    visibleToClient: true,
  })), {
    planName: 'Growth',
    status: 'active',
    monthlyAmount: 2500,
    currency: 'USD',
    renewalAt: '2026-07-01',
    notes: 'Monthly retainer',
    visibleToClient: true,
  });
});

test('builds provider workflow payloads for storage bookings payments and invoices', () => {
  const {
    buildStorageRootPayload,
    buildBookingRequestPayload,
    buildPaymentConnectionPayload,
    buildInvoicePayload,
  } = loadProductionRecordForms();

  assert.deepEqual(normalize(buildStorageRootPayload({
    provider: 'local_app_storage',
    status: 'ready',
    folderName: ' Client Docs ',
    externalFolderId: '  ',
    externalUrl: ' https://drive.example/folder ',
    notes: ' Storage notes ',
  })), {
    provider: 'local_app_storage',
    status: 'ready',
    folderName: 'Client Docs',
    externalFolderId: null,
    externalUrl: 'https://drive.example/folder',
    notes: 'Storage notes',
  });

  assert.deepEqual(normalize(buildBookingRequestPayload({
    provider: 'manual',
    status: 'requested',
    subject: ' Onboarding Call ',
    preferredStartAt: '2026-06-20T09:00',
    preferredEndAt: '',
    timezone: '',
    meetingUrl: ' https://meet.example/deskii ',
    notes: ' Bring launch questions ',
    visibleToClient: true,
  })), {
    provider: 'manual',
    status: 'requested',
    subject: 'Onboarding Call',
    preferredStartAt: '2026-06-20T09:00',
    timezone: 'UTC',
    meetingUrl: 'https://meet.example/deskii',
    notes: 'Bring launch questions',
    visibleToClient: true,
  });

  assert.deepEqual(normalize(buildPaymentConnectionPayload({
    provider: 'stripe',
    accountType: 'payment',
    status: 'pending',
    mode: 'sandbox',
    accountLabel: ' Stripe test account ',
    externalCustomerId: ' cus_123 ',
    externalMerchantId: '',
    lastFour: '4242',
    webhookStatus: 'configured',
    notes: ' Ready for webhook test ',
  })), {
    provider: 'stripe',
    accountType: 'payment',
    status: 'pending',
    mode: 'sandbox',
    accountLabel: 'Stripe test account',
    externalCustomerId: 'cus_123',
    externalMerchantId: null,
    lastFour: '4242',
    webhookStatus: 'configured',
    notes: 'Ready for webhook test',
  });

  assert.deepEqual(normalize(buildInvoicePayload({
    provider: 'manual',
    status: 'draft',
    invoiceNumber: ' DESK-001 ',
    amount: '1200.50',
    currency: ' php ',
    issueAt: '2026-06-17',
    dueAt: '2026-06-30',
    paidAt: '',
    hostedInvoiceUrl: ' https://billing.example/invoices/1 ',
    notes: ' First invoice ',
    visibleToClient: false,
  })), {
    provider: 'manual',
    status: 'draft',
    invoiceNumber: 'DESK-001',
    amount: 1200.5,
    currency: 'PHP',
    issueAt: '2026-06-17',
    dueAt: '2026-06-30',
    hostedInvoiceUrl: 'https://billing.example/invoices/1',
    notes: 'First invoice',
    visibleToClient: false,
  });
});

test('builds report draft payloads from period inputs', () => {
  const { buildReportDraftPayload } = loadProductionRecordForms();

  assert.deepEqual(normalize(buildReportDraftPayload({
    title: ' June draft ',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    visibleToClient: false,
  })), {
    title: 'June draft',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    visibleToClient: false,
  });

  assert.deepEqual(normalize(buildReportDraftPayload({
    title: '  ',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    visibleToClient: true,
  })), {
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
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
    projectId: ' project-1 ',
    visibleToClient: true,
  })), {
    title: 'Launch day',
    description: 'Final checks',
    channel: 'website',
    status: 'scheduled',
    startAt: '2026-06-05',
    projectId: 'project-1',
    visibleToClient: true,
  });
});
