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
- Approved users receive access and refresh tokens.
- Auth user responses are serialized through the auth security helper and do not return password or reset-token fields.

### OAuth Login

Google and Discord OAuth routes are mounted under `/auth`.

- New OAuth users are created with pending status and `isApproved: false`.
- Existing OAuth users keep updated name/avatar data.
- OAuth users must still pass the same approval check before tokens are issued.

### Token Refresh And Current User

- `POST /auth/refresh` refreshes an access token from a refresh token.
- Refresh rejects missing users and users who are no longer approved.
- `GET /auth/me` returns the authenticated user context through the same safe auth serializer.
- `POST /auth/logout` clears the current auth-session response.
- `POST /auth/forgot-password` and `POST /auth/reset-password` support the password reset flow.

## Users

All user endpoints require authentication unless noted otherwise.

### Directory Responses

User directory endpoints sanitize sensitive fields before returning data to the frontend.

- `GET /api/users`, `GET /api/users/search`, and `GET /api/users/:id` omit password and password-reset fields.
- Directory responses only return allowlisted public user fields plus sanitized role assignments.
- Embedded `employeeProfile` data is limited to public directory fields such as `jobTitle` and `employmentType`.
- Payroll-sensitive fields such as salary, currency, payment frequency, bank account, and tax ID are not returned through user directory endpoints.
- Private profile fields such as phone, address, city, and citizenship are not returned through broad directory responses.

### User Tasks

`GET /api/users/:id/tasks` is scoped by task visibility.

- Non-privileged users can only request their own task list.
- Privileged users can inspect another user's tasks.
- Returned tasks still follow server-side visibility and assignment rules.

### User Mutation

- `POST /api/users` is admin-only.
- `PATCH /api/users/:id` allows self updates for permitted profile fields.
- Non-privileged users cannot update protected fields such as `status`, `appliedDate`, `salary`, `role`, `department`, `departmentId`, or `isApproved`.
- `DELETE /api/users/:id` requires admin or operations-manager access.
- `POST /api/users/:id/roles` and `DELETE /api/users/:id/roles/:role` are admin-only role assignment routes.

## Employees

### Public Verification Requests

- `POST /api/employees` and `POST /api/employees/request-verification` create pending employee verification requests.
- The request flow creates pending employee data and sends the configured notification/welcome messages.
- Public verification responses are serialized and do not return passwords, reset tokens, or payroll profile internals.

### Employee Review

- `GET /api/employees/pending` requires employee-management access.
- `GET /api/employees/deployed` requires employee-management access.
- `POST /api/employees/approve/:id` approves a pending employee application when the requester has employee-management access.
- `POST /api/employees/reject/:id` rejects a pending employee application when the requester has employee-management access.

Employee-management access recognizes normalized admin, administrator, manager, operations-manager, and chief-operations-officer roles. Configured admin bypass emails are also allowed.

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
- Non-privileged users receive tasks assigned to their authenticated user ID or created by their authenticated user ID.
- `GET /api/tasks/assignee/:assigneeId` returns `403` when a non-privileged user requests another user's tasks.
- `GET /api/tasks/:id` returns `403` when a non-privileged user requests a task they neither created nor are assigned to.

### Task Detail

`GET /api/tasks/:id` returns one task with detail relations.

- Includes `department` and `assignee`.
- Includes `creator` when `createdById` is set.
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

### Task Updates

`PATCH /api/tasks/:id` updates a task.

- Privileged users may update assignment, department, and role fields.
- Non-privileged users may only update tasks assigned to them.
- Non-privileged users cannot update `assigneeId`, `departmentId`, or `role`.
- Moving a task into `completed` sets `completedAt` server-side.
- Moving a task away from `completed` clears `completedAt`.
- Closing a running task timer records a `TaskWorkSession` when duration is available.

### Task Deletion

`DELETE /api/tasks/:id` requires admin, manager, or operations-manager access.

### Privileged Task Assignment Roles

The task assignment privilege check currently recognizes:

- `admin`
- `manager`
- `operations_manager`
- `Operations Manager`
- `Chief Operations Officer`

Configured admin bypass emails also receive privileged task assignment access.

## Departments And Roles

### Departments

`GET /api/departments` returns active departments with backend-managed role options.

- Each department includes `availableRoles` ordered by name.
- Task role dropdowns should use these backend role options.

Department writes are management-only:

- `POST /api/departments`
- `PATCH /api/departments/:id`
- `DELETE /api/departments/:id`

### Roles

- `GET /api/roles` returns role options.
- `POST /api/roles` and `DELETE /api/roles/:id` are management routes for backend role-option maintenance.

## Client Portal

All client portal endpoints require authentication.

Client portal management access recognizes normalized admin, administrator, manager, operations-manager, chief-operations-officer, web-developer, website-developer, and webdev roles. Configured admin bypass emails are also allowed.

### Client Organization Access

- Internal managers/admins can list and manage all client organizations, including archived client accounts.
- Client users can only list or read active organizations where they have an active `ClientMembership`.
- Client-facing serializers omit internal organization notes, raw `tierId`, internal tier price/priority, ticket assignment fields, internal ticket comments, and inactive client memberships.

### Routes

- `GET /api/clients/organizations` lists client organizations visible to the requester.
- `POST /api/clients/organizations` creates a client organization and is restricted to client-management access.
- `PATCH /api/clients/organizations/:id/status` updates a client organization status (`active`, `paused`, or `archived`) for internal management. Archiving removes client-facing access without deleting history.
- `GET /api/clients/organizations/:id/overview` returns one organization with scoped memberships, projects, tickets, updates, metrics, and resources.
- `GET /api/clients/organizations/:id/activity` returns scoped activity history for one client organization. Internal users can receive internal and client-visible events; client users only receive client-visible events for assigned active organizations.
- `GET /api/clients/activity/queue` returns derived action queue items from tickets, approvals, work items, draft reports, and recent completions. Optional `organizationId` is authorization-checked.
- `GET /api/clients/organizations/:id/memberships` lists client memberships for internal management.
- `POST /api/clients/organizations/:id/memberships` creates or updates a client membership for internal management.
- `POST /api/clients/organizations/:id/invitations` creates or updates a client user, grants the portal role, upserts the organization membership, and returns setup delivery status for internal management.
- `PATCH /api/clients/memberships/:id` updates a client membership role/status for internal management. Deactivation uses `status: inactive` instead of destructive deletion.
- `POST /api/clients/organizations/:id/projects` creates a client project for internal management.
- `PATCH /api/clients/projects/:id` updates a client project's management-controlled fields such as status and progress.
- `POST /api/clients/organizations/:id/updates` publishes or stages a client update for internal management.
- `POST /api/clients/organizations/:id/metrics` creates a client-visible or internal metric snapshot for internal management.
- `POST /api/clients/organizations/:id/resources` creates a client resource link. Internal management can attach normal resource metadata; assigned client users can share an http/https title and link for their own active client organization, with `type` forced to `client_link` and `visibleToClient` forced to `true`.
- `PATCH /api/clients/resources/:id` updates a resource link. Internal management can update managed resource metadata; client users can only edit links they personally shared in their active client organization.
- `DELETE /api/clients/resources/:id` deletes a resource link. Client users can only delete links they personally shared.
- `POST /api/clients/organizations/:id/work-items` creates a client-visible or internal work item for internal management.
- `PATCH /api/clients/work-items/:id` updates or archives a client work item for internal management.
- `POST /api/clients/organizations/:id/approvals` creates a client approval request for internal management.
- `PATCH /api/clients/approvals/:id` updates or archives a client approval for internal management.
- `PATCH /api/clients/approvals/:id/respond` lets an assigned client submit an approval decision or change request for a visible approval.
- `POST /api/clients/organizations/:id/reports/draft` generates a draft client report from visible work, requests, updates, metric snapshots, approvals, roadmap items, and calendar records for the requested period. Internal management can edit and publish the draft before clients see it.
- `POST /api/clients/organizations/:id/reports` creates a monthly/client report period for internal management.
- `PATCH /api/clients/reports/:id` updates or archives a client report period for internal management.
- `POST /api/clients/organizations/:id/roadmap` creates a roadmap recommendation for internal management.
- `PATCH /api/clients/roadmap/:id` updates or archives a roadmap recommendation for internal management.
- `POST /api/clients/organizations/:id/assets` creates a client asset/file link for internal management.
- `PATCH /api/clients/assets/:id` updates or archives a client asset/file link for internal management.
- `PATCH /api/clients/organizations/:id/billing-status` upserts client billing or plan status for internal management.
- `POST /api/clients/organizations/:id/calendar-items` creates a campaign/content calendar item. Internal management can attach normal calendar metadata; assigned client users can add date-only items for their own active client organization, with `status` forced to `planned` and `visibleToClient` forced to `true`.
- `PATCH /api/clients/calendar-items/:id` updates or archives a campaign/content calendar item. Client users can only edit items they personally added, and client edits keep the item client-visible and planned.
- `DELETE /api/clients/calendar-items/:id` permanently deletes a campaign/content calendar item. Client users can only delete items they personally added.
- `POST /api/clients/organizations/:id/tickets` creates a ticket for that organization. The server derives `organizationId` from the URL and `createdById` from the authenticated requester.
- `GET /api/clients/tickets` lists visible tickets. Non-privileged users are limited to active client memberships, and `organizationId` query access is checked server-side.
- `PATCH /api/clients/tickets/:id` updates client-safe ticket fields (`title`, `description`, `category`, `priority`) for tickets in the requester's assigned client organization.
- `DELETE /api/clients/tickets/:id` deletes a ticket only when the requester can access the client organization and the ticket has no conversation history.
- `PATCH /api/clients/tickets/:id/status` updates ticket status for internal management and creates a published client-visible update when the status changes.
- `POST /api/clients/tickets/:id/comments` adds a ticket comment. Client users can only create client-visible comments; internal users can create internal comments.

Protected fields:

- Clients cannot set `organizationId`, `createdById`, `assignedToId`, or `internalNotes` through ticket creation.
- Client-created resources cannot set `projectId`, internal-only visibility, creator ownership, or custom protected metadata; the server derives safe client-visible resource fields.
- Client-created calendar items cannot set `projectId`, internal-only visibility, creator ownership, or admin workflow status; the server derives safe client-visible calendar fields.
- Client ticket updates cannot set organization, creator, assignment, status, project, comments, or internal notes.
- Client invitations accept only email, optional name, membership role, and membership status. User approval, global `client` role, reset/setup tokens, tenant assignment, and timestamps are derived server-side.
- Production record create/update routes derive `organizationId`, creator/requester IDs, and publish timestamps server-side.
- Client approval response routes only accept decision fields and derive the responder and decision timestamp server-side.
- Client-visible overview data only returns updates, metrics, and resources marked visible to the client.
- Client-visible overview data also filters work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items through their `visibleToClient` and status flags.
- Internal comments stay hidden from client ticket responses.
- Client activity responses strip internal events and internal metadata from client users. Activity creation is transactional for audit-significant events such as request replies, approval decisions, billing changes, calendar deletion, and account archive/restore.

## Daily Logs

All daily-log endpoints require authentication.

- `GET /api/daily-logs` supports `department`, `status`, `logType`, `page`, and `limit` query parameters.
- `GET /api/daily-logs/my-logs` returns the authenticated user's logs.
- `POST /api/daily-logs` creates a daily, weekly, monthly, or related log record.
- `PATCH /api/daily-logs/:id` updates a log when the requester owns it or has management access.
- `DELETE /api/daily-logs/:id` deletes a log when the requester owns it or has management access.
- `POST /api/daily-logs/:id/like` toggles the authenticated user's like.

Daily-log department handling is server-managed:

- Non-privileged users do not choose the stored department; the backend derives it from the user's assigned `UserRole.department`.
- Non-privileged create/update requests that try to submit a different department return `403`.
- Admin, manager, operations-manager, chief-operations-officer, and configured admin bypass emails may submit a department override.
- Accounts with no assigned department cannot create daily logs until their role assignment is fixed.

Frontend task import, task-report posting, and manager review helpers use existing task and daily-log APIs. There is no dedicated task-import backend route at this time.

## Payroll

All payroll endpoints require authentication unless noted otherwise.

### Payroll Management Access

Payroll management access currently recognizes:

- `admin`
- `administrator`
- `manager`
- `operations_manager`

Configured admin bypass emails also receive payroll management access.

### Payroll Events

- `GET /api/payroll/events` lists calendar events.
- `POST /api/payroll/events` creates an event.
- `PATCH /api/payroll/events/:id` updates an event.
- `DELETE /api/payroll/events/:id` deletes an event.

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
- Protected payroll profile fields are manager-only: `jobTitle`, `employmentType`, `baseSalary`, `currency`, `paymentFrequency`, `bankAccount`, and `taxId`.
- Non-privileged updates containing protected fields return `403` with the rejected field names.
- Empty or unknown payroll profile updates return `400`.

### Payroll Periods And Payslips

- `GET /api/payroll/periods` lists payroll periods.
- `POST /api/payroll/periods/ensure` ensures a period exists for a supplied date range.
- `POST /api/payroll/periods` requires admin or operations-manager access.
- `POST /api/payroll/periods/:periodId/generate/:userId` requires admin or operations-manager access.
- `POST /api/payroll/periods/:periodId/generate-all` requires admin or operations-manager access.
- `GET /api/payroll/my-payslips` returns self payslips by default and allows privileged `userId` review.
- `GET /api/payroll/reports` requires admin or operations-manager access.
- `GET /api/payroll/payslips/all` requires admin or operations-manager access.

## Collaboration And Files

### Announcements

- Announcement list, detail, like, comment, RSVP, update, and delete routes require authentication.
- Announcement create, update, and delete routes require admin, manager, or operations-manager access.

### Chat

- Chat routes require authentication.
- Direct conversations require exactly two participants.
- Conversations cannot exceed 50 participants.
- The requester is always added to the participant list server-side.
- Channel conversations and privileged conversation names such as `General` or `Global` require employee-management access.
- Conversation room access is checked server-side for Socket.io joins.
- Message edit/delete routes are authenticated and handled through chat service rules.

### Uploads And File Directory

- Upload routes require authentication.
- `POST /api/uploads` stores a file and returns an authenticated file URL under `/api/uploads/files/:filename`.
- `GET /api/uploads/files/:filename` requires authentication, normalizes the basename, and rejects path traversal or missing files.
- File-directory list and children routes require authentication.
- File-directory create/delete routes are protected by the feature's admin/manager access checks.

### Notifications

- `GET /api/notifications` returns notifications for the authenticated user.
