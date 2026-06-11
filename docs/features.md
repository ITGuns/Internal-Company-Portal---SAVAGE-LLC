# Features

## Dashboard

Dashboard is the command-center entry point for the portal.

- Shows role-aware metrics for today's tracked time, visible/assigned tasks, in-progress work, completed-today tasks, overdue tasks, and either pending approvals or daily-log status.
- Shows a `Needs Attention` panel with actionable items for employee approvals, payroll review warnings, overdue tasks, missing daily logs, and no tracked time.
- Employees see personal work and log actions; managers/admins see team operations signals where their role allows access.
- Quick actions route users directly to task tracking, daily logs, payroll review, and either approvals or announcements.
- Dashboard workflow links use query params to open exact states: new task modal, new daily log modal, payroll calendar tab, and pending employee approvals.
- Task attention links can open Task Tracking with overdue or in-progress filters applied.

## Global Search

The header search / command palette searches both navigation commands and authorized system records.

- Page commands and the main sidebar remain role-aware, so client users do not see internal destinations and non-payroll roles do not get payroll-management shortcuts.
- Backend global search returns only records the authenticated user can access.
- Internal users can find visible tasks, daily logs, announcements, chat messages, file-directory folders, and internal people.
- Client users can find assigned client-portal records that are active and client-visible.
- Client operations roles can find client operations records across client workspaces.
- Payroll records are finance/payroll-management scoped and are not returned to ordinary internal or client users.

## Task Tracking

Task tracking supports calendar, board, and list views for task status, assignment, timing, and progress. Board and calendar views stay in the normal page scroll so tall work focus, project, calendar, and summary sections remain reachable.

### Assignment Behavior

- Employees create tasks for themselves by default.
- `/task-tracking?new=1` opens the new-task modal automatically.
- `/task-tracking?filter=overdue` and `/task-tracking?filter=in_progress` open filtered task views from Dashboard.
- Dashboard-driven task filters show a visible filter banner with the active filter, result count, and a `Clear filter` action.
- `/task-tracking?task=:taskId` opens a specific task detail modal when the authenticated user can read it.
- Unavailable, deleted, or unauthorized task detail links show an inline warning instead of failing silently.
- Employee-created tasks derive assignee, department, and role from the employee's assigned `UserRole`.
- Employees do not manually choose their own assignee or role in the task modal.
- Full-access admins, project managers, operations managers, and chief operations officers can assign tasks to other employees.
- Manager/admin assignment controls include an `Assign to me` shortcut.
- Task forms do not collect department manually; selecting an assignee uses that employee's primary account department and role.
- New task records store `createdById` separately from `assigneeId`, so requester visibility no longer depends only on assignment.
- Task role options come from backend department `availableRoles` instead of frontend-only constants.
- Manager/admin task forms can invite additional employee collaborators while preserving the primary assignee.
- Collaborator chips appear on task cards/list rows, and task details show the invited collaborator names.
- Task projects can be created in Task Tracking, assigned to tasks, filtered, grouped, paused/resumed, and marked complete.
- Clicking a task project card filters the task list to that project; clicking the selected card again, pressing Esc, or using `Back to all tasks` clears the project view.
- Opening the Project Organization panel expands a project overview dialog with per-project analytics for completion, open work, review load, overdue work, due-today work, estimates, tracked time, and target-date risk.
- Project assignment appears on task cards, list rows, detail modals, calendar/report data, and exported Deskii task reports.
- Start and due date fields use segmented day/month/year inputs with `Today` shortcuts that move focus forward as the user completes each segment.
- Task estimates use `HH:MM` input in the modal while the API continues storing estimated time as total minutes.
- Task search matches task title, description, status, priority, notes, project, department, assignee, creator, and collaborators.
- Work Focus can stay automatic or be pinned to a selected task per user.

### Detail And Work History

- Clicking a task in board, list, or calendar view opens a read-first detail modal.
- The detail modal shows assignment, department/role, dates, progress, tracked time, estimated time, remaining or over-estimate time, and session count.
- The detail modal includes quick actions to start or pause the task timer, mark open tasks done, and reopen completed tasks.
- Work history lists recorded timer sessions with worker, start/end time, and duration.
- Editing remains available through the detail modal's `Edit Task` action.
- `Generate EOD Report` can post the selected period summary directly into Daily Logs, using structured linked task objects and optional shift notes.

## Daily Logs

Daily logs track EOD, weekly, and monthly work summaries by date, department, task-derived status, HH:MM hours, task list, and shift notes.

- Employee logs use the department assigned to the employee account.
- Full-access admins, project managers, operations managers, and chief operations officers can review or override log departments when their access allows it.
- Task Tracking report posts create real Daily Log records and refresh Daily Logs after submission.

### Task Import Behavior

- `/daily-logs?new=1` opens the Add Daily Log modal automatically.
- The Add Daily Log modal uses `HH:MM` hour entry and normalizes numeric input such as `8` to `08:00`.
- The Date field includes a `Today` shortcut in the label row.
- Users no longer choose a log status manually in the form; the log derives its stored status from the logged task rows.
- The Add Daily Log modal includes an `Import from Task Tracking` section.
- The import section suggests completed and in-progress tasks assigned to the logged-in user for the selected log date.
- Completed task suggestions use `completedAt` for the selected date; completed tasks without `completedAt` are not inferred from due or update dates.
- Review-stage tasks appear in a separate optional section, with task-session counts and tracked minutes when available.
- Suggested tasks can be imported individually or in bulk with `Import All`.
- Imported completed tasks are checked in the daily-log task list; imported in-progress tasks remain unchecked.
- Imported Task Tracking entries retain source task IDs and task statuses so saved logs can show Completed, Review, or In Progress badges.
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
- Full-access admins, project managers, operations managers, and chief operations officers can approve pending employee applications.
- Admin onboarding under `/operations/onboarding` lets admins generate approved setup links by entering an email and selecting a role. The user follows the link to set and confirm their password through the reset-password flow.

## Operations

Operations manages departments, role options, and client account administration.

- The default onboarding org chart uses these departments: Owners / Founders, Project Management, Operations, Digital Marketing, Analytics / Data, Automation / Tech, Website Developers, and Payroll / Finance.
- Default role options are maintained in the backend org catalog and mirrored in frontend static department helpers for payroll/file-directory forms.
- Role-option APIs preserve existing configured roles and add missing org-chart defaults for matching departments, so admin onboarding is not blocked by stale seed data.
- Admin Operations syncs the default org chart into persisted department and role rows so `/operations` displays the planned structure even on databases that still contain older department records.
- Department creation in Operations only asks for the department name; department cards do not expose Google Drive IDs, Drive link status, or internal department IDs.
- The Operations `Members` tab lists internal users/employees, shows their active authorization groups, and lets full-access admins add or remove role assignments through the server-controlled user-role APIs.
- The Operations `Org Chart` tab builds a flexible manager/direct-report hierarchy from member reporting lines, renders it as centered tree tiers, and lets full-access admins update each member's manager.
- Department and role deletes now require a typed confirmation modal.
- The delete action stays disabled until the exact target name is typed.
- Department delete confirmation displays linked task and user-role counts when provided by the API.
- `/operations/onboarding` generates copyable setup links for approved internal users without exposing passwords to admins.
- Operations includes a `Clients` tab that links to the client operations command center.
- `/operations/clients` is the Client Operations command center for account health, open work, requests, approvals, latest updates, reports, and focused route links.
- `/operations/clients/accounts` manages client setup, website work intake type, invitations, approved existing-user access, membership status changes, account profile details, service tiers, and archive/restore controls.
- Client service tiers include the SOP-derived presets: Standard Business Website, Growth Business Website, Conversion and Local Growth System, Managed Growth Website System, and Premium Managed Growth System.
- `/operations/clients/delivery`, `/operations/clients/requests`, `/operations/clients/approvals`, `/operations/clients/reports`, `/operations/clients/assets`, `/operations/clients/billing`, `/operations/clients/roadmap`, and `/operations/clients/calendar` split client production records into focused admin work areas.
- Client Operations separates current client accounts from archived history so removed clients do not crowd the active working list.
- Detailed admin/client adoption workflows are documented in `docs/admin-client-workflows.md`.

## Client Portal Foundation

MyDeskii includes the backend and frontend foundation for a client-facing portal inside the existing internal app.

- Client portal records are grouped under `ClientOrganization`.
- Client users are scoped through active `ClientMembership` records on active client organizations and cannot see other organizations or archived clients.
- Internal full-access, management, and website-delivery users can create client organizations, manage service tiers, delete unused tiers, invite client contacts, assign existing approved users, and review cross-client portal data.
- Client-facing serializers omit internal organization notes, raw tier IDs, internal tier price/priority, ticket assignment fields, internal ticket comments, and inactive client memberships.
- `/client` is the client command center for assigned clients.
- `/client/work`, `/client/approvals`, `/client/messages`, `/client/reports`, `/client/resources`, `/client/account`, `/client/calendar`, and `/client/tickets` provide focused client-facing work, approval, communication, reporting, resource, account, schedule, and request surfaces.
- Client overview responses only expose records marked visible to clients and allowed by membership.
- Client and admin dashboards consume shared activity history and derived action queues; client users only see client-visible events, while internal users can review both client-visible and internal audit events.
- Request replies, approval decisions, billing changes, service tier assignment changes, calendar scheduling/deletion, account archive/restore, work changes, and report publishing create append-only activity records.
- Client users land on `/client` after login, and authenticated client users attempting `/dashboard` are redirected back to the client portal.
- Detailed admin and client operating directions live in `docs/client-portal-workflows.md`.

## Payroll Calendar

Payroll Calendar tracks calendar events, employee time entries, and payroll review context.

### Day Review Behavior

- `/payroll-calendar?tab=calendar` opens the calendar tab; `/payroll-calendar?tab=employees&view=pending` opens pending employee review for authorized managers/admins.
- Payroll-management users can use the calendar employee selector or `/payroll-calendar?tab=calendar&userId=:userId` to audit another employee's time entries.
- Payroll-management audit controls show the current audited employee/date range, keep selected employees visible while searching, include `Today` shortcuts and reset, and reflect `userId`, `start`, and `end` filters in the URL.
- Employee audit mode hides clock-in/out controls and keeps manual entry/edit actions routed through backend payroll permissions.
- Manager-created or edited employee time entries prompt for correction notes so payroll review has context.
- Clicking a calendar date opens a day review panel in the sidebar.
- The day review panel shows total tracked time, entry count, open/closed status, time entries, and events for that date.
- Payroll QA warnings highlight missing clock-outs, overlapping entries, unusually long shifts, and zero-duration entries.
- Time entries can be edited from today's entry list or from the selected day review panel.
- Time entry deletion now opens a typed confirmation modal and stays disabled until `DELETE` is typed.
- Payroll profile compensation and banking fields are protected by backend role checks.
- Employee payroll setup includes max billable hours per day and a salary divisor scheme: weekdays credited, flat 30 days, flat 20 days, or flat 160 hours.
- Payslip previews and generation show tracked hours, billable hours, and pending overtime separately. Automatic gross pay excludes time beyond the daily billable cap until a manager manually overrides or approves it.

## Announcements

Announcements centralize company updates, shoutouts, events, and birthdays for internal users.

- Category cards filter the feed by Company News, Shoutouts, Events, or Birthdays and show current post counts.
- The category tab row uses the same filters, includes Birthdays, resets pagination on filter changes, and reflects the active filter in the `category` URL query parameter.
- Empty filtered states let users return to all posts without losing the announcement page context.

## Company Chat

Company Chat supports internal direct messages, group/channel conversations, realtime updates, and message correction.

- Users can edit or delete their own messages.
- Users can attach files, images, and GIFs through the message composer.
- The composer includes expandable quick emoji insertion.
- Messages support stored quick reactions; reaction chips show counts and can be toggled by conversation participants, while quick reaction shortcuts expand from a side action button beside each message bubble.
- Reactions are broadcast through the same conversation room as message events.
