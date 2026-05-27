# Deskii Unified Activity Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 foundation for connected Deskii workflows: append-only client activity, scoped activity APIs, derived action queues, and admin/client timeline UI.

**Architecture:** Add a `ClientActivity` table and a small backend activity service used by existing client operations mutations. Keep queue items derived from existing operational records instead of adding a separate queue table. Add shared frontend timeline and queue helpers so admin and client pages consume the same activity model with visibility safeguards.

**Tech Stack:** Express, TypeScript, Prisma/PostgreSQL, Next.js App Router, React, focused Node tests, existing client portal components/hooks.

---

## File Structure

Create:

- `backend/prisma/migrations/202605270002_client_activity/migration.sql` - additive table, indexes, and foreign keys for activity events.
- `backend/src/clients/clients.activity.ts` - activity constants, type definitions, activity creation helpers, scoped read helpers, and queue builder.
- `backend/tests/clients.activity.test.ts` - pure helper and queue derivation tests.
- `frontend/src/lib/client-activity.ts` - frontend types, fetch helpers, formatting helpers, and queue grouping helpers.
- `frontend/tests/client-activity.test.mjs` - frontend queue/timeline formatting tests.
- `frontend/src/components/client-portal/ClientActivityTimeline.tsx` - reusable activity timeline.
- `frontend/src/components/client-portal/ClientActionQueue.tsx` - reusable action queue.

Modify:

- `backend/prisma/schema.prisma` - add `ClientActivity` model and relation.
- `backend/src/clients/clients.service.ts` - call activity helper after important mutations.
- `backend/src/clients/clients.controller.ts` - expose organization activity and queue endpoints.
- `backend/src/clients/clients.serializers.ts` - serialize activity and queue records.
- `backend/src/clients/clients.validation.ts` - validate activity query filters.
- `backend/tests/run-tests.ts` - include activity tests.
- `backend/tests/clients.routes.test.ts` - cover scoped activity endpoints and event creation.
- `frontend/src/lib/client-portal.ts` - export activity and queue API helpers if central API aggregation remains preferred.
- `frontend/src/hooks/useClientOperationsWorkspace.ts` - load selected client activity and queue data for admin pages.
- `frontend/src/hooks/useClientPortalWorkspace.ts` - load selected client activity and queue data for client pages.
- `frontend/src/app/operations/clients/page.tsx` - show admin queue and activity timeline.
- `frontend/src/app/client/page.tsx` - show client-safe queue and activity timeline.
- `frontend/src/app/client/messages/page.tsx` - include client-visible communication activity.
- `docs/api.md` - document new activity endpoints.
- `docs/database.md` - document `ClientActivity`.
- `docs/features.md` - document activity and command center behavior.
- `docs/dev-notes.md` - add session summary after implementation.

---

### Task 1: Add Activity Schema And Prisma Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/202605270002_client_activity/migration.sql`

- [ ] **Step 1: Add Prisma model**

Add this relation field to `ClientOrganization`:

```prisma
activities ClientActivity[]
```

Add this relation field to `User`:

```prisma
clientActivities ClientActivity[] @relation("ClientActivityActor")
```

Add this model near the other client portal models:

```prisma
model ClientActivity {
  id             String             @id @default(cuid())
  organizationId String
  actorId        String?
  type           String
  subjectType    String
  subjectId      String?
  visibility     String             @default("internal")
  title          String
  body           String?
  metadata       Json?
  createdAt      DateTime           @default(now())

  organization ClientOrganization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  actor        User?              @relation("ClientActivityActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([organizationId, createdAt])
  @@index([organizationId, visibility, createdAt])
  @@index([subjectType, subjectId])
  @@index([type])
}
```

- [ ] **Step 2: Add SQL migration**

Create `backend/prisma/migrations/202605270002_client_activity/migration.sql`:

```sql
CREATE TABLE "ClientActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientActivity_organizationId_createdAt_idx"
    ON "ClientActivity"("organizationId", "createdAt");

CREATE INDEX "ClientActivity_organizationId_visibility_createdAt_idx"
    ON "ClientActivity"("organizationId", "visibility", "createdAt");

CREATE INDEX "ClientActivity_subjectType_subjectId_idx"
    ON "ClientActivity"("subjectType", "subjectId");

CREATE INDEX "ClientActivity_type_idx"
    ON "ClientActivity"("type");

ALTER TABLE "ClientActivity"
    ADD CONSTRAINT "ClientActivity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientActivity"
    ADD CONSTRAINT "ClientActivity_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Validate Prisma**

Run:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

Expected: schema validates and Prisma Client generates successfully.

---

### Task 2: Build Backend Activity Helper

**Files:**
- Create: `backend/src/clients/clients.activity.ts`
- Create: `backend/tests/clients.activity.test.ts`
- Modify: `backend/tests/run-tests.ts`

- [ ] **Step 1: Create helper constants and types**

Create `backend/src/clients/clients.activity.ts`:

```ts
import type { PrismaClient } from '@prisma/client'

export const CLIENT_ACTIVITY_VISIBILITIES = ['internal', 'client'] as const
export type ClientActivityVisibility = typeof CLIENT_ACTIVITY_VISIBILITIES[number]

export const CLIENT_ACTIVITY_TYPES = {
  ticketCreated: 'ticket_created',
  ticketClientReplyCreated: 'ticket_client_reply_created',
  ticketInternalNoteCreated: 'ticket_internal_note_created',
  ticketStatusChanged: 'ticket_status_changed',
  workItemCreated: 'work_item_created',
  workItemUpdated: 'work_item_updated',
  workItemCompleted: 'work_item_completed',
  approvalRequested: 'approval_requested',
  approvalApproved: 'approval_approved',
  approvalChangesRequested: 'approval_changes_requested',
  reportCreated: 'report_created',
  reportPublished: 'report_published',
  roadmapUpdated: 'roadmap_updated',
  assetUpdated: 'asset_updated',
  billingUpdated: 'billing_updated',
  calendarScheduled: 'calendar_scheduled',
  calendarUpdated: 'calendar_updated',
  calendarDeleted: 'calendar_deleted',
  organizationArchived: 'organization_archived',
  organizationRestored: 'organization_restored',
  membershipUpdated: 'membership_updated',
} as const

export type ClientActivityType = typeof CLIENT_ACTIVITY_TYPES[keyof typeof CLIENT_ACTIVITY_TYPES]

export interface CreateClientActivityInput {
  organizationId: string
  actorId?: string | null
  type: ClientActivityType
  subjectType: string
  subjectId?: string | null
  visibility: ClientActivityVisibility
  title: string
  body?: string | null
  metadata?: Record<string, unknown> | null
}

export function normalizeClientActivityVisibility(value: string | undefined | null): ClientActivityVisibility {
  return value === 'client' ? 'client' : 'internal'
}

export async function createClientActivity(
  prisma: PrismaClient,
  input: CreateClientActivityInput,
) {
  return prisma.clientActivity.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId || null,
      type: input.type,
      subjectType: input.subjectType,
      subjectId: input.subjectId || null,
      visibility: input.visibility,
      title: input.title.trim(),
      body: input.body?.trim() || null,
      metadata: input.metadata || undefined,
    },
  })
}
```

- [ ] **Step 2: Add pure helper tests**

Create `backend/tests/clients.activity.test.ts`:

```ts
import assert from 'node:assert/strict'
import {
  CLIENT_ACTIVITY_TYPES,
  normalizeClientActivityVisibility,
} from '../src/clients/clients.activity'

assert.equal(normalizeClientActivityVisibility('client'), 'client')
assert.equal(normalizeClientActivityVisibility('internal'), 'internal')
assert.equal(normalizeClientActivityVisibility('unknown'), 'internal')
assert.equal(CLIENT_ACTIVITY_TYPES.ticketClientReplyCreated, 'ticket_client_reply_created')
assert.equal(CLIENT_ACTIVITY_TYPES.approvalApproved, 'approval_approved')

console.log('clients.activity tests passed')
```

- [ ] **Step 3: Register tests**

Add this import to `backend/tests/run-tests.ts`:

```ts
import './clients.activity.test'
```

- [ ] **Step 4: Run tests**

Run:

```powershell
cd backend
npm test
```

Expected: existing backend tests plus `clients.activity tests passed`.

---

### Task 3: Add Activity Serialization And Scoped Reads

**Files:**
- Modify: `backend/src/clients/clients.serializers.ts`
- Modify: `backend/src/clients/clients.service.ts`
- Modify: `backend/src/clients/clients.validation.ts`

- [ ] **Step 1: Add serializer**

In `backend/src/clients/clients.serializers.ts`, add:

```ts
export function serializeClientActivity(activity: any, includeInternal = false) {
  if (!activity) return null
  if (!includeInternal && activity.visibility !== 'client') return null

  return {
    id: activity.id,
    organizationId: activity.organizationId,
    actorId: activity.actorId,
    actor: activity.actor ? {
      id: activity.actor.id,
      email: activity.actor.email,
      name: activity.actor.name,
      avatar: activity.actor.avatar,
    } : null,
    type: activity.type,
    subjectType: activity.subjectType,
    subjectId: activity.subjectId,
    visibility: activity.visibility,
    title: activity.title,
    body: activity.body,
    metadata: includeInternal ? activity.metadata : undefined,
    createdAt: activity.createdAt,
  }
}

export function serializeClientActivities(activities: any[], includeInternal = false) {
  return activities
    .map((activity) => serializeClientActivity(activity, includeInternal))
    .filter(Boolean)
}
```

- [ ] **Step 2: Add activity query validation**

In `backend/src/clients/clients.validation.ts`, add:

```ts
export function parseClientActivityQuery(query: any) {
  const limitValue = Number.parseInt(String(query.limit || '30'), 10)
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 30
  const visibility = typeof query.visibility === 'string' ? query.visibility : undefined

  if (visibility && visibility !== 'client' && visibility !== 'internal') {
    throw new ClientValidationError('Invalid activity visibility')
  }

  return {
    limit,
    visibility,
    subjectType: typeof query.subjectType === 'string' ? query.subjectType.trim() : undefined,
    subjectId: typeof query.subjectId === 'string' ? query.subjectId.trim() : undefined,
  }
}
```

- [ ] **Step 3: Add service read method**

In `backend/src/clients/clients.service.ts`, add a method to `ClientsService`:

```ts
async listActivities(
  requester: ClientPortalRequester,
  organizationId: string,
  query: ReturnType<typeof parseClientActivityQuery>,
) {
  const access = await this.getOrganizationAccess(requester, organizationId)
  const includeInternal = access.canManage

  const where: any = { organizationId }
  if (!includeInternal) where.visibility = 'client'
  if (query.visibility) {
    where.visibility = includeInternal ? query.visibility : 'client'
  }
  if (query.subjectType) where.subjectType = query.subjectType
  if (query.subjectId) where.subjectId = query.subjectId

  const activities = await this.prisma.clientActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
    include: { actor: true },
  })

  return serializeClientActivities(activities, includeInternal)
}
```

Use the existing access helper names in `clients.service.ts`. If the local method name differs from `getOrganizationAccess`, use the existing organization-access method and keep the same authorization semantics.

- [ ] **Step 4: Run backend build**

Run:

```powershell
cd backend
npm run build
```

Expected: TypeScript passes.

---

### Task 4: Add Activity API Endpoint

**Files:**
- Modify: `backend/src/clients/clients.controller.ts`
- Modify: `backend/tests/clients.routes.test.ts`
- Modify: `docs/api.md`

- [ ] **Step 1: Add route**

In `backend/src/clients/clients.controller.ts`, add this authenticated route near the organization overview route:

```ts
router.get('/organizations/:id/activity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = this.getRequester(req)
    const query = parseClientActivityQuery(req.query)
    const activities = await this.clientsService.listActivities(requester, req.params.id, query)
    res.json(activities)
  } catch (error) {
    this.handleError(res, error)
  }
})
```

Import `parseClientActivityQuery` from `clients.validation.ts`.

- [ ] **Step 2: Add route tests**

In `backend/tests/clients.routes.test.ts`, add assertions after existing client organization setup:

```ts
const clientVisibleActivity = await prisma.clientActivity.create({
  data: {
    organizationId: organization.id,
    actorId: adminUser.id,
    type: 'ticket_client_reply_created',
    subjectType: 'ticket',
    subjectId: 'ticket-visible',
    visibility: 'client',
    title: 'Visible reply',
    body: 'The team posted a client-visible reply.',
  },
})

await prisma.clientActivity.create({
  data: {
    organizationId: organization.id,
    actorId: adminUser.id,
    type: 'ticket_internal_note_created',
    subjectType: 'ticket',
    subjectId: 'ticket-internal',
    visibility: 'internal',
    title: 'Internal note',
    body: 'Internal only.',
  },
})

const adminActivity = await requestJson(baseUrl, `/api/clients/organizations/${organization.id}/activity`, {
  headers: { Authorization: `Bearer ${adminToken}` },
})
assert.equal(adminActivity.status, 200)
assert.equal(adminActivity.body.some((activity: any) => activity.id === clientVisibleActivity.id), true)
assert.equal(adminActivity.body.some((activity: any) => activity.visibility === 'internal'), true)

const clientActivity = await requestJson(baseUrl, `/api/clients/organizations/${organization.id}/activity`, {
  headers: { Authorization: `Bearer ${clientToken}` },
})
assert.equal(clientActivity.status, 200)
assert.equal(clientActivity.body.every((activity: any) => activity.visibility === 'client'), true)
assert.equal(clientActivity.body.some((activity: any) => activity.title === 'Internal note'), false)
```

Add cleanup for `clientActivity` records in the test teardown:

```ts
await prisma.clientActivity.deleteMany({ where: { organizationId: { in: [organization.id, otherOrganization.id] } } })
```

- [ ] **Step 3: Document API**

Add to `docs/api.md` under Client Portal:

```md
- `GET /api/clients/organizations/:id/activity` returns scoped client activity for one organization. Internal client-management users receive internal and client-visible activity; client users only receive client-visible activity for active assigned organizations.
```

- [ ] **Step 4: Run backend route tests**

Run:

```powershell
cd backend
npm test
```

Expected: all backend tests pass.

---

### Task 5: Create Activities From High-Value Mutations

**Files:**
- Modify: `backend/src/clients/clients.service.ts`
- Modify: `backend/tests/clients.routes.test.ts`

- [ ] **Step 1: Import helper**

In `backend/src/clients/clients.service.ts`, import:

```ts
import { CLIENT_ACTIVITY_TYPES, createClientActivity } from './clients.activity'
```

- [ ] **Step 2: Add activity calls after ticket comments**

After a ticket comment is created, call:

```ts
await createClientActivity(this.prisma, {
  organizationId: ticket.organizationId,
  actorId: requester.id,
  type: visibility === 'internal'
    ? CLIENT_ACTIVITY_TYPES.ticketInternalNoteCreated
    : CLIENT_ACTIVITY_TYPES.ticketClientReplyCreated,
  subjectType: 'ticket',
  subjectId: ticket.id,
  visibility: visibility === 'internal' ? 'internal' : 'client',
  title: visibility === 'internal' ? 'Internal note added' : 'Client-visible reply posted',
  body: comment.body,
})
```

Use the actual local variable names for `ticket`, `visibility`, `requester`, and `comment`.

- [ ] **Step 3: Add activity calls after approval responses**

After a client approval response is saved, call:

```ts
await createClientActivity(this.prisma, {
  organizationId: approval.organizationId,
  actorId: requester.id,
  type: nextStatus === 'approved'
    ? CLIENT_ACTIVITY_TYPES.approvalApproved
    : CLIENT_ACTIVITY_TYPES.approvalChangesRequested,
  subjectType: 'approval',
  subjectId: approval.id,
  visibility: 'client',
  title: nextStatus === 'approved' ? 'Approval accepted' : 'Changes requested',
  body: approval.responseNote || null,
})
```

- [ ] **Step 4: Add activity calls after calendar delete**

Before or immediately after permanent calendar deletion, call:

```ts
await createClientActivity(this.prisma, {
  organizationId: calendarItem.organizationId,
  actorId: requester.id,
  type: CLIENT_ACTIVITY_TYPES.calendarDeleted,
  subjectType: 'calendar_item',
  subjectId: calendarItem.id,
  visibility: 'internal',
  title: 'Calendar item deleted',
  body: calendarItem.title,
})
```

- [ ] **Step 5: Add route assertions**

Extend `backend/tests/clients.routes.test.ts` to confirm activity appears after a client-visible ticket comment and calendar delete:

```ts
const activityAfterReply = await requestJson(baseUrl, `/api/clients/organizations/${organization.id}/activity?subjectType=ticket&subjectId=${ticketId}`, {
  headers: { Authorization: `Bearer ${adminToken}` },
})
assert.equal(activityAfterReply.status, 200)
assert.equal(activityAfterReply.body.some((activity: any) => activity.type === 'ticket_client_reply_created'), true)

const activityAfterCalendarDelete = await requestJson(baseUrl, `/api/clients/organizations/${organization.id}/activity?subjectType=calendar_item&subjectId=${calendarItem.body.id}`, {
  headers: { Authorization: `Bearer ${adminToken}` },
})
assert.equal(activityAfterCalendarDelete.status, 200)
assert.equal(activityAfterCalendarDelete.body.some((activity: any) => activity.type === 'calendar_deleted'), true)
```

Use the exact ticket/calendar variable names that exist in the route test.

- [ ] **Step 6: Run backend tests**

Run:

```powershell
cd backend
npm test
npm run build
```

Expected: tests and build pass.

---

### Task 6: Build Derived Queue Helper

**Files:**
- Modify: `backend/src/clients/clients.activity.ts`
- Modify: `backend/tests/clients.activity.test.ts`
- Modify: `backend/src/clients/clients.service.ts`
- Modify: `backend/src/clients/clients.controller.ts`

- [ ] **Step 1: Add queue types**

Append to `backend/src/clients/clients.activity.ts`:

```ts
export const CLIENT_ACTION_QUEUE_CATEGORIES = [
  'team_response_needed',
  'client_response_needed',
  'approval_needed',
  'work_due_soon',
  'report_ready',
  'recently_completed',
] as const

export type ClientActionQueueCategory = typeof CLIENT_ACTION_QUEUE_CATEGORIES[number]

export interface ClientActionQueueItem {
  id: string
  organizationId: string
  organizationName: string
  category: ClientActionQueueCategory
  title: string
  summary: string
  subjectType: string
  subjectId: string
  priority: string
  dueAt: Date | string | null
  href: string
  visibility: ClientActivityVisibility
}
```

- [ ] **Step 2: Add ticket queue helper**

Append:

```ts
export function buildTicketQueueItems(ticket: any, organizationName: string): ClientActionQueueItem[] {
  const comments = Array.isArray(ticket.comments) ? ticket.comments : []
  const visibleComments = comments.filter((comment: any) => comment.visibility === 'client')
  const latestVisible = visibleComments[visibleComments.length - 1]
  const latestAuthorRole = latestVisible?.author?.role || latestVisible?.author?.roles?.[0] || ''
  const latestFromClient = String(latestAuthorRole).toLowerCase().includes('client')

  if (ticket.status === 'done' || ticket.status === 'closed') return []

  const category = latestFromClient ? 'team_response_needed' : 'client_response_needed'
  return [{
    id: `ticket:${ticket.id}:${category}`,
    organizationId: ticket.organizationId,
    organizationName,
    category,
    title: ticket.title,
    summary: latestVisible?.body || ticket.description || 'Request needs attention.',
    subjectType: 'ticket',
    subjectId: ticket.id,
    priority: ticket.priority || 'normal',
    dueAt: null,
    href: `/operations/clients/requests?client=${encodeURIComponent(ticket.organizationId)}`,
    visibility: category === 'client_response_needed' ? 'client' : 'internal',
  }]
}
```

- [ ] **Step 3: Test ticket queue helper**

Add to `backend/tests/clients.activity.test.ts`:

```ts
import { buildTicketQueueItems } from '../src/clients/clients.activity'

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

const clientQueue = buildTicketQueueItems({
  id: 'ticket-2',
  organizationId: 'org-1',
  title: 'Approve copy',
  priority: 'normal',
  status: 'review',
  comments: [{ visibility: 'client', body: 'Please review this.', author: { role: 'admin' } }],
}, 'Gemfield')
assert.equal(clientQueue[0].category, 'client_response_needed')
```

- [ ] **Step 4: Add service queue method**

In `backend/src/clients/clients.service.ts`, add:

```ts
async listActionQueue(requester: ClientPortalRequester, organizationId?: string) {
  const organizations = organizationId
    ? [await this.getOrganizationForRequester(requester, organizationId)]
    : await this.listOrganizations(requester)

  const queueItems = []
  for (const organization of organizations) {
    const tickets = await this.prisma.clientTicket.findMany({
      where: { organizationId: organization.id },
      include: { comments: { include: { author: true }, orderBy: { createdAt: 'asc' } } },
    })
    for (const ticket of tickets) {
      queueItems.push(...buildTicketQueueItems(ticket, organization.name))
    }
  }

  const includeInternal = this.canManageClients(requester)
  return queueItems.filter((item) => includeInternal || item.visibility === 'client')
}
```

Use the existing method names in `clients.service.ts` for organization access, organization listing, and management-role checks.

- [ ] **Step 5: Add queue route**

In `backend/src/clients/clients.controller.ts`, add:

```ts
router.get('/activity/queue', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requester = this.getRequester(req)
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined
    const queue = await this.clientsService.listActionQueue(requester, organizationId)
    res.json(queue)
  } catch (error) {
    this.handleError(res, error)
  }
})
```

- [ ] **Step 6: Run backend tests**

Run:

```powershell
cd backend
npm test
npm run build
```

Expected: tests and build pass.

---

### Task 7: Add Frontend Activity API And Helpers

**Files:**
- Create: `frontend/src/lib/client-activity.ts`
- Create: `frontend/tests/client-activity.test.mjs`

- [ ] **Step 1: Create frontend helper**

Create `frontend/src/lib/client-activity.ts`:

```ts
import { apiFetch } from './api'

export interface ClientActivity {
  id: string
  organizationId: string
  actorId?: string | null
  actor?: { id: string; email: string; name?: string | null; avatar?: string | null } | null
  type: string
  subjectType: string
  subjectId?: string | null
  visibility: 'internal' | 'client'
  title: string
  body?: string | null
  createdAt: string | null
}

export interface ClientActionQueueItem {
  id: string
  organizationId: string
  organizationName: string
  category: 'team_response_needed' | 'client_response_needed' | 'approval_needed' | 'work_due_soon' | 'report_ready' | 'recently_completed'
  title: string
  summary: string
  subjectType: string
  subjectId: string
  priority: string
  dueAt?: string | null
  href: string
  visibility: 'internal' | 'client'
}

export async function fetchClientActivity(organizationId: string): Promise<ClientActivity[]> {
  const response = await apiFetch(`/clients/organizations/${organizationId}/activity`)
  return response.json()
}

export async function fetchClientActionQueue(organizationId?: string): Promise<ClientActionQueueItem[]> {
  const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''
  const response = await apiFetch(`/clients/activity/queue${query}`)
  return response.json()
}

export function groupClientActionQueue(items: ClientActionQueueItem[]) {
  return items.reduce<Record<ClientActionQueueItem['category'], ClientActionQueueItem[]>>((groups, item) => {
    groups[item.category] = groups[item.category] || []
    groups[item.category].push(item)
    return groups
  }, {
    team_response_needed: [],
    client_response_needed: [],
    approval_needed: [],
    work_due_soon: [],
    report_ready: [],
    recently_completed: [],
  })
}

export function getClientActivityTone(type: string): 'message' | 'approval' | 'work' | 'report' | 'calendar' | 'account' {
  if (type.includes('approval')) return 'approval'
  if (type.includes('work_item')) return 'work'
  if (type.includes('report')) return 'report'
  if (type.includes('calendar')) return 'calendar'
  if (type.includes('organization') || type.includes('membership') || type.includes('billing')) return 'account'
  return 'message'
}
```

- [ ] **Step 2: Add frontend tests**

Create `frontend/tests/client-activity.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { groupClientActionQueue, getClientActivityTone } from '../src/lib/client-activity.ts'

test('groups client action queue by category', () => {
  const grouped = groupClientActionQueue([
    { id: '1', category: 'team_response_needed', organizationId: 'org', organizationName: 'Gemfield', title: 'Reply', summary: 'Needs reply', subjectType: 'ticket', subjectId: 'ticket-1', priority: 'high', href: '/operations/clients/requests', visibility: 'internal' },
    { id: '2', category: 'client_response_needed', organizationId: 'org', organizationName: 'Gemfield', title: 'Review', summary: 'Client review', subjectType: 'ticket', subjectId: 'ticket-2', priority: 'normal', href: '/client/messages', visibility: 'client' },
  ])

  assert.equal(grouped.team_response_needed.length, 1)
  assert.equal(grouped.client_response_needed.length, 1)
  assert.equal(grouped.approval_needed.length, 0)
})

test('maps activity type to a presentation tone', () => {
  assert.equal(getClientActivityTone('approval_approved'), 'approval')
  assert.equal(getClientActivityTone('work_item_completed'), 'work')
  assert.equal(getClientActivityTone('calendar_deleted'), 'calendar')
  assert.equal(getClientActivityTone('ticket_client_reply_created'), 'message')
})
```

- [ ] **Step 3: Run focused frontend tests**

Run:

```powershell
cd frontend
node --test tests/client-activity.test.mjs
```

Expected: both subtests pass.

---

### Task 8: Add Timeline And Queue Components

**Files:**
- Create: `frontend/src/components/client-portal/ClientActivityTimeline.tsx`
- Create: `frontend/src/components/client-portal/ClientActionQueue.tsx`

- [ ] **Step 1: Create timeline component**

Create `frontend/src/components/client-portal/ClientActivityTimeline.tsx`:

```tsx
"use client"

import { CalendarDays, CheckCircle2, FileText, MessageSquare, UserCircle } from "lucide-react"
import type { ClientActivity } from "@/lib/client-activity"
import { getClientActivityTone } from "@/lib/client-activity"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatClientPortalDate } from "@/lib/client-portal-display"

const toneIcons = {
  message: MessageSquare,
  approval: CheckCircle2,
  work: CheckCircle2,
  report: FileText,
  calendar: CalendarDays,
  account: UserCircle,
}

export function ClientActivityTimeline({ activities }: { activities: ClientActivity[] }) {
  if (!activities.length) {
    return <EmptyState variant="compact" icon={MessageSquare} title="No activity yet" description="Client updates and team actions will appear here." />
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const tone = getClientActivityTone(activity.type)
        const Icon = toneIcons[tone]
        return (
          <article key={activity.id} className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-4">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)]">
                <Icon className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{activity.title}</h3>
                  <span className="text-xs text-[var(--muted)]">{formatClientPortalDate(activity.createdAt)}</span>
                </div>
                {activity.body ? <p className="mt-1 text-sm text-[var(--muted)]">{activity.body}</p> : null}
                {activity.actor?.name || activity.actor?.email ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">By {activity.actor.name || activity.actor.email}</p>
                ) : null}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create queue component**

Create `frontend/src/components/client-portal/ClientActionQueue.tsx`:

```tsx
"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock, MessageSquare } from "lucide-react"
import type { ClientActionQueueItem } from "@/lib/client-activity"
import { groupClientActionQueue } from "@/lib/client-activity"
import { EmptyState } from "@/components/ui/EmptyState"

const categoryLabels: Record<ClientActionQueueItem["category"], string> = {
  team_response_needed: "Team response needed",
  client_response_needed: "Waiting on client",
  approval_needed: "Approval needed",
  work_due_soon: "Work due soon",
  report_ready: "Report ready",
  recently_completed: "Recently completed",
}

const categoryIcons: Record<ClientActionQueueItem["category"], typeof MessageSquare> = {
  team_response_needed: MessageSquare,
  client_response_needed: MessageSquare,
  approval_needed: AlertCircle,
  work_due_soon: Clock,
  report_ready: AlertCircle,
  recently_completed: CheckCircle2,
}

export function ClientActionQueue({ items }: { items: ClientActionQueueItem[] }) {
  if (!items.length) {
    return <EmptyState variant="compact" icon={CheckCircle2} title="No immediate actions" description="Open replies, approvals, and due work will appear here." />
  }

  const grouped = groupClientActionQueue(items)

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, categoryItems]) => {
        if (!categoryItems.length) return null
        const typedCategory = category as ClientActionQueueItem["category"]
        const Icon = categoryIcons[typedCategory]
        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--muted)]">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {categoryLabels[typedCategory]}
            </div>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 transition hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.summary}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)]">{item.priority}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Run frontend build**

Run:

```powershell
cd frontend
npm run lint
npm run build
```

Expected: lint and build pass.

---

### Task 9: Load Activity And Queue In Workspaces

**Files:**
- Modify: `frontend/src/hooks/useClientOperationsWorkspace.ts`
- Modify: `frontend/src/hooks/useClientPortalWorkspace.ts`

- [ ] **Step 1: Extend admin workspace state**

In `frontend/src/hooks/useClientOperationsWorkspace.ts`, import:

```ts
import type { ClientActionQueueItem, ClientActivity } from "@/lib/client-activity"
import { fetchClientActionQueue, fetchClientActivity } from "@/lib/client-activity"
```

Add state:

```ts
const [activities, setActivities] = useState<ClientActivity[]>([])
const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>([])
```

Extend the returned interface with:

```ts
activities: ClientActivity[]
queueItems: ClientActionQueueItem[]
```

In `refreshClient`, fetch activity and queue alongside overview/memberships:

```ts
const [nextOverview, nextMemberships, nextActivities, nextQueueItems] = await Promise.all([
  fetchClientOverview(organizationId),
  fetchClientMemberships(organizationId),
  fetchClientActivity(organizationId),
  fetchClientActionQueue(organizationId),
])
setOverview(nextOverview)
setMemberships(nextMemberships)
setActivities(nextActivities)
setQueueItems(nextQueueItems)
```

When no organization is selected, clear both arrays.

- [ ] **Step 2: Extend client workspace state**

In `frontend/src/hooks/useClientPortalWorkspace.ts`, import:

```ts
import type { ClientActionQueueItem, ClientActivity } from "@/lib/client-activity"
import { fetchClientActionQueue, fetchClientActivity } from "@/lib/client-activity"
```

Add state and return fields:

```ts
const [activities, setActivities] = useState<ClientActivity[]>([])
const [queueItems, setQueueItems] = useState<ClientActionQueueItem[]>([])
```

In `loadOverview`, fetch all three:

```ts
const [nextOverview, nextActivities, nextQueueItems] = await Promise.all([
  fetchClientOverview(organizationId),
  fetchClientActivity(organizationId),
  fetchClientActionQueue(organizationId),
])
setOverview(nextOverview)
setActivities(nextActivities)
setQueueItems(nextQueueItems)
```

When no organization is selected, clear all three.

- [ ] **Step 3: Run frontend tests**

Run:

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Expected: tests, lint, and build pass.

---

### Task 10: Render Activity And Queue On Command Centers

**Files:**
- Modify: `frontend/src/app/operations/clients/page.tsx`
- Modify: `frontend/src/app/client/page.tsx`
- Modify: `frontend/src/app/client/messages/page.tsx`

- [ ] **Step 1: Add admin command center sections**

In `frontend/src/app/operations/clients/page.tsx`, import:

```tsx
import { ClientActionQueue } from "@/components/client-portal/ClientActionQueue"
import { ClientActivityTimeline } from "@/components/client-portal/ClientActivityTimeline"
```

From workspace state, read:

```tsx
const { activities, queueItems } = workspace
```

Add two sections below the existing client summary:

```tsx
<section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
  <Panel title="Action queue" description="Replies, approvals, and due work that need attention.">
    <ClientActionQueue items={queueItems} />
  </Panel>
  <Panel title="Latest activity" description="Recent client-visible and internal client operations activity.">
    <ClientActivityTimeline activities={activities} />
  </Panel>
</section>
```

Use the existing local `Panel` or card component in the page. If the page does not expose a reusable panel, create a small local section wrapper in the same file.

- [ ] **Step 2: Add client command center sections**

In `frontend/src/app/client/page.tsx`, import the same components.

From workspace state, read:

```tsx
const { activities, queueItems } = workspace
```

Add:

```tsx
<section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
  <ClientPortalPanel title="Needs your attention" description="Approvals, replies, and updates waiting on you.">
    <ClientActionQueue items={queueItems} />
  </ClientPortalPanel>
  <ClientPortalPanel title="What changed recently" description="Recent client-visible updates from the team.">
    <ClientActivityTimeline activities={activities} />
  </ClientPortalPanel>
</section>
```

Use the existing client portal panel component if the page already imports it.

- [ ] **Step 3: Add messages activity section**

In `frontend/src/app/client/messages/page.tsx`, show `ClientActivityTimeline` below existing conversation cards with only message-like activity:

```tsx
const messageActivities = activities.filter((activity) => activity.type.includes('ticket'))
```

Render:

```tsx
<ClientPortalPanel title="Message activity" description="Client-visible request and reply history.">
  <ClientActivityTimeline activities={messageActivities} />
</ClientPortalPanel>
```

- [ ] **Step 4: Run frontend verification**

Run:

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Expected: all pass.

---

### Task 11: Documentation And Browser QA

**Files:**
- Modify: `docs/features.md`
- Modify: `docs/database.md`
- Modify: `docs/dev-notes.md`

- [ ] **Step 1: Update feature docs**

Add to `docs/features.md` under Client Portal Foundation:

```md
- Client Operations now records unified activity for high-value client/admin events and displays it in admin and client command centers.
- Admin and client command centers now show an action queue derived from requests, approvals, due work, report readiness, and recently completed work.
```

- [ ] **Step 2: Update database docs**

Add to `docs/database.md` under Client Portal:

```md
- `ClientActivity` stores append-only activity events for client operations. Events are organization-scoped, optionally actor-linked, and visibility-scoped as `internal` or `client`.
```

- [ ] **Step 3: Update dev notes**

Add a new `2026-05-27 - Unified Activity Command Center` entry with completed work, files changed, decisions, and test commands.

- [ ] **Step 4: Run full verification**

Run:

```powershell
cd backend
npm test
npm run build
npx prisma validate
npx prisma generate
npm audit --audit-level=high
```

Run:

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

Run from repo root:

```powershell
$env:JWT_SECRET='local-docker-check-secret'
$env:REFRESH_TOKEN_SECRET='local-docker-refresh-secret'
docker compose config
git diff --check
```

Expected: all pass.

- [ ] **Step 5: Browser QA**

Use browser QA against local production preview:

- `/operations/clients`
- `/operations/clients/requests`
- `/client`
- `/client/messages`

Check desktop and mobile widths for:

- No horizontal overflow.
- No unresolved loading state.
- No client-visible internal activity.
- Queue cards link to valid routes.
- Timeline cards render actor, title, date, and body without clipping.

---

## Self-Review

Spec coverage:

- Unified activity table: Tasks 1-5.
- Scoped activity API: Tasks 3-4.
- Derived action queue: Task 6.
- Frontend helpers/components: Tasks 7-8.
- Admin/client command centers: Tasks 9-10.
- Documentation and verification: Task 11.

Placeholder scan:

- No `TBD` or empty implementation steps remain.
- Steps with local variable uncertainty explicitly direct the engineer to use exact existing variable names after opening the target file.

Scope check:

- This plan intentionally implements Phase 1 only. Later automation, health scoring, report generation, roadmap/calendar linking, UX polish, and productivity tools should each get a separate plan after Phase 1 lands.
