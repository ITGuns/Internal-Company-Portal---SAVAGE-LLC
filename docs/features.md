# Features

## Dashboard

Dashboard is the command-center entry point for the portal.

- Shows role-aware metrics for today's tracked time, visible/assigned tasks, in-progress work, completed-today tasks, overdue tasks, and either pending approvals or daily-log status.
- Shows a `Needs Attention` panel with actionable items for employee approvals, payroll review warnings, overdue tasks, missing daily logs, and no tracked time.
- Employees see personal work and log actions; managers/admins see team operations signals where their role allows access.
- Quick actions route users directly to task tracking, daily logs, payroll review, and either approvals or announcements.
- Dashboard workflow links use query params to open exact states: new task modal, new daily log modal, payroll calendar tab, and pending employee approvals.
- Task attention links can open Task Tracking with overdue or in-progress filters applied.

## Task Tracking

Task tracking supports calendar, board, and list views for task status, assignment, timing, and progress.

### Assignment Behavior

- Employees create tasks for themselves by default.
- `/task-tracking?new=1` opens the new-task modal automatically.
- `/task-tracking?filter=overdue` and `/task-tracking?filter=in_progress` open filtered task views from Dashboard.
- Dashboard-driven task filters show a visible filter banner with the active filter, result count, and a `Clear filter` action.
- `/task-tracking?task=:taskId` opens a specific task detail modal when the authenticated user can read it.
- Unavailable, deleted, or unauthorized task detail links show an inline warning instead of failing silently.
- Employee-created tasks derive assignee, department, and role from the employee's assigned `UserRole`.
- Employees do not manually choose their own assignee or role in the task modal.
- Admins, managers, operations managers, and chief operations officers can assign tasks to other employees.
- Manager/admin assignment controls include an `Assign to me` shortcut.
- Selecting an assignee in the task modal auto-fills that employee's primary department and role when available.
- New task records store `createdById` separately from `assigneeId`, so requester visibility no longer depends only on assignment.
- Task role options come from backend department `availableRoles` instead of frontend-only constants.

### Detail And Work History

- Clicking a task in board, list, or calendar view opens a read-first detail modal.
- The detail modal shows assignment, department/role, dates, progress, tracked time, estimated time, remaining or over-estimate time, and session count.
- Work history lists recorded timer sessions with worker, start/end time, and duration.
- Editing remains available through the detail modal's `Edit Task` action.
- `Generate EOD Report` can post the selected period summary directly into Daily Logs, using structured linked task objects and optional shift notes.

## Daily Logs

Daily logs track EOD, weekly, and monthly work summaries by date, department, status, hours, task list, and shift notes.

- Employee logs use the department assigned to the employee account.
- Managers/admins can review or override log departments when their access allows it.
- Task Tracking report posts create real Daily Log records and refresh Daily Logs after submission.

### Task Import Behavior

- `/daily-logs?new=1` opens the Add Daily Log modal automatically.
- The Add Daily Log modal includes an `Import from Task Tracking` section.
- The import section suggests completed and in-progress tasks assigned to the logged-in user for the selected log date.
- Completed task suggestions use `completedAt` for the selected date; completed tasks without `completedAt` are not inferred from due or update dates.
- Review-stage tasks appear in a separate optional section, with task-session counts and tracked minutes when available.
- Suggested tasks can be imported individually or in bulk with `Import All`.
- Imported completed tasks are checked in the daily-log task list; imported in-progress tasks remain unchecked.
- Manual task entry remains available for work that was not created in Task Tracking.

### Manager Review

- Managers/admins can review team daily-log totals with summary counts for reviewed logs, completed items, blocked items, linked tasks, hours, and latest log date.
- Linked Task Tracking items show a source badge and session count in the log task list when the source task is visible.
- Review-status tasks are intentionally not imported automatically; employees can add them manually from the optional review-stage section when needed.

## Auth And Employee Approval

Signup creates a pending account and preserves the requested department/role without granting authorization immediately.

- Pending accounts cannot log in.
- Pending accounts have no active `UserRole` records.
- Approval deploys the employee, marks the account approved, and assigns the requested department/role.
- Approval now requires an existing or requested role/department assignment; applications missing both are rejected with a clear error instead of creating approved users without roles.
- Admins and authorized operations managers can approve pending employee applications.

## Operations

Operations manages departments, role options, and client account administration.

- Department and role deletes now require a typed confirmation modal.
- The delete action stays disabled until the exact target name is typed.
- Department delete confirmation displays linked task and user-role counts when provided by the API.
- `/operations/clients` is now the Client Operations command center for account health, open work, requests, approvals, latest updates, reports, and quick links into focused work areas.
- `/operations/clients/accounts` manages client setup, external client invitations, approved existing-user access, membership status changes, account profile details, and safe client account removal through archive/restore controls.
- Client Operations separates current client accounts from archived history so removed clients do not crowd the active working list.
- `/operations/clients/delivery` manages projects, build progress, work items, completed work, and client-visible updates.
- `/operations/clients/requests` manages website change requests and support tickets with client-visible replies and internal notes.
- `/operations/clients/approvals` manages approval queue records and client decision status.
- `/operations/clients/reports` manages monthly reports, lead/reputation/local-visibility signals, and metric snapshots.
- `/operations/clients/assets` manages resources, files, links, and client-visible assets.
- `/operations/clients/billing`, `/operations/clients/roadmap`, and `/operations/clients/calendar` manage billing status, next recommendations, and campaign/content schedules.
- Client Roadmap now uses a board-style workflow with modal create/edit/archive controls instead of always-visible form fields.
- Client Calendar now renders a month/week/day calendar with date-only scheduling; clicking a date opens a scheduling modal and clicking an event opens edit/archive/delete controls.
- Client Operations can invite external client contacts, create the client user, assign organization access, and show a setup link when email delivery is not configured.
- Client Operations ticket lists support search plus status, priority, and request-type filters.
- Client Operations now appears under a dedicated **Client Side** sidebar section with focused route links for admins, operations managers, and web developers, while the base `/operations` page stays focused on departments and roles.
- Client Operations now includes a shared action queue and latest-activity timeline so admins can see which client or team response is needed without opening every workspace section.

## Client Portal Foundation

Deskii now has the backend foundation for a client-facing portal/tool inside the existing internal app.

- Client portal records are grouped under `ClientOrganization`.
- Client users are scoped through active `ClientMembership` records on active client organizations and cannot see other client organizations or archived clients.
- Internal managers/admins can create client organizations and review cross-client portal data.
- Client overview data can include projects, tickets, updates, performance metrics, and resource links.
- Ticket creation derives organization and requester ownership server-side, so clients cannot spoof tenant, assignment, or internal fields.
- Internal ticket comments, project notes, tier pricing/priority, and other protected fields are stripped from client-visible responses.
- `/client` gives assigned clients a portal overview with progress, tickets, updates, metrics, resources, and a ticket submission form.
- `/client` now acts as the client command center, with primary workspace navigation handled by the sidebar.
- `/client/work` organizes website build progress, open requests, completed work, and future client-visible task checklists.
- `/client/approvals` surfaces client approval records and lets clients approve or request changes with a response note.
- `/client/messages` consolidates client-visible request conversation history.
- `/client/reports` presents published metric snapshots and report notes as the client reporting dashboard.
- `/client/resources` gives clients a focused shared resource library.
- `/client/account` shows client account, website, status, service tier, and active team access details.
- `/client/calendar` is reserved for the campaign and content schedule surface.
- `/client/tickets` gives clients a focused request center for ticket submission and status review.
- `/client/tickets` includes search plus status, priority, and request-type filters so clients can find past requests quickly.
- The backend now supports production client records for work items, approvals, monthly reports, roadmap recommendations, assets, billing status, and calendar items.
- Internal users can create, update, and archive those production client records through management API routes while client overview responses only expose client-visible records.
- Client portal pages now read those production records directly: work items power open tasks and completed work, approval records power the approval queue, reports power the monthly dashboard, assets extend the resource library, billing status appears on the account page when visible, and calendar records power the campaign calendar.
- Client Operations splits production-record panels across focused admin pages for adding, editing key details, updating status/visibility, and archiving work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items. Calendar items can also be permanently deleted when history should not retain them.
- Client Operations includes client team access controls for inviting new external clients, adding approved existing users, editing membership roles/status, deactivating users without losing history, and reactivating access later.
- Client Operations can archive an entire client account with typed confirmation, hiding it from client users while preserving requests, reports, files, billing notes, and history for internal review.
- Client ticket and message views now show shared next-action signals so admins and clients can see whether the team or client is expected to respond.
- Client and admin dashboards now consume the same activity history and derived action queue. Client users only see client-visible events; internal users see both client-visible and internal audit events.
- Request replies, approval decisions, billing changes, calendar scheduling/deletion, account archive/restore, work changes, and report publishing create append-only activity records.
- Client users land on `/client` after login, and authenticated client users attempting `/dashboard` are redirected back to the client portal.

## Payroll Calendar

Payroll Calendar tracks calendar events, employee time entries, and payroll review context.

### Day Review Behavior

- `/payroll-calendar?tab=calendar` opens the calendar tab; `/payroll-calendar?tab=employees&view=pending` opens pending employee review for authorized managers/admins.
- Managers/admins can use the calendar employee selector or `/payroll-calendar?tab=calendar&userId=:userId` to audit another employee's time entries.
- Manager audit controls include employee search plus start/end date filters, and the selected audit context is reflected in the URL.
- Employee audit mode hides clock-in/out controls and keeps manual entry/edit actions routed through backend payroll permissions.
- Manager-created or edited employee time entries prompt for correction notes so payroll review has context.
- Clicking a calendar date opens a day review panel in the sidebar.
- The day review panel shows total tracked time, entry count, open/closed status, time entries, and events for that date.
- Payroll QA warnings highlight missing clock-outs, overlapping entries, unusually long shifts, and zero-duration entries.
- Time entries can be edited from today's entry list or from the selected day review panel.
- Time entry deletion now opens a typed confirmation modal and stays disabled until `DELETE` is typed.
- Payroll profile compensation and banking fields are protected by backend role checks.
