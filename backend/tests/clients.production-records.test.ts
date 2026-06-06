import assert from 'node:assert/strict'
import {
  serializeClientApprovalForClient,
  serializeClientApprovalForManagement,
  serializeClientBillingStatusForClient,
  serializeClientCalendarItemForClient,
  serializeClientReportForClient,
  serializeClientRoadmapRecommendationForClient,
  serializeClientWorkItemForClient,
} from '../src/clients/clients.serializers'
import {
  ClientValidationError,
  parseCreateClientApprovalInput,
  parseCreateClientAssetInput,
  parseCreateClientCalendarItemInput,
  parseCreateClientReportInput,
  parseCreateClientRoadmapRecommendationInput,
  parseCreateClientWorkItemInput,
  parseGenerateClientReportDraftInput,
  parseClientApprovalResponseInput,
  parseUpdateClientApprovalInput,
  parseUpdateClientWorkItemInput,
  parseUpsertClientBillingStatusInput,
} from '../src/clients/clients.validation'

const date = new Date('2026-05-27T00:00:00.000Z')

assert.deepEqual(parseCreateClientWorkItemInput({
  title: ' Build service-area page ',
  description: ' Add Queens landing page. ',
  status: ' In Progress ',
  progress: 130,
  dueAt: '2026-06-01',
  visibleToClient: 'false',
  assignedToId: ' user-internal ',
  organizationId: 'client-should-not-control',
  createdById: 'user-evil',
}), {
  title: 'Build service-area page',
  description: 'Add Queens landing page.',
  status: 'in_progress',
  priority: 'normal',
  progress: 100,
  dueAt: new Date('2026-06-01'),
  projectId: undefined,
  assignedToId: 'user-internal',
  visibleToClient: false,
  sortOrder: 0,
})
assert.equal('organizationId' in parseCreateClientWorkItemInput({ title: 'Safe item' }), false)
assert.equal('createdById' in parseCreateClientWorkItemInput({ title: 'Safe item' }), false)
const completedWorkInput = parseUpdateClientWorkItemInput({ status: 'completed', progress: 90 })
assert.equal(completedWorkInput.status, 'completed')
assert.equal(completedWorkInput.progress, 90)
assert.equal(completedWorkInput.completedAt instanceof Date, true)
assert.throws(() => parseCreateClientWorkItemInput({ title: '' }), ClientValidationError)
assert.throws(() => parseCreateClientWorkItemInput({ title: 'Invalid priority', priority: 'maybe' }), ClientValidationError)
assert.throws(() => parseUpdateClientWorkItemInput({ status: 'unknown' }), ClientValidationError)

assert.deepEqual(parseCreateClientApprovalInput({
  title: ' Approve homepage copy ',
  description: ' Confirm final hero section. ',
  status: 'pending',
  dueAt: '2026-06-02',
  visibleToClient: true,
}), {
  title: 'Approve homepage copy',
  description: 'Confirm final hero section.',
  status: 'pending',
  dueAt: new Date('2026-06-02'),
  projectId: undefined,
  visibleToClient: true,
})
const approvalDecisionInput = parseUpdateClientApprovalInput({ status: 'changes requested', responseNote: 'Revise CTA.' })
assert.equal(approvalDecisionInput.status, 'changes_requested')
assert.equal(approvalDecisionInput.responseNote, 'Revise CTA.')
assert.equal(approvalDecisionInput.decidedAt instanceof Date, true)
const clientApprovalResponseInput = parseClientApprovalResponseInput({
  status: 'changes requested',
  responseNote: 'Please revise the headline before launch.',
  title: 'client cannot edit title',
})
assert.deepEqual({
  status: clientApprovalResponseInput.status,
  responseNote: clientApprovalResponseInput.responseNote,
  title: 'title' in clientApprovalResponseInput,
}, {
  status: 'changes_requested',
  responseNote: 'Please revise the headline before launch.',
  title: false,
})
assert.equal(clientApprovalResponseInput.decidedAt instanceof Date, true)
assert.throws(() => parseClientApprovalResponseInput({ status: 'pending' }), ClientValidationError)
assert.throws(() => parseClientApprovalResponseInput({ status: 'changes_requested' }), ClientValidationError)
assert.throws(() => parseUpdateClientApprovalInput({ status: 'maybe' }), ClientValidationError)

assert.deepEqual(parseCreateClientReportInput({
  title: ' May 2026 Local SEO Report ',
  summary: ' Leads improved from GBP and organic search. ',
  periodStart: '2026-05-01',
  periodEnd: '2026-05-31',
  status: 'published',
  leadsCaptured: '19',
  missedOpportunities: 3,
  visibleToClient: true,
  leadSourceBreakdown: { organic: 11, maps: 8 },
}), {
  title: 'May 2026 Local SEO Report',
  summary: 'Leads improved from GBP and organic search.',
  periodStart: new Date('2026-05-01'),
  periodEnd: new Date('2026-05-31'),
  status: 'published',
  visibleToClient: true,
  leadsCaptured: 19,
  missedOpportunities: 3,
  followUpStatus: undefined,
  leadSourceBreakdown: { organic: 11, maps: 8 },
  reputationSnapshot: undefined,
  localVisibilitySnapshot: undefined,
})
assert.throws(() => parseCreateClientReportInput({
  title: 'Bad Report',
  periodStart: '2026-05-31',
  periodEnd: '2026-05-01',
}), ClientValidationError)
assert.throws(() => parseCreateClientReportInput({
  title: 'Bad Leads',
  periodStart: '2026-05-01',
  periodEnd: '2026-05-31',
  leadsCaptured: -1,
}), ClientValidationError)
assert.deepEqual(parseGenerateClientReportDraftInput({
  title: ' May draft ',
  periodStart: '2026-05-01',
  periodEnd: '2026-05-31',
}), {
  title: 'May draft',
  periodStart: new Date('2026-05-01'),
  periodEnd: new Date('2026-05-31'),
  visibleToClient: true,
})
assert.throws(() => parseGenerateClientReportDraftInput({
  periodStart: '2026-05-31',
  periodEnd: '2026-05-01',
}), ClientValidationError)

assert.deepEqual(parseCreateClientRoadmapRecommendationInput({
  title: ' Add financing page ',
  body: ' Improves conversion for replacement jobs. ',
  priority: 'high',
  status: 'recommended',
  sortOrder: '3',
}), {
  title: 'Add financing page',
  body: 'Improves conversion for replacement jobs.',
  priority: 'high',
  status: 'recommended',
  impact: undefined,
  effort: undefined,
  visibleToClient: true,
  sortOrder: 3,
})
assert.throws(() => parseCreateClientRoadmapRecommendationInput({
  title: 'Bad roadmap',
  body: 'Priority must be recognized.',
  priority: 'maybe',
}), ClientValidationError)

assert.deepEqual(parseCreateClientAssetInput({
  label: ' Logo package ',
  url: ' https://example.com/logo.zip ',
  type: 'brand',
  status: 'approved',
}), {
  label: 'Logo package',
  url: 'https://example.com/logo.zip',
  type: 'brand',
  status: 'approved',
  notes: undefined,
  projectId: undefined,
  visibleToClient: true,
})

assert.deepEqual(parseUpsertClientBillingStatusInput({
  planName: ' Growth ',
  status: 'past due',
  monthlyAmount: '2500',
  currency: ' usd ',
  renewalAt: '2026-06-30',
  visibleToClient: false,
}), {
  planName: 'Growth',
  status: 'past_due',
  monthlyAmount: 2500,
  currency: 'USD',
  renewalAt: new Date('2026-06-30'),
  notes: undefined,
  visibleToClient: false,
})
assert.throws(() => parseUpsertClientBillingStatusInput({
  status: 'active',
  monthlyAmount: -1,
}), ClientValidationError)

assert.deepEqual(parseCreateClientCalendarItemInput({
  title: ' June blog post ',
  description: ' AC tune-up article. ',
  channel: 'blog',
  status: 'scheduled',
  startAt: '2026-06-10T09:00:00.000Z',
  visibleToClient: true,
}), {
  title: 'June blog post',
  description: 'AC tune-up article.',
  channel: 'blog',
  status: 'scheduled',
  startAt: new Date('2026-06-10T09:00:00.000Z'),
  endAt: undefined,
  projectId: undefined,
  visibleToClient: true,
})
assert.throws(() => parseCreateClientCalendarItemInput({
  title: 'Bad date range',
  startAt: '2026-06-10',
  endAt: '2026-06-09',
}), ClientValidationError)

assert.equal(serializeClientApprovalForClient({
  id: 'approval-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'Approve homepage copy',
  description: 'Confirm final hero section.',
  status: 'pending',
  responseNote: 'internal only?',
  requestedById: 'user-internal',
  decidedById: null,
  dueAt: date,
  decidedAt: null,
  visibleToClient: true,
  createdAt: date,
  updatedAt: date,
})?.title, 'Approve homepage copy')
assert.equal(serializeClientApprovalForClient({
  id: 'approval-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'Approve homepage copy',
  description: 'Confirm final hero section.',
  status: 'changes_requested',
  responseNote: 'Please revise the headline before launch.',
  requestedById: 'user-internal',
  decidedById: 'user-client',
  dueAt: date,
  decidedAt: date,
  visibleToClient: true,
  createdAt: date,
  updatedAt: date,
})?.responseNote, 'Please revise the headline before launch.')
assert.equal(serializeClientApprovalForClient({
  id: 'approval-2',
  organizationId: 'org-1',
  projectId: null,
  title: 'Internal approval',
  description: null,
  status: 'pending',
  responseNote: null,
  requestedById: 'user-internal',
  decidedById: null,
  dueAt: null,
  decidedAt: null,
  visibleToClient: false,
  createdAt: date,
  updatedAt: date,
}), null)
assert.equal(serializeClientApprovalForManagement({
  id: 'approval-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'Approve homepage copy',
  description: null,
  status: 'pending',
  responseNote: 'Client asked for CTA changes.',
  requestedById: 'user-internal',
  decidedById: 'user-client',
  dueAt: null,
  decidedAt: date,
  visibleToClient: true,
  createdAt: date,
  updatedAt: date,
}).responseNote, 'Client asked for CTA changes.')

const clientWorkItem = serializeClientWorkItemForClient({
  id: 'work-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'Build landing page',
  description: null,
  status: 'completed',
  priority: 'normal',
  progress: 100,
  dueAt: null,
  completedAt: date,
  visibleToClient: true,
  sortOrder: 1,
  assignedToId: 'user-internal',
  createdById: 'user-internal',
  createdAt: date,
  updatedAt: date,
})
assert.equal(clientWorkItem?.title, 'Build landing page')
assert.equal('assignedToId' in (clientWorkItem || {}), false)

const clientReport = serializeClientReportForClient({
  id: 'report-1',
  organizationId: 'org-1',
  title: 'May Report',
  summary: null,
  status: 'published',
  visibleToClient: true,
  periodStart: date,
  periodEnd: date,
  leadsCaptured: 19,
  missedOpportunities: 2,
  followUpStatus: '4 pending',
  leadSourceBreakdown: { organic: 10 },
  reputationSnapshot: { rating: 4.8 },
  localVisibilitySnapshot: { mapsRank: 3 },
  createdById: 'user-internal',
  publishedAt: date,
  createdAt: date,
  updatedAt: date,
})
assert.equal(clientReport?.title, 'May Report')
assert.equal('createdById' in (clientReport || {}), false)
assert.equal(serializeClientRoadmapRecommendationForClient({
  id: 'roadmap-1',
  organizationId: 'org-1',
  title: 'Financing page',
  body: 'Add conversion path.',
  priority: 'high',
  status: 'recommended',
  impact: 'More replacement leads',
  effort: 'medium',
  visibleToClient: true,
  sortOrder: 1,
  createdAt: date,
  updatedAt: date,
})?.title, 'Financing page')
const clientBilling = serializeClientBillingStatusForClient({
  id: 'billing-1',
  organizationId: 'org-1',
  planName: 'Growth',
  status: 'active',
  monthlyAmount: 2500,
  currency: 'USD',
  renewalAt: date,
  notes: 'internal renewal note',
  visibleToClient: true,
  createdAt: date,
  updatedAt: date,
})
assert.equal(clientBilling?.planName, 'Growth')
assert.equal('notes' in (clientBilling || {}), false)

const clientCalendarItem = serializeClientCalendarItemForClient({
  id: 'calendar-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'June blog post',
  description: 'AC tune-up article.',
  channel: 'blog',
  status: 'scheduled',
  startAt: date,
  endAt: null,
  visibleToClient: true,
  createdById: 'user-internal',
  createdAt: date,
  updatedAt: date,
})
assert.equal(clientCalendarItem?.title, 'June blog post')
assert.equal(clientCalendarItem?.createdById, 'user-internal')

console.log('clients.production-records tests passed')
