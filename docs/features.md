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

Operations manages departments, role options, and the backend foundation for client account administration.

- Department and role deletes now require a typed confirmation modal.
- The delete action stays disabled until the exact target name is typed.
- Department delete confirmation displays linked task and user-role counts when provided by the API.

## Client Portal Foundation

Deskii now has the backend foundation for a client-facing portal/tool inside the existing internal app.

- Client portal records are grouped under `ClientOrganization`.
- Client users are scoped through active `ClientMembership` records and cannot see other client organizations.
- Internal managers/admins can create client organizations and review cross-client portal data.
- Client overview data can include projects, tickets, updates, performance metrics, and resource links.
- Ticket creation derives organization and requester ownership server-side, so clients cannot spoof tenant, assignment, or internal fields.
- Internal ticket comments, project notes, tier pricing/priority, and other protected fields are stripped from client-visible responses.

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
