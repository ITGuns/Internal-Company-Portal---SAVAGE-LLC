import assert from 'node:assert/strict'
import {
  canCreateClientTicket,
  canManageClientOrganization,
  canReadClientOrganization,
  getClientOrganizationVisibilityFilter,
  hasClientManagementAccess,
  normalizeClientRole,
} from '../src/clients/clients.access'
import {
  serializeClientOrganizationForClient,
  serializeClientTicketForClient,
  serializeClientUpdateForClient,
} from '../src/clients/clients.serializers'
import {
  ClientValidationError,
  parseCreateClientOrganizationInput,
  parseCreateClientMembershipInput,
  parseCreateClientMetricSnapshotInput,
  parseCreateClientProjectInput,
  parseCreateClientResourceLinkInput,
  parseCreateClientTicketCommentInput,
  parseCreateClientTicketInput,
  parseCreateClientUpdateInput,
  parseUpdateClientProjectInput,
  parseUpdateClientTicketStatusInput,
  slugifyClientOrganizationName,
} from '../src/clients/clients.validation'

const internalRoles = [{ role: 'Operations Manager' }]
const clientAccess = {
  requesterId: 'user-client',
  isPrivileged: false,
  memberships: [
    { organizationId: 'org-1', role: 'owner', status: 'active' },
    { organizationId: 'org-archived', role: 'client', status: 'inactive' },
  ],
}
const managerAccess = {
  requesterId: 'user-manager',
  isPrivileged: true,
  memberships: [],
}

assert.equal(normalizeClientRole(' Operations Manager '), 'operations_manager')
assert.equal(normalizeClientRole('chief-operations-officer'), 'chief_operations_officer')
assert.equal(hasClientManagementAccess(internalRoles), true)
assert.equal(hasClientManagementAccess([{ role: 'client' }]), false)
assert.equal(hasClientManagementAccess([], true), true)

assert.deepEqual(getClientOrganizationVisibilityFilter(managerAccess), {})
assert.deepEqual(getClientOrganizationVisibilityFilter(clientAccess), {
  memberships: {
    some: {
      userId: 'user-client',
      status: 'active',
    },
  },
})

assert.equal(canReadClientOrganization(managerAccess, { id: 'org-2' }), true)
assert.equal(canReadClientOrganization(clientAccess, { id: 'org-1' }), true)
assert.equal(canReadClientOrganization(clientAccess, { id: 'org-archived' }), false)
assert.equal(canReadClientOrganization(clientAccess, { id: 'org-2' }), false)

assert.equal(canManageClientOrganization(managerAccess), true)
assert.equal(canManageClientOrganization(clientAccess), false)
assert.equal(canCreateClientTicket(managerAccess, 'org-2'), true)
assert.equal(canCreateClientTicket(clientAccess, 'org-1'), true)
assert.equal(canCreateClientTicket(clientAccess, 'org-2'), false)

const date = new Date('2026-05-24T00:00:00.000Z')
const organization = serializeClientOrganizationForClient({
  id: 'org-1',
  name: 'Acme HVAC',
  slug: 'acme-hvac',
  status: 'active',
  tierId: 'tier-growth',
  websiteUrl: 'https://example.com',
  notes: 'Internal renewal risk note',
  createdAt: date,
  updatedAt: date,
  tier: {
    id: 'tier-growth',
    name: 'Growth',
    description: 'Lead generation support',
    monthlyPrice: 2500,
    priorityRank: 10,
    createdAt: date,
    updatedAt: date,
  },
})

assert.equal('notes' in organization, false)
assert.equal('tierId' in organization, false)
assert.deepEqual(organization.tier, {
  id: 'tier-growth',
  name: 'Growth',
  description: 'Lead generation support',
})

const ticket = serializeClientTicketForClient({
  id: 'ticket-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'Update business hours',
  description: 'We changed our Sunday hours.',
  category: 'website',
  priority: 'urgent',
  status: 'new',
  internalNotes: 'Assign to senior dev first.',
  createdById: 'user-client',
  assignedToId: 'user-internal',
  createdAt: date,
  updatedAt: date,
  closedAt: null,
  comments: [
    {
      id: 'comment-1',
      ticketId: 'ticket-1',
      authorId: 'user-client',
      body: 'Client-visible reply',
      visibility: 'client',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: 'comment-2',
      ticketId: 'ticket-1',
      authorId: 'user-internal',
      body: 'Internal handoff note',
      visibility: 'internal',
      createdAt: date,
      updatedAt: date,
    },
  ],
})

assert.equal('internalNotes' in ticket, false)
assert.equal('assignedToId' in ticket, false)
assert.equal('createdById' in ticket, false)
assert.equal(ticket.comments?.length, 1)
assert.equal(ticket.comments?.[0].body, 'Client-visible reply')

assert.equal(serializeClientUpdateForClient({
  id: 'update-1',
  organizationId: 'org-1',
  projectId: null,
  title: 'SEO cleanup shipped',
  body: 'Updated title tags and meta descriptions.',
  status: 'published',
  visibleToClient: true,
  createdById: 'user-internal',
  createdAt: date,
  updatedAt: date,
})?.title, 'SEO cleanup shipped')

assert.equal(serializeClientUpdateForClient({
  id: 'update-2',
  organizationId: 'org-1',
  projectId: null,
  title: 'Internal QA',
  body: 'Private implementation note.',
  status: 'draft',
  visibleToClient: false,
  createdById: 'user-internal',
  createdAt: date,
  updatedAt: date,
}), null)

assert.equal(slugifyClientOrganizationName('  ACME HVAC & Plumbing  '), 'acme-hvac-plumbing')
assert.deepEqual(parseCreateClientOrganizationInput({
  name: '  Acme HVAC  ',
  slug: ' Acme Custom Slug! ',
  websiteUrl: ' https://example.com ',
  notes: '  Internal setup note  ',
}), {
  name: 'Acme HVAC',
  slug: 'acme-custom-slug',
  websiteUrl: 'https://example.com',
  tierId: undefined,
  notes: 'Internal setup note',
})
assert.throws(
  () => parseCreateClientOrganizationInput({ name: ' ' }),
  ClientValidationError,
)

const ticketInput = parseCreateClientTicketInput({
  title: '  Update business hours  ',
  organizationId: 'org-evil',
  createdById: 'user-evil',
  assignedToId: 'user-internal',
  internalNotes: 'client should not set this',
})

assert.deepEqual(ticketInput, {
  title: 'Update business hours',
  description: undefined,
  category: 'general',
  priority: 'normal',
  projectId: undefined,
})
assert.equal('organizationId' in ticketInput, false)
assert.equal('createdById' in ticketInput, false)
assert.equal('assignedToId' in ticketInput, false)
assert.equal('internalNotes' in ticketInput, false)
assert.throws(
  () => parseCreateClientTicketInput({ title: '' }),
  ClientValidationError,
)

assert.deepEqual(parseCreateClientMembershipInput({
  userId: ' user-1 ',
  role: ' owner ',
  status: ' active ',
}), {
  userId: 'user-1',
  role: 'owner',
  status: 'active',
})
assert.throws(
  () => parseCreateClientMembershipInput({ role: 'owner' }),
  ClientValidationError,
)

assert.deepEqual(parseCreateClientProjectInput({
  name: ' Website Relaunch ',
  status: ' In Progress ',
  progress: 130,
  liveUrl: ' https://example.com ',
}), {
  name: 'Website Relaunch',
  status: 'in_progress',
  summary: undefined,
  progress: 100,
  startedAt: undefined,
  targetLaunchAt: undefined,
  liveUrl: 'https://example.com',
  previewUrl: undefined,
  internalNotes: undefined,
})
assert.deepEqual(parseUpdateClientProjectInput({
  status: ' review ',
  progress: '45',
}), {
  status: 'review',
  progress: 45,
})
assert.throws(
  () => parseUpdateClientProjectInput({}),
  ClientValidationError,
)
assert.throws(
  () => parseUpdateClientProjectInput({ status: 'unknown' }),
  ClientValidationError,
)

assert.deepEqual(parseCreateClientUpdateInput({
  title: ' SEO cleanup ',
  body: ' Published new metadata. ',
  visibleToClient: false,
}), {
  title: 'SEO cleanup',
  body: 'Published new metadata.',
  status: 'published',
  visibleToClient: false,
  projectId: undefined,
})

assert.deepEqual(parseCreateClientMetricSnapshotInput({
  label: ' Leads ',
  value: 42,
  unit: ' count ',
  visibleToClient: 'false',
}), {
  label: 'Leads',
  value: '42',
  unit: 'count',
  periodStart: undefined,
  periodEnd: undefined,
  source: 'manual',
  notes: undefined,
  visibleToClient: false,
})

assert.deepEqual(parseCreateClientResourceLinkInput({
  label: ' Preview ',
  url: ' https://preview.example.com ',
}), {
  label: 'Preview',
  url: 'https://preview.example.com',
  type: 'link',
  projectId: undefined,
  visibleToClient: true,
})

assert.deepEqual(parseCreateClientTicketCommentInput({
  body: ' Please confirm the new hours. ',
  visibility: 'internal',
}, false), {
  body: 'Please confirm the new hours.',
  visibility: 'client',
})
assert.deepEqual(parseCreateClientTicketCommentInput({
  body: ' Assigned to fulfillment. ',
  visibility: 'internal',
}, true), {
  body: 'Assigned to fulfillment.',
  visibility: 'internal',
})
assert.deepEqual(parseUpdateClientTicketStatusInput({ status: ' In Progress ' }), {
  status: 'in_progress',
})
assert.deepEqual(parseUpdateClientTicketStatusInput({ status: 'done' }), {
  status: 'done',
})
assert.throws(
  () => parseUpdateClientTicketStatusInput({ status: 'blocked' }),
  ClientValidationError,
)

console.log('clients.access tests passed')
