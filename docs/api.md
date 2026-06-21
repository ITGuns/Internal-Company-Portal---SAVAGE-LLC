# API Notes

## Auth And Signup

### `POST /auth/signup`

Creates a pending user application.

- `name`, `email`, `password`, `departmentId`, and `role` are required.
- `departmentId` must match an existing department.
- `role` must match an available role for that department or a global available role.
- Signup stores requested role data on `EmployeeProfile`.
- Signup does not create active `UserRole` authorization records.

### `POST /auth/login`

Authenticates approved users only.

- Invalid credentials return `401`.
- Pending or unapproved accounts return `403`.
- Approved users receive an access token in JSON and a refresh token in an httpOnly `portal_refresh_token` cookie.
- Auth user responses are serialized through the auth security helper and do not return password or reset-token fields.

### OAuth Login

Google and Discord OAuth routes are mounted under `/auth`.

- New OAuth users are created with pending status and `isApproved: false`.
- Existing OAuth users keep updated name/avatar data.
- OAuth users must still pass the same approval check before tokens are issued.

### Token Refresh And Current User

- `POST /auth/refresh` refreshes an access token from the httpOnly refresh cookie. A body `refreshToken` is still accepted as a legacy fallback for older browser sessions.
- Refresh rejects missing users and users who are no longer approved.
- `GET /auth/me` returns the authenticated user context through the same safe auth serializer.
- `POST /auth/logout` clears the refresh-token cookie; the frontend also clears its stored access token and user cache.
- `POST /auth/forgot-password` and `POST /auth/reset-password` support the password reset flow.

## Users

All user endpoints require authentication unless noted otherwise.

### Directory Responses

User directory endpoints sanitize sensitive fields before returning data to the frontend.

- `GET /api/users`, `GET /api/users/search`, and `GET /api/users/:id` omit password and password-reset fields.
- `GET /api/users` and `GET /api/users/search` are restricted to internal accounts; client-only accounts must use client-scoped portal endpoints.
- `GET /api/users/:id` and `GET /api/users/:id/roles` allow the requester to read their own safe record and otherwise require internal directory access.
- `GET /api/users` accepts `page` and `limit`; omitted pagination returns a legacy array shape but is still capped to the first 100 records server-side.
- Directory responses only return allowlisted public user fields plus sanitized role assignments.
- Embedded `employeeProfile` data is limited to public directory fields such as `jobTitle` and `employmentType`.
- Payroll-sensitive fields such as salary, currency, payment frequency, payroll scheme, max billable hours, bank account, and tax ID are not returned through user directory endpoints.
- Private profile fields such as phone, address, city, and citizenship are not returned through broad directory responses.

### User Tasks

`GET /api/users/:id/tasks` is scoped by task visibility.

- Non-privileged users can only request their own task list.
- Privileged users can inspect another user's tasks.
- Returned tasks still follow server-side visibility and assignment rules.

### User Mutation

- `POST /api/users` is full-access admin-only.
- `POST /api/users/onboarding-invitations` is full-access admin-only and creates or completes an approved user setup record from `email` and `roleId`. `roleId` may be a persisted `AvailableRole.id` or a default org-catalog role ID returned by the roles API. It returns a reset-password setup link; users with an existing password return `409` and should use password reset instead.
- `PATCH /api/users/:id` allows self updates for permitted profile fields. Self-service email changes are blocked; only full-access administrators can change a user's account email address.
- Full-access administrators may update `managerId` through `PATCH /api/users/:id` to maintain Operations org-chart reporting lines. The backend rejects self-manager assignments and manager cycles.
- User avatar writes through `POST /api/users`, `PATCH /api/users/:id`, and `POST /api/users/:id/avatar` accept only http(s) URLs, relative paths, empty removal values where profile updates allow them, or supported image data URIs that pass signature validation and the 5 MB avatar limit.
- Non-privileged users cannot update protected fields such as `status`, `appliedDate`, `salary`, `role`, `department`, `departmentId`, `managerId`, `payrollScheme`, `maxBillableHoursPerDay`, or `isApproved`.
- `DELETE /api/users/:id` requires admin or operations-manager access.
- `POST /api/users/:id/roles` and `DELETE /api/users/:id/roles/:role` are full-access admin-only role assignment routes.
- The Operations member editor uses sanitized `GET /api/users` responses plus these user-role routes; authorization changes are enforced by backend role checks, not by frontend-only visibility.

## Global Search

`GET /api/search?q=:query` returns cross-system search results for the authenticated user.

- Results are server-authorized before any record is returned; the frontend command palette is not the source of access control.
- Internal users can search permitted tasks, daily logs, announcements, chat messages, file-directory folders, and internal directory people.
- Client users can search only active assigned client organizations and records marked client-visible.
- Client operations roles can search client operations records across organizations.
- Payroll events, time entries, payslips, and payroll profiles are returned only for payroll-management roles or configured admin emails.
- Queries shorter than two characters return an empty list; result sets are capped per record group.

## Employees

### Public Verification Requests

- `POST /api/employees` and `POST /api/employees/request-verification` create pending employee verification requests.
- The request flow creates pending employee data and sends the configured notification/welcome messages.
- Public verification responses are serialized and do not return passwords, reset tokens, or payroll profile internals.

### Employee Review

- `GET /api/employees/pending` requires employee-management access.
- `GET /api/employees/deployed` requires employee-management access and excludes client-only accounts from internal employee/payroll workflows.
- `POST /api/employees/approve/:id` approves a pending employee application when the requester has employee-management access.
- `POST /api/employees/reject/:id` rejects a pending employee application when the requester has employee-management access.

Employee-management access recognizes normalized admin, administrator, owner/founder, manager, project-manager, operations-manager, and chief-operations-officer roles. Configured admin bypass emails are also allowed.

Approval behavior:

- Sets `status` to `verified` and `isApproved` to `true`.
- Assigns the requested role and department from `EmployeeProfile` as an active `UserRole` when both values are present.
- If the pending account has neither a requested role/department nor an existing role assignment with a department, approval returns `400` and does not mark the account approved.
- Approval and rejection responses are serialized before returning to the frontend.

## Tasks

All task endpoints require authentication.

### Task Read Visibility

Employee task reads are server-scoped.

- Privileged users may read all tasks through list, search, status, department, assignee, and detail endpoints.
- Non-privileged users receive tasks assigned to their authenticated user ID, created by their authenticated user ID, or shared with them as invited/accepted collaborators.
- `GET /api/tasks/assignee/:assigneeId` returns `403` when a non-privileged user requests another user's tasks.
- `GET /api/tasks/:id` returns `403` when a non-privileged user requests a task they neither created, are assigned to, nor collaborate on.

### Task Detail

`GET /api/tasks/:id` returns one task with detail relations.

- Includes `department` and `assignee`.
- Includes `creator` when `createdById` is set.
- Includes `collaborators` with invited user and inviter identity summaries.
- Includes `workSessions` sorted newest first.
- Each work session includes `startedAt`, `endedAt`, `durationSeconds`, and the session `user` identity fields.

### Task Creation

`POST /api/tasks` creates a task.

- Privileged users may provide `assigneeId`, `departmentId`, and `role`.
- Non-privileged users cannot choose assignment fields.
- For non-privileged users, the server derives `assigneeId` from the authenticated user ID.
- For non-privileged users, the server derives `departmentId` and `role` from the user's primary `UserRole`.
- Non-privileged task creation fails when the account has no role with a department.
- The server sets `createdById` from the authenticated requester; clients should not send requester ownership.
- Task notifications use detail links such as `/task-tracking?task=:taskId`.
- Optional `projectId` assigns the task to an internal task project visible to the requester.
- Privileged users may provide `collaboratorIds` to invite additional employee collaborators while keeping one primary assignee.
- Non-privileged users cannot set `collaboratorIds`.

### Task Updates

`PATCH /api/tasks/:id` updates a task.

- Privileged users may update assignment, department, and role fields.
- Non-privileged users may only update tasks assigned to them.
- Non-privileged users cannot update `assigneeId`, `departmentId`, or `role`.
- Non-privileged users cannot update `collaboratorIds`.
- Privileged users may replace the collaborator list with `collaboratorIds`; an empty array clears collaborators.
- `projectId` may be set or cleared. Non-privileged users may only use projects visible to their assigned department, project membership, or cross-functional projects without explicit members.
- Moving a task into `completed` sets `completedAt` server-side.
- Moving a task away from `completed` clears `completedAt`.
- Closing a running task timer records a `TaskWorkSession` when duration is available.

### Task Deletion

`DELETE /api/tasks/:id` requires management access.

### Task Projects

Task project routes support project-based task organization inside Task Tracking.

- `GET /api/tasks/projects` returns projects visible to the requester. Privileged users can see all projects; non-privileged users see projects they are members of, projects in their assigned department, cross-functional projects without explicit members, or projects already containing tasks visible to them.
- `POST /api/tasks/projects` creates a project and requires privileged task assignment access. Optional `memberIds` assigns employee members to the project.
- `PATCH /api/tasks/projects/:projectId` updates project metadata/status and requires privileged task assignment access. Optional `memberIds` replaces the project member list; an empty array clears members.
- `DELETE /api/tasks/projects/:projectId` clears linked task `projectId` values, deletes the project, and requires privileged task assignment access.
- Project statuses are `active`, `paused`, `completed`, and `archived`.

### Privileged Task Assignment Roles

The task assignment privilege check currently recognizes:

- `admin`
- `administrator`
- `owner_founder`
- `manager`
- `project_manager`
- `operations_manager`
- `chief_operations_officer`

Configured admin bypass emails also receive privileged task assignment access.

## Departments And Roles

### Departments

`GET /api/departments` returns active departments with backend-managed role options.

- Each department includes `availableRoles` ordered by name, merging persisted role rows with any missing org-catalog defaults for that department.
- Task role dropdowns should use these backend role options.

Department writes are full-access admin-only:

- `POST /api/departments/org-catalog/sync` upserts the default SAVAGE LLC org-chart departments and role options into real `Department` and `AvailableRole` rows.
- `POST /api/departments`
- `PATCH /api/departments/:id`
- `DELETE /api/departments/:id`

### Roles

- `GET /api/roles` returns persisted role options plus missing org-catalog default roles for existing departments. Default role IDs use the `default:<departmentId>:<role-slug>` format.
- `POST /api/roles` and `DELETE /api/roles/:id` are full-access admin-only routes for backend role-option maintenance.

## Client Portal

All client portal endpoints require authentication.

Client portal management access recognizes normalized full-access, management, and website-delivery roles: owner/founder, admin, administrator, manager, project-manager, operations-manager, chief-operations-officer, web-developer, website-developer, webdev, frontend-developer, and backend-technical-developer. Configured admin bypass emails are also allowed.

### Client Organization Access

- Internal managers and admins can list and manage all client organizations, including archived client accounts.
- Client users can only list or read active organizations where they have an active `ClientMembership`.
- Client-facing serializers omit internal organization notes, raw `tierId`, internal tier price/priority, ticket assignment fields, internal ticket comments, and inactive client memberships.

### Client Routes

- `GET /api/clients/organizations` lists client organizations visible to the requester.
- `GET /api/clients/portal/bootstrap` returns the initial client portal workspace payload for the requester: visible organizations, selected organization ID, scoped overview data, recent activity, and action queue items. Optional `organizationId` selects a specific readable organization.
- `POST /api/clients/organizations` creates a client organization and is restricted to client-management access. Optional `websiteWorkType` values are `existing_site_improvement` and `new_build`.
- `GET /api/clients/service-tiers`, `POST /api/clients/service-tiers`, `PATCH /api/clients/service-tiers/:id`, `DELETE /api/clients/service-tiers/:id`, and `PATCH /api/clients/organizations/:id/service-tier` manage service tiers for internal client-management users. Deleting a service tier clears it from assigned client organizations through the existing database relation.
- `PATCH /api/clients/organizations/:id/status` updates a client organization status (`active`, `paused`, or `archived`) for internal management. Archiving removes client-facing access without deleting history.
- `GET /api/clients/organizations/:id/overview` returns scoped memberships, projects, tickets, updates, metrics, resources, production records, billing/calendar data, storage root, booking requests, payment connection readiness records, and invoices for one organization.
- `GET /api/clients/organizations/:id/activity` returns scoped activity history. Internal users can receive internal and client-visible events; client users only receive client-visible events for assigned active organizations.
- `GET /api/clients/activity/queue` returns derived action queue items from tickets, approvals, work items, draft reports, and recent completions.
- Membership and invitation routes manage active client access without destructive deletion: `GET/POST /api/clients/organizations/:id/memberships`, `POST /api/clients/organizations/:id/invitations`, and `PATCH /api/clients/memberships/:id`.
- Project, update, metric, resource, work item, approval, report, roadmap, asset, billing-status, storage-root, booking-request, payment-connection, invoice, and calendar-item routes support client production records with server-derived ownership and visibility checks.
- Provider-ready client operations routes: `PATCH /api/clients/organizations/:id/storage-root`, `POST /api/clients/organizations/:id/booking-requests`, `PATCH /api/clients/booking-requests/:id`, `PATCH /api/clients/organizations/:id/payment-connections`, `POST /api/clients/organizations/:id/invoices`, `POST /api/clients/organizations/:id/invoices/generate`, and `PATCH /api/clients/invoices/:id`. Client users may only create client-visible manual booking requests for readable organizations; storage, payment connection, and invoice management remain internal client-management actions.
- `POST /api/clients/organizations/:id/reports/draft` generates an editable draft report from existing client operations records before internal users publish it.
- `POST /api/scheduler/run/client-invoices` runs the internal client invoice generation job. It scans active/trial/past-due billing statuses with due renewals, skips organizations that already have an invoice for the due date, and creates draft manual invoices from the monthly billing status.
- Ticket routes support client requests and conversations: `POST /api/clients/organizations/:id/tickets`, `GET /api/clients/tickets`, `PATCH /api/clients/tickets/:id`, `DELETE /api/clients/tickets/:id`, `PATCH /api/clients/tickets/:id/status`, and `POST /api/clients/tickets/:id/comments`.
- Internal client-management users can update ticket workflow fields through `PATCH /api/clients/tickets/:id`: `projectId`, `assignedToId`, and `internalNotes`. Linked projects are validated against the ticket's client organization, and unknown assignee IDs are rejected.

Protected fields:

- Clients cannot set `organizationId`, `createdById`, `assignedToId`, or `internalNotes` through ticket creation.
- Client-created resources and calendar items cannot set internal-only visibility, creator ownership, project ownership, or admin workflow status.
- Client ticket updates cannot set organization, creator, assignment, status, project, comments, or internal notes.
- Client invitations derive user approval, global client role, setup token, tenant assignment, and timestamps server-side.
- Production record routes derive organization, creator/requester IDs, publish timestamps, provider-readiness fields, invoice numbers, linked storage folders, and client-visible filtering server-side.
- Internal comments stay hidden from client ticket responses.
- Client activity responses strip internal events and internal metadata from client users. Activity creation is transactional for audit-significant events such as request replies, approval decisions, billing changes, storage-root updates, booking requests, payment connection updates, invoice changes, service tier assignment changes, calendar deletion, and account archive/restore.

## Daily Logs

All daily-log endpoints require authentication.

- `GET /api/daily-logs` supports `department`, `status`, `logType`, `page`, and `limit` query parameters.
- Omitted daily-log pagination returns the legacy array shape but is capped to the first 100 records server-side.
- `GET /api/daily-logs/my-logs` returns the authenticated user's logs.
- `POST /api/daily-logs` creates a daily, weekly, monthly, or related log record.
- `PATCH /api/daily-logs/:id` updates a log when the requester owns it or has management access.
- `DELETE /api/daily-logs/:id` deletes a log when the requester owns it or has management access.
- `POST /api/daily-logs/:id/like` toggles the authenticated user's like.
- `POST /api/daily-logs/:id/comments` adds an authenticated user's comment to a log.
- `DELETE /api/daily-logs/:id/comments/:commentId` deletes the authenticated user's own comment.
- Frontend create/update flows derive the submitted `status` from task JSON instead of exposing a manual status field in the Daily Log form.
- Daily-log task JSON may include optional `sourceTaskId`, `status`, `progress`, `sessionCount`, `trackedMinutes`, and `participants` fields for Task Tracking imports.

Daily-log department handling is server-managed:

- Non-privileged users do not choose the stored department; the backend derives it from the user's assigned `UserRole.department`.
- Non-privileged create/update requests that try to submit a different department return `403`.
- Owner/founder, admin, manager, project-manager, operations-manager, chief-operations-officer, and configured admin bypass emails may submit a department override.
- Accounts with no assigned department cannot create daily logs until their role assignment is fixed.

Frontend task import, task-report posting, and manager review helpers use existing task and daily-log APIs. Task import treats primary assignees, multi-assignees, and non-declined collaborators as task participants. There is no dedicated task-import backend route at this time.

## Payroll

All payroll endpoints require authentication unless noted otherwise.

### Payroll Management Access

Payroll management access currently recognizes:

- `admin`
- `administrator`
- `owner_founder`
- `operations_manager`
- `bookkeeping`
- `contractor_salary_payments`

Configured admin bypass emails also receive payroll management access.

### Payroll Events

- `GET /api/payroll/events` lists calendar events.
- `POST /api/payroll/events` creates an event and requires payroll-management access.
- `PATCH /api/payroll/events/:id` updates an event and requires payroll-management access.
- `DELETE /api/payroll/events/:id` deletes an event and requires payroll-management access.

### Time Entry Access

- `GET /api/payroll/time-entries` returns the authenticated user's entries by default.
- `GET /api/payroll/time-entries?userId=:userId` returns `403` when a non-privileged user requests another user's entries.
- `GET /api/payroll/time-entries` also accepts `start` and `end` date filters.
- `POST /api/payroll/clock-in` creates an open time entry for the authenticated user.
- `POST /api/payroll/clock-out` closes the authenticated user's open entry.
- `POST /api/payroll/entry` lets users create their own manual entry.
- Privileged users may create a manual entry for another employee by passing `userId`.
- `PATCH /api/payroll/entry/:id` lets users update their own entry start, end, and notes.
- Only privileged users can reassign a time entry by changing `userId`.
- `DELETE /api/payroll/entry/:id` lets users delete their own entry; privileged users may delete any employee entry.
- Manual entry create/update validates date values and requires end time to be after start time when an end time is provided.

### Payroll Profile Access

- `GET /api/payroll/config/:userId` allows self access or privileged access to another employee.
- `POST /api/payroll/config/:userId` allows self access only for permitted non-sensitive fields.
- Protected payroll profile fields are manager-only: `jobTitle`, `employmentType`, `baseSalary`, `currency`, `paymentFrequency`, `payrollScheme`, `maxBillableHoursPerDay`, `bankAccount`, and `taxId`.
- Non-privileged updates containing protected fields return `403` with the rejected field names.
- Empty or unknown payroll profile updates return `400`.

### Payroll Periods And Payslips

- `GET /api/payroll/periods` lists payroll periods.
- `POST /api/payroll/periods/ensure` ensures a period exists for a supplied date range.
- `POST /api/payroll/periods` requires payroll-management access.
- `POST /api/payroll/periods/:periodId/generate/:userId` requires payroll-management access.
- `POST /api/payroll/periods/:periodId/generate-all` requires payroll-management access and generates only for internal employee accounts.
- Payslip preview/generation separates tracked hours from billable hours. Hours beyond the employee's `maxBillableHoursPerDay` are returned as pending overtime and are not included in automatic gross pay until approved or manually overridden by a privileged reviewer.
- Payroll schemes currently supported are `weekdays`, `flat_30`, `flat_20`, and `flat_160_hours`.
- `GET /api/payroll/my-payslips` returns self payslips by default and allows privileged `userId` review.
- `GET /api/payroll/reports` requires payroll-management access.
- `GET /api/payroll/payslips/all` requires payroll-management access.

## Scheduler

Scheduler endpoints require protection because they can create payroll periods, generate payslips, produce payroll reports, and generate client invoices.

- `GET /api/scheduler/cron` is the Vercel Cron entrypoint. Vercel sends this as a GET request with `Authorization: Bearer <CRON_SECRET>`. The backend also accepts legacy `SCHEDULER_SECRET` for manual deployments.
- `POST /api/scheduler/cron` remains available for local/manual cron compatibility and uses the same bearer-secret check.
- `POST /api/scheduler/run/:jobType` manually runs one scheduler job and requires an authenticated scheduler-management role. Valid job types are `period-advance`, `auto-payslip`, `dept-report`, `client-invoices`, and `all`.
- `GET /api/scheduler/runs?limit=:limit` returns recent scheduler runs for scheduler-management users. `limit` is capped at 100.
- `period-advance` ensures a semi-monthly draft payroll period exists for the current half-month.
- `auto-payslip` bulk-generates payslips for the most recent draft period when the period is within the generation window.
- `dept-report` stores a payroll report summary for the latest available payroll period.
- `client-invoices` scans active/trial/past-due monthly billing records and creates draft manual invoices when due.

## Collaboration And Files

### Announcements

- Announcement list, detail, like, comment, RSVP, update, and delete routes require authentication.
- Omitted announcement pagination returns the legacy array shape but is capped to the first 100 records server-side.
- Announcement create, update, and delete routes require management access.
- Announcement categories are stored as strings. The frontend supports the built-in categories and normalized custom category slugs; backend notifications format unknown categories as readable labels instead of falling back to another built-in type.

### Email Operations

- `POST /api/email/test`, `POST /api/email/send`, and `GET /api/email/status` require full-access administrator privileges.
- Email routes are intended for provider configuration checks and controlled operational sends, not general employee or client messaging.

### Chat

- Chat routes require authentication.
- `GET /api/chat?view=active|archived|all` returns conversations for the authenticated user, defaulting to non-archived active conversations.
- Direct conversations require exactly two participants.
- Conversations cannot exceed 50 participants.
- The requester is always added to the participant list server-side.
- Channel conversations and privileged conversation names such as `General` or `Global` require employee-management access.
- Conversation room access is checked server-side for Socket.io joins.
- Message list limits are capped server-side and message/search content is normalized before database queries.
- `POST /api/chat/:id/archive` and `POST /api/chat/:id/unarchive` update the authenticated user's participant archive state without deleting the conversation for other participants.
- Live chat sends full message events to authorized conversation rooms and lightweight badge events to recipient user rooms.
- Message edit/delete routes are authenticated and handled through chat service rules.
- `POST /api/chat/messages/:id/reactions` toggles one allowed emoji reaction for the authenticated participant and broadcasts `chat:reaction_updated` to the conversation room.
- Allowed reaction payloads are limited to the built-in quick reaction set for this deploy.

### Uploads And File Directory

- Upload routes require authentication.
- `POST /api/uploads` stores a file and returns an authenticated file URL under `/api/uploads/files/:filename`.
- Upload payloads must be valid base64 and the decoded file signature must match the declared allowed content type. Supported generic uploads are PNG, JPEG, GIF, PDF, plain text, DOC, and DOCX.
- Stored generic upload filenames use a server-generated timestamp plus a sanitized basename and canonical extension derived from the validated content type, not from the user-supplied extension.
- `GET /api/uploads/files/:filename` requires authentication, only serves supported stored upload filenames, rejects path traversal or missing files, sets the response content type from the canonical extension, and sends `X-Content-Type-Options: nosniff`.
- Avatar data URI uploads and stored user avatar updates are limited to JPEG, PNG, GIF, and WebP signatures and remain capped at 5 MB. Stored avatar references are restricted to short initials, safe relative paths, or `http(s)` URLs.
- File-directory list and children routes require authentication.
- File-directory create routes require authentication; delete is allowed to the creator or full-access admins. Full-access users can view all department folders.

### Notifications

- `GET /api/notifications` returns notifications for the authenticated user.
- Notification history is derived from existing domain data such as announcements, tasks, and chat messages.
- Browser notification permission and muted live-category preferences are frontend-local settings stored per user; there is no backend preference endpoint or dedicated Notification table in the current schema.
