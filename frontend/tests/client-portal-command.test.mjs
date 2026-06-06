import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadClientPortalCommand() {
  const helperPath = path.resolve(__dirname, '../src/lib/client-portal-command.ts');
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

const overview = {
  organization: {
    id: 'org-1',
    name: 'GemField',
    slug: 'gemfield',
    status: 'active',
  },
  projects: [
    { id: 'p1', name: 'Website Build', status: 'in_progress', progress: 60, updatedAt: '2026-05-26T00:00:00.000Z' },
    { id: 'p2', name: 'Local SEO', status: 'planning', progress: 20, updatedAt: '2026-05-20T00:00:00.000Z' },
  ],
  tickets: [
    {
      id: 't1',
      title: 'Homepage copy',
      status: 'review',
      priority: 'normal',
      category: 'website',
      comments: [
        { id: 'c1', ticketId: 't1', body: 'Please review the hero copy.', visibility: 'client', createdAt: '2026-05-25T08:00:00.000Z' },
      ],
    },
    {
      id: 't2',
      title: 'Lead source question',
      status: 'new',
      priority: 'high',
      category: 'reporting',
      comments: [
        { id: 'c2', ticketId: 't2', body: 'Can you confirm these calls?', visibility: 'client', createdAt: '2026-05-26T09:00:00.000Z' },
      ],
    },
    {
      id: 't3',
      title: 'Old request',
      status: 'done',
      priority: 'normal',
      category: 'general',
      comments: [
        { id: 'c3', ticketId: 't3', body: 'Internal handoff', visibility: 'internal', createdAt: '2026-05-27T10:00:00.000Z' },
      ],
    },
  ],
  updates: [
    { id: 'u1', title: 'Preview sent', body: 'Homepage preview is ready.', createdAt: '2026-05-26T10:00:00.000Z' },
    { id: 'u2', title: 'Audit completed', body: 'Initial local SEO audit finished.', createdAt: '2026-05-24T10:00:00.000Z' },
  ],
  metrics: [
    { id: 'm1', label: 'Leads captured', value: '18', unit: 'leads', createdAt: '2026-05-26T10:00:00.000Z' },
    { id: 'm2', label: 'Review rating', value: '4.8', unit: 'stars', createdAt: '2026-05-25T10:00:00.000Z' },
  ],
  resources: [
    { id: 'r1', label: 'Preview link', url: 'https://preview.example.com', type: 'link' },
  ],
  workItems: [
    { id: 'w1', title: 'Build service area page', status: 'in_progress', progress: 75, visibleToClient: true, updatedAt: '2026-05-26T10:00:00.000Z' },
    { id: 'w2', title: 'Publish homepage copy', status: 'completed', progress: 100, visibleToClient: true, completedAt: '2026-05-27T10:00:00.000Z', updatedAt: '2026-05-27T10:00:00.000Z' },
  ],
  approvals: [
    { id: 'a1', title: 'Approve homepage copy', status: 'pending', visibleToClient: true, dueAt: '2026-05-28T00:00:00.000Z' },
  ],
  reports: [
    {
      id: 'rep1',
      title: 'May report',
      status: 'published',
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-05-31T00:00:00.000Z',
      leadsCaptured: 18,
      missedOpportunities: 2,
      followUpStatus: '3 calls need follow-up',
      leadSourceBreakdown: { organic: 10, maps: 8 },
      reputationSnapshot: { rating: 4.8 },
      localVisibilitySnapshot: { mapsRank: 3 },
    },
  ],
  roadmapRecommendations: [
    { id: 'road1', title: 'Add financing page', status: 'recommended', priority: 'high', sortOrder: 1 },
  ],
  assets: [
    { id: 'asset1', label: 'Logo package', type: 'brand', status: 'approved', url: 'https://example.com/logo.zip' },
  ],
  billingStatus: {
    id: 'bill1',
    planName: 'Growth',
    status: 'active',
    monthlyAmount: 2500,
    currency: 'USD',
  },
  calendarItems: [
    { id: 'cal1', title: 'June blog post', status: 'scheduled', channel: 'blog', startAt: '2026-06-10T09:00:00.000Z' },
  ],
};

test('builds client command center data from existing overview records', () => {
  const { buildClientCommandCenter } = loadClientPortalCommand();

  const commandCenter = buildClientCommandCenter(overview);

  assert.equal(commandCenter.averageProgress, 40);
  assert.deepEqual(Array.from(commandCenter.openRequests, (ticket) => ticket.id), ['t1', 't2']);
  assert.equal(commandCenter.latestUpdate?.id, 'u1');
  assert.equal(commandCenter.latestMessage?.comment.id, 'c2');
  assert.equal(commandCenter.latestMessage?.ticket.id, 't2');
  assert.deepEqual(Array.from(commandCenter.reviewRequests, (approval) => approval.id), ['a1']);
  assert.deepEqual(Array.from(commandCenter.openWorkItems, (item) => item.id), ['w1']);
  assert.deepEqual(Array.from(commandCenter.recentCompletedWork, (item) => item.id), ['w2']);
  assert.equal(commandCenter.latestReport?.id, 'rep1');
  assert.deepEqual(Array.from(commandCenter.reportMetrics, (metric) => metric.id), ['leadsCaptured', 'missedOpportunities', 'followUpStatus']);
  assert.deepEqual(Array.from(commandCenter.roadmapRecommendations, (item) => item.id), ['road1']);
  assert.deepEqual(Array.from(commandCenter.assets, (item) => item.id), ['asset1']);
  assert.equal(commandCenter.billingStatus?.id, 'bill1');
  assert.deepEqual(Array.from(commandCenter.calendarItems, (item) => item.id), ['cal1']);
});

test('returns empty command center data safely when overview is missing', () => {
  const { buildClientCommandCenter } = loadClientPortalCommand();

  assert.deepEqual(JSON.parse(JSON.stringify(buildClientCommandCenter(null))), {
    averageProgress: 0,
    reviewRequests: [],
    openRequests: [],
    latestUpdate: null,
    latestMessage: null,
    openWorkItems: [],
    recentCompletedWork: [],
    latestReport: null,
    reportMetrics: [],
    roadmapRecommendations: [],
    assets: [],
    billingStatus: null,
    calendarItems: [],
  });
});
