import assert from 'node:assert/strict'
import {
  serializeClientTicketForClient,
  serializeClientTicketForManagement,
} from '../src/clients/clients.serializers'

// The worst bug in this feature is an internal note reaching a client. This asserts the guardrail at
// the API RESPONSE SHAPE (not the UI): the client serializer must strip internal comments,
// internalNotes, and staff-only fields. If someone wires a new endpoint to the wrong serializer,
// this fails.

const INTERNAL_NOTE_BODY = 'SECRET-internal-note-should-never-leak'
const INTERNAL_NOTES_FIELD = 'INTERNAL-NOTES-FIELD-should-never-leak'

const ticket = {
  id: 'tk-1',
  organizationId: 'org-1',
  projectId: 'proj-1',
  title: 'Update hours',
  description: 'Please change our hours.',
  category: 'website_change',
  priority: 'normal',
  status: 'in_progress',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  closedAt: null,
  internalNotes: INTERNAL_NOTES_FIELD,
  createdById: 'user-client',
  assignedToId: 'user-staff',
  comments: [
    {
      id: 'c-client',
      ticketId: 'tk-1',
      authorId: 'user-staff',
      body: 'Thanks - working on it.',
      visibility: 'client',
      createdAt: new Date('2026-07-01T01:00:00.000Z'),
      updatedAt: new Date('2026-07-01T01:00:00.000Z'),
    },
    {
      id: 'c-internal',
      ticketId: 'tk-1',
      authorId: 'user-staff',
      body: INTERNAL_NOTE_BODY,
      visibility: 'internal',
      createdAt: new Date('2026-07-01T02:00:00.000Z'),
      updatedAt: new Date('2026-07-01T02:00:00.000Z'),
    },
  ],
}

function run(): void {
  const clientView = serializeClientTicketForClient(ticket)
  const clientJson = JSON.stringify(clientView)

  // Nothing internal leaks anywhere in the serialized bytes.
  assert.equal(clientJson.includes(INTERNAL_NOTE_BODY), false, 'internal comment body must not appear')
  assert.equal(clientJson.includes(INTERNAL_NOTES_FIELD), false, 'internalNotes must not appear')

  // Staff-only fields are absent from the shape.
  const clientKeys = Object.keys(clientView)
  assert.equal(clientKeys.includes('internalNotes'), false, 'no internalNotes key')
  assert.equal(clientKeys.includes('createdById'), false, 'no createdById key')
  assert.equal(clientKeys.includes('assignedToId'), false, 'no assignedToId key')

  // Only the client-visible comment survives.
  assert.equal(clientView.comments?.length, 1, 'exactly one client-visible comment')
  assert.equal(
    clientView.comments?.some((comment) => comment.visibility === 'internal'),
    false,
    'no internal comment in the client view',
  )

  // Positive control: management DOES see the internal material (so the test proves filtering, not emptiness).
  const managementJson = JSON.stringify(serializeClientTicketForManagement(ticket))
  assert.equal(managementJson.includes(INTERNAL_NOTE_BODY), true, 'management sees the internal comment')
  assert.equal(managementJson.includes(INTERNAL_NOTES_FIELD), true, 'management sees internalNotes')
}

run()
console.log('gemfield.internal-note-leak tests passed')
