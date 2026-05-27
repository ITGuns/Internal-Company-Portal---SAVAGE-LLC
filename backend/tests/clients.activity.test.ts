import assert from 'node:assert/strict'
import {
  CLIENT_ACTIVITY_TYPES,
  buildApprovalQueueItems,
  buildReportQueueItems,
  buildTicketQueueItems,
  buildWorkItemQueueItems,
  normalizeClientActivityVisibility,
} from '../src/clients/clients.activity'

assert.equal(normalizeClientActivityVisibility('client'), 'client')
assert.equal(normalizeClientActivityVisibility('internal'), 'internal')
assert.equal(normalizeClientActivityVisibility('unknown'), 'internal')
assert.equal(CLIENT_ACTIVITY_TYPES.ticketClientReplyCreated, 'ticket_client_reply_created')
assert.equal(CLIENT_ACTIVITY_TYPES.approvalApproved, 'approval_approved')

const teamQueue = buildTicketQueueItems({
  id: 'ticket-1',
  organizationId: 'org-1',
  title: 'Review page',
  description: 'Client needs a response.',
  priority: 'high',
  status: 'review',
  comments: [{ visibility: 'client', body: 'Can you update this?', author: { role: 'client' } }],
}, 'Gemfield')
assert.equal(teamQueue[0].category, 'team_response_needed')
assert.equal(teamQueue[0].visibility, 'internal')

const clientQueue = buildTicketQueueItems({
  id: 'ticket-2',
  organizationId: 'org-1',
  title: 'Approve copy',
  priority: 'normal',
  status: 'review',
  comments: [{ visibility: 'client', body: 'Please review this.', author: { role: 'admin' } }],
}, 'Gemfield', 'client')
assert.equal(clientQueue[0].category, 'client_response_needed')
assert.equal(clientQueue[0].visibility, 'client')
assert.equal(clientQueue[0].href, '/client/messages')

const approvalQueue = buildApprovalQueueItems({
  id: 'approval-1',
  organizationId: 'org-1',
  title: 'Approve service page',
  description: 'Please approve this page.',
  status: 'pending',
  visibleToClient: true,
  dueAt: new Date(),
}, 'Gemfield')
assert.equal(approvalQueue[0].category, 'approval_needed')
assert.equal(approvalQueue[0].visibility, 'client')

const workQueue = buildWorkItemQueueItems({
  id: 'work-1',
  organizationId: 'org-1',
  title: 'Launch page',
  description: 'Launch is scheduled.',
  status: 'in_progress',
  priority: 'high',
  visibleToClient: true,
  dueAt: new Date(),
}, 'Gemfield')
assert.equal(workQueue[0].category, 'work_due_soon')

const reportQueue = buildReportQueueItems({
  id: 'report-1',
  organizationId: 'org-1',
  title: 'May report',
  summary: 'Ready for review.',
  status: 'draft',
  periodEnd: new Date(),
}, 'Gemfield')
assert.equal(reportQueue[0].category, 'report_ready')
assert.equal(reportQueue[0].visibility, 'internal')

console.log('clients.activity tests passed')
