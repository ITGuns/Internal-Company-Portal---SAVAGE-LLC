# Database Notes

## Prisma And Migrations

The backend uses Prisma with PostgreSQL.

Current additive migrations related to the recent release:

- `202605210001_task_sessions_signup_requests`
- `202605210002_task_creator`
- `202605240001_client_portal_foundation`
- `202605270002_client_activity`
- `202606100001_task_projects_org_reporting`

Migration SQL is now tracked. Do not ignore migration SQL files or rely on local schema drift.

Before changing schema:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

Use `npm run prisma:migrate` for local development migrations and `npm run prisma:deploy` for deployment migration application.

Production deploys on an SSH/Docker host should use `npm run prisma:deploy:production` so Prisma reads `backend/.env.production`. Managed platforms that inject environment variables directly, such as Render, should use `npm run prisma:deploy:render`.

For Supabase-backed production, keep runtime and migration connection strings separate:

- `DATABASE_URL` is the backend runtime connection.
- `DIRECT_DATABASE_URL` is the Prisma CLI migration/bootstrap connection. The Prisma config falls back to `DIRECT_URL` and then `DATABASE_URL` when no direct URL is set.

The tracked migration history is additive from an already-existing base schema; the first migration alters tables such as `Task` and `EmployeeProfile`. Because of that, a brand-new empty database must not be initialized by plain `prisma migrate deploy` alone.

For a verified empty production or staging database, run:

```powershell
cd backend
$env:ALLOW_EMPTY_DATABASE_BOOTSTRAP = "true"
npm run prisma:bootstrap-production
```

The bootstrap command only proceeds when no application tables exist in the target schema from the database URL. It creates the current Prisma schema, marks all tracked historical migrations as applied, and then runs `prisma migrate deploy`. Use it only once per new empty database. Normal releases should use `npm run prisma:deploy:production`.

## Client Service Tier Presets

`ClientServiceTier` stores the client account tier catalog used by Client Operations account and billing views.

Default SOP-derived tier presets are maintained in `backend/src/clients/client-service-tier-presets.ts` and can be applied with:

```powershell
cd backend
npm run seed:client-service-tiers
```

The preset seed upserts by tier `name`, updates matching preset descriptions/prices/ranks, and leaves unrelated custom tiers untouched. No schema migration is required for the current tier catalog.

## Client Website Work Type

`ClientOrganization.websiteWorkType` stores the intake choice for website work:

- `existing_site_improvement` when the client has a website the team will improve.
- `new_build` when the team will build a new website or rebuild from scratch.

The field is nullable so existing client organizations are not backfilled into an inaccurate category.

## Identity And Authorization

`User` is the account record and owns authentication fields, roles, tasks, logs, time entries, notifications, and related profile data.

`UserRole` stores active authorization.

- Signup should not create active `UserRole` records.
- Approval creates an active role from the requested signup fields when present.
- Role checks in controllers and permission helpers should read active `UserRole` data, not requested signup fields.

`Department` groups users, tasks, and available role options.

`AvailableRole` stores backend-managed role options.

- Roles may be department-specific through `departmentId`.
- Global roles have no department.
- `(name, departmentId)` is unique.
- Frontend role dropdowns should use department `availableRoles` returned by the backend.
- Department and role APIs preserve persisted role rows and merge any missing org-catalog default roles for matching departments.
- The default org catalog is defined in `backend/src/org/org-access-policy.ts` and mirrored in `frontend/src/lib/departments.ts`.
- The current default departments are Owners / Founders, Project Management, Operations, Digital Marketing, Analytics / Data, Automation / Tech, Website Developers, and Payroll / Finance.
- `User.managerId` stores flexible reporting lines for the Operations org chart. It is a nullable self-relation with `onDelete: SetNull`, so removing a manager does not delete direct reports.

## Signup Approval

`EmployeeProfile.requestedRole` and `EmployeeProfile.requestedDepartmentId` store signup intent separately from active authorization.

- Signup writes requested values only.
- Approval converts the requested values into an active `UserRole`.
- Missing requested role or department leaves approval from creating a role assignment.

Payroll-sensitive fields also live on `EmployeeProfile`.

- Compensation, currency, payment frequency, bank account, and tax ID are protected fields.
- Directory serializers must not expose sensitive payroll/profile fields.
- `EmployeeProfile.payrollScheme` stores the salary divisor rule for payroll calculation. Supported values are `weekdays`, `flat_30`, `flat_20`, and `flat_160_hours`.
- `EmployeeProfile.maxBillableHoursPerDay` stores the daily cap used to split tracked time into billable hours and pending overtime.

## Task Tracking

`Task.completedAt` stores the server-side completion timestamp.

- Set when a task first moves to `completed`.
- Cleared when a task moves away from `completed`.
- Indexed for completion-date reporting.

`Task.createdById` stores the requester/creator separately from assignment.

- Links to `User.id` through the `TaskCreator` relation.
- Uses `onDelete: SetNull` so historical tasks survive user removal.
- Indexed for creator-scoped visibility checks.
- `Task.assigneeId` remains the current task owner/worker through the `TaskAssignee` relation.

`TaskCollaborator` stores task collaboration invitations without changing the primary assignee contract.

- Links each task to invited employee collaborators through `(taskId, userId)`.
- Uses `onDelete: Cascade` for task/user cleanup and `onDelete: SetNull` for the inviter relation.
- `status` currently supports invitation-state reads such as `invited`, `accepted`, and `declined`.
- A unique `(taskId, userId)` constraint prevents duplicate collaborator rows.
- Indexes on task, user, inviter, and status support task detail reads, collaborator-scoped visibility, and future invitation inboxes.

`TaskProject` stores internal task project groupings for Task Tracking.

- `Task.projectId` links a task to an optional project through `onDelete: SetNull`.
- `TaskProject.departmentId` can scope a project to a department, but remains nullable for cross-functional work.
- `TaskProject.ownerId` and `createdById` link to `User` with `onDelete: SetNull`.
- Project status supports active, paused, completed, and archived UI states.
- Project and project-task indexes support dashboard filtering, grouping, and project progress views.

`TaskWorkSession` stores timer work history.

- `taskId` links to `Task` with cascade delete.
- `userId` links to `User` with cascade delete.
- `startedAt`, `endedAt`, and `durationSeconds` capture a closed timer segment.
- Indexed by task, user, and start time.

## Daily Logs

`DailyLog` stores employee work summaries by date.

- `tasks` is a JSON field used by the frontend for manual entries and Task Tracking imports.
- Imported task entries use stable source IDs such as `task:<taskId>` to prevent duplicate imports.
- Imported task entries may also store `sourceTaskId`, `status`, `progress`, `sessionCount`, and `trackedMinutes` so Daily Logs can show task-derived status badges.
- New frontend submissions derive `DailyLog.status` from the task rows instead of asking the user to choose a status manually.
- Completed task imports should be based on `Task.completedAt`; in-progress assigned tasks can still appear as active work suggestions.
- Review-stage task suggestions are UI review helpers and should remain separate from employee self-report imports unless explicitly added by the user.

## Payroll

`TimeEntry` stores clock-in/clock-out and manual time-entry records.

- `clockOut` may be null for an open entry.
- Manager audit views use existing `userId`, `start`, and `end` filtering rather than a separate audit table.
- Correction notes are currently stored in the entry notes/context, not in a durable immutable audit-log table.

`PayrollPeriod`, `Payslip`, and `PayrollItem` store generated payroll results.

- Period generation is restricted through payroll controller permissions.
- Payslip reads are self-service by default and privileged for management review.
- Automatic payslip generation uses billable hours after applying the employee daily cap. Pending overtime is recorded as a zero-amount `PayrollItem` note until a manager approves or manually overrides pay.

`PayrollEvent` stores calendar-level payroll events.

## Client Portal

Client portal data is tenant-scoped by `ClientOrganization`.

- `ClientOrganization` is the client account/workspace record and owns projects, tickets, updates, metrics, resources, and memberships. `status` supports safe account lifecycle states such as `active`, `paused`, and `archived`; archived organizations keep history but are excluded from client-facing access.
- `ClientMembership` links portal users to one client organization and stores client-side role/status. Active memberships on active organizations are the client visibility boundary; inactive memberships preserve history and act as safe deactivation instead of destructive deletion.
- Client invitations do not use a separate table yet. They create or update `User`, ensure a departmentless `UserRole` of `client`, upsert `ClientMembership`, and reuse existing password-reset token fields for first-time setup links.
- `ClientServiceTier` stores internal tier metadata used for client setup and operations prioritization.
- `ClientProject` stores visible project status, progress, links, and internal notes. Client serializers must not expose `internalNotes`.
- `ClientTicket` stores client support/change requests. The server sets `organizationId` from the route and `createdById` from the authenticated user; clients must not set ownership, internal notes, or assignment fields.
- `ClientTicketComment.visibility` separates client-visible replies from internal handoff notes.
- `ClientUpdate`, `ClientMetricSnapshot`, and `ClientResourceLink` use `visibleToClient` so internal operations can stage private records without exposing them to clients.
- `ClientResourceLink.createdById` records who created a shared link. Client users can only edit/delete their own `client_link` resources; internal users retain management access.
- `ClientWorkItem` stores client-facing work progress, open tasks, and completed work log entries.
- `ClientApproval` stores approval requests, due dates, decision state, and client response notes.
- `ClientReport` stores monthly report periods and snapshot fields for leads, source breakdowns, missed opportunities, reputation, and local visibility.
- `ClientRoadmapRecommendation` stores next-step recommendations with priority, impact, effort, and client visibility.
- `ClientAsset` stores client file/asset links separately from general resources so assets can have lifecycle status and notes.
- `ClientBillingStatus` stores one billing/plan status record per client organization and is hidden from clients unless explicitly marked visible.
- `ClientCalendarItem` stores campaign and content calendar items with channel, status, schedule, visibility, and optional creator ownership. Client users can only mutate items where `createdById` matches their user ID.
- `ClientActivity` stores append-only client-operations events. Each activity belongs to a `ClientOrganization`, may link to the acting `User` with `onDelete: SetNull`, and uses `visibility` (`internal` or `client`) to keep internal audit history separate from client-facing history. Indexes support organization timelines, visibility-scoped reads, subject lookups, and activity-type filtering.
- New client portal tables are additive and do not change existing employee task, payroll, chat, or file-directory records.

## Collaboration And Files

Chat, announcements, notifications, uploads, and file-directory records are part of the same Prisma schema.

- Chat room authorization depends on conversation participation.
- Chat performance indexes support conversation type lookup, recently updated conversation ordering, participant lookup by user, message pagination, and unread-count scans.
- `MessageReaction` stores per-user emoji reactions with a unique `(messageId, userId, emoji)` constraint so toggling a reaction cannot create duplicates.
- File-directory permissions are enforced in the controller/service layer; do not expose unsafe file tree mutations from unauthenticated routes.
- Uploaded files are served through authenticated `/api/uploads/files/:filename` routes.
- Uploaded file metadata and served files should be treated as authenticated portal data unless a route explicitly makes them public.
