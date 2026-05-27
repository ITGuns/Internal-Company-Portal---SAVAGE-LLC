# Deskii Connected Operations Design

## Purpose

Deskii should become the connected client-operations hub for website delivery, support requests, client approvals, monthly reporting, roadmap planning, calendar scheduling, billing visibility, and internal handoff work.

The product should not feel like a set of separate admin pages. Every client-facing and internal workflow should connect through one shared operating loop:

`client request -> internal work -> visible update -> approval or reply -> completion -> report or next recommendation`

## Current State

The current production-ready release already includes:

- Client-scoped backend models for organizations, memberships, projects, tickets, comments, updates, metrics, resources, work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items.
- Focused admin routes under `/operations/clients/*`.
- Focused client routes under `/client/*`.
- Server-side tenant scoping and serializers that hide internal fields from client users.
- Client team invitation and membership management.
- Calendar, roadmap, request, report, asset, billing, and approval CRUD surfaces.
- Admin/client next-action hints for tickets and messages.

The remaining product gap is connective tissue: activity history, shared next-action ownership, reminders, health scoring, and report generation from existing operational data.

## North Star

For admins, operations managers, and web developers, Deskii should answer:

- Which clients need a response today?
- Which requests are blocked by the team?
- Which approvals are blocking delivery?
- Which work is done, due soon, overdue, or waiting on a client?
- Which clients are at risk?
- What changed since the last client check-in?

For clients, Deskii should answer:

- What is being worked on?
- What needs my approval?
- What does the team need from me?
- What changed recently?
- What business value did the work produce?
- What is scheduled next?

## Product Principles

- Server-side access control stays authoritative. Frontend visibility is convenience only.
- Client-visible and internal-only records stay separate.
- Every important action should produce an activity record.
- Every open workflow should have a clear next owner: team, client, nobody, or complete.
- Every dashboard should be derived from operational data, not duplicated manual status fields.
- The admin experience should be dense and efficient; the client experience should be clear, calm, and action-oriented.
- Add new tables only when they connect workflows or preserve audit history.

## Integrated Phases

### Phase 1: Unified Activity And Communication Command Center

Create a shared activity layer for meaningful client-operations events and use it to power admin/client timelines, response queues, and latest-activity sections.

Events should include:

- Client ticket created.
- Client-visible ticket reply created.
- Internal ticket note created.
- Ticket status changed.
- Work item created, updated, completed, archived, or restored.
- Approval requested, approved, or changes requested.
- Report created, published, archived, or restored.
- Roadmap recommendation created or moved.
- Asset created or status changed.
- Billing status changed.
- Calendar item scheduled, updated, archived, restored, or deleted.
- Client account archived or restored.
- Client membership invited, activated, deactivated, or restored.

The command center should surface:

- Needs team response.
- Waiting on client.
- Approval needed.
- Work due soon.
- Report ready to publish.
- Recently completed work.

### Phase 2: Smart Notifications And Follow-Ups

Create internal notification rules from activity and due-date data.

Rules should include:

- Team has not replied after a client message.
- Client has not replied after a team response.
- Approval is due soon or overdue.
- Work item is due soon or overdue.
- Calendar item is upcoming.
- Report period is ready for review.
- Billing status needs attention.

Initial delivery should be in-app only. Email can be layered later after the in-app logic is stable.

### Phase 3: Client Health Dashboard

Create a derived health model per client organization.

Health inputs:

- Open tickets.
- Tickets needing team response.
- Tickets waiting on client.
- Overdue approvals.
- Overdue work items.
- Missed opportunities from reports.
- Billing status.
- Days since last visible activity.
- Upcoming calendar items.
- Roadmap status.

Health output:

- `healthy`
- `needs_follow_up`
- `blocked`
- `at_risk`

Admins see the full health rationale. Clients see only client-safe status, progress, and required actions.

### Phase 4: Monthly Report Builder

Generate draft report data from existing records before the admin edits and publishes.

Draft sources:

- Completed work items.
- Closed tickets.
- Published updates.
- Metric snapshots.
- Lead counts.
- Missed opportunity counts.
- Roadmap recommendations.
- Calendar activity.
- Approval history.

Admins can edit the generated draft before publishing. Clients only see published reports.

### Phase 5: Roadmap And Calendar Workflow Integration

Connect planning records to execution records.

Workflow links:

- Roadmap recommendation can create work item.
- Roadmap recommendation can create calendar item.
- Calendar item can link to approval.
- Calendar item can link to report period.
- Work item can link back to roadmap recommendation.

This phase turns roadmap/calendar from record storage into planning and delivery workflow.

### Phase 6: Premium UX Polish

Polish the connected product after the workflow is structurally correct.

Focus areas:

- Cleaner command centers.
- Better empty states.
- Better split panes for communication.
- Less cramped admin work surfaces.
- Client-friendly status copy.
- Consistent modals and destructive confirmations.
- Mobile-safe work queues.
- Stronger visual hierarchy for timelines, actions, and dashboard signals.

### Phase 7: Admin/Webdev Productivity Tools

Add speed tools for teams handling multiple clients.

Tools:

- Saved reply templates.
- Suggested reply text.
- Assign-to-me.
- Owner filters.
- Bulk archive/restore where safe.
- Cross-client needs-response queue.
- Internal handoff notes.
- Audit/history view for sensitive changes.

## Phase 1 Functional Design

Phase 1 builds the foundation used by later phases.

### Backend

Add `ClientActivity` as an append-only event table. It should belong to one `ClientOrganization` and optionally link to a related record.

Fields:

- `id`
- `organizationId`
- `actorId`
- `type`
- `subjectType`
- `subjectId`
- `visibility`
- `title`
- `body`
- `metadata`
- `createdAt`

Allowed visibility values:

- `internal`
- `client`

Client users may only receive activity records with `visibility = client` for organizations where they have active membership and the organization is active.

Internal users with client-management access may receive both internal and client-visible activity.

Activity creation should be done through a small service helper, not scattered raw Prisma calls.

### Frontend

Add a reusable activity timeline component and compact queue helpers.

Admin surfaces:

- `/operations/clients` shows client health summary and latest activity.
- `/operations/clients/requests` shows latest activity for the selected ticket or client.
- `/operations/clients/delivery` shows activity for work progress.

Client surfaces:

- `/client` shows "What changed recently".
- `/client/messages` shows conversation-oriented activity without internal notes.
- `/client/work` shows delivery-related activity.

### API

Add these endpoints:

- `GET /api/clients/organizations/:id/activity`
- `GET /api/clients/activity/queue`

The organization activity endpoint returns scoped activities for one organization.

The queue endpoint returns actionable items derived from tickets, approvals, work items, reports, and calendar items. It should not duplicate database records into a separate queue table in Phase 1.

### Queue Categories

Phase 1 queue categories:

- `team_response_needed`
- `client_response_needed`
- `approval_needed`
- `work_due_soon`
- `report_ready`
- `recently_completed`

Each queue item should include:

- `id`
- `organizationId`
- `organizationName`
- `category`
- `title`
- `summary`
- `subjectType`
- `subjectId`
- `priority`
- `dueAt`
- `href`
- `visibility`

### Error Handling

- Activity endpoints require auth.
- Missing or unauthorized organization access returns `403`.
- Unknown organization returns `404` for internal users and `403` for client users where exposing existence would be unsafe.
- Invalid activity filters return `400`.
- Activity creation failures should not hide the primary domain operation unless the event is required for audit history. For Phase 1, ticket comments, approval decisions, billing changes, calendar deletes, and account archive/restore should be treated as audit-significant and fail if activity creation fails.

### Testing

Backend tests should cover:

- Internal users see internal and client-visible activity.
- Client users see only client-visible activity.
- Client users cannot read another organization's activity.
- Activity is created for ticket comments, approval responses, work item completion, report publish, billing updates, calendar changes, and client archive/restore.
- Queue output derives correct categories without leaking internal records.

Frontend tests should cover:

- Activity formatting.
- Queue grouping.
- Client-safe filtering.
- Route href creation.
- Empty-state copy.

Browser QA should cover:

- Admin client overview activity timeline.
- Client overview activity timeline.
- Admin queue item linking into the correct route.
- Client queue item linking into the correct route.
- Mobile width with no horizontal overflow.

## Non-Goals

These are intentionally outside Phase 1:

- Email reminders.
- AI-generated replies.
- Cross-client analytics trends.
- Public file uploads from clients.
- Full audit export.
- Replacing existing notification center behavior.
- A separate queue persistence table.

## Release Criteria

Phase 1 is ready when:

- Activity records are created for the highest-value client/admin events.
- Activity is scoped correctly for internal and client users.
- Admin and client dashboards show recent activity.
- Queue helpers show actionable work without duplicating status logic into every page.
- Backend tests, frontend tests, lint, build, Prisma validate/generate, audit, Docker config, and browser QA pass.
