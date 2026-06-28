# Features

## Dashboard

Dashboard is the command-center entry point for the portal.

- Shows role-aware metrics for today's tracked time, visible/assigned tasks, in-progress work, completed-today tasks, overdue tasks, and either pending approvals or daily-log status.
- Shows a `Needs Attention` panel with actionable items for employee approvals, payroll review warnings, overdue tasks, missing daily logs, and no tracked time.
- Employees see personal work and log actions; managers/admins see team operations signals where their role allows access.
- Quick actions are role-aware and user-customizable: users can pin up to four authorized shortcuts, with defaults adapting for employee, manager, payroll, and client-operations roles.
- Dashboard workflow links use query params to open exact states: new task modal, new daily log modal, payroll calendar tab, and pending employee approvals.
- Task attention links can open Task Tracking with overdue or in-progress filters applied.

## Global Search

The header search / command palette searches both navigation commands and authorized system records.

- Escape closes transient app surfaces such as command palette, modals, drawers, popup menus, and active task/project windows before changing underlying page state.
- Page commands and the main sidebar remain role-aware, so client users do not see internal destinations and non-payroll roles do not get payroll-management shortcuts.
- Backend global search returns only records the authenticated user can access.
- Internal users can find visible tasks, daily logs, announcements, chat messages, file-directory folders, and internal people.
- Client users can find assigned client-portal records that are active and client-visible.
- Client operations roles can find client operations records across client workspaces.
- Payroll records are finance/payroll-management scoped and are not returned to ordinary internal or client users.

## Task Tracking

Task tracking supports calendar, board, and list views for task status, assignment, timing, and progress. Board and calendar views stay in the normal page scroll so tall work focus, project, calendar, and summary sections remain reachable.

- `/task-calendar` opens the working Task Tracking calendar view instead of a placeholder page.
- The Task Tracking calendar has explicit previous/next/today/month navigation and a month picker.
- Clicking an empty calendar date opens the task creation modal with the start and due date prefilled for that day.

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
- Task projects can be created from an `Add Project` modal in Task Tracking, assigned to employee members, assigned to tasks, filtered, grouped, paused/resumed, and marked complete.
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
- Daily Log cards have a clickable comments control that expands an inline thread, lets authenticated users add comments, and lets authors delete their own comments.

### Task Import Behavior

- `/daily-logs?new=1` opens the Add Daily Log modal automatically.
- The Add Daily Log modal uses `HH:MM` hour entry and normalizes numeric input such as `8` to `08:00`.
- The Date field includes a `Today` shortcut in the label row.
- Users no longer choose a log status manually in the form; the log derives its stored status from the logged task rows.
- The Add Daily Log modal includes an `Import from Task Tracking` section.
- The import section suggests completed and in-progress tasks assigned to the logged-in user or shared with them as a collaborator/multi-assignee for the selected log date.
- Completed task suggestions use `completedAt` for the selected date; completed tasks without `completedAt` are not inferred from due or update dates.
- Review-stage tasks appear in a separate optional section, with task-session counts and tracked minutes when available.
- Suggested tasks can be imported individually or in bulk with `Import All`.
- Imported completed tasks are checked in the daily-log task list; imported in-progress tasks remain unchecked.
- Imported Task Tracking entries retain source task IDs, task statuses, and task participant summaries so saved logs can show Completed, Review, In Progress, and team-work context badges.
- Manual task entry remains available for work that was not created in Task Tracking.

### Manager Review

- Managers/admins can review team daily-log totals with summary counts for reviewed logs, completed items, blocked items, linked tasks, hours, and latest log date.
- Linked Task Tracking items show a source badge and session count in the log task list when the source task is visible.
- Review-status tasks are intentionally not imported automatically; employees can add them manually from the optional review-stage section when needed.

## File Directory

File Directory organizes internal folder and file records by department using authenticated app storage.

- File Directory is internal-only. Client users belong in client portal storage/resource workflows, not the employee file directory.
- Folder cards open internal child-folder navigation only.
- Add Folder creates one internal folder record with name, server-authorized department, and folder color.
- Upload File stores a supported file through `/api/uploads` and registers it as a file item in the selected folder. Direct external links are not exposed from file rows/cards.
- The directory includes breadcrumb navigation, search, department filtering, sort controls, and persisted grid/list view preference.
- Google Drive/Supabase-backed provider sync is not implemented until provider choice and credentials are available.

## Auth And Employee Approval

Signup creates a pending account and preserves the requested department/role without granting authorization immediately.

- Pending accounts cannot log in.
- Pending accounts have no active `UserRole` records.
- Approval deploys the employee, marks the account approved, and assigns the requested department/role.
- Approval generates a one-time setup link and emails it when email delivery is configured; the raw link is only returned to the admin when email delivery fails.
- Approval now requires an existing or requested role/department assignment; applications missing both are rejected with a clear error instead of creating approved users without roles.
- Full-access admins, project managers, operations managers, and chief operations officers can approve pending employee applications.
- Admin onboarding under `/operations/onboarding` lets admins generate approved setup links by entering an email and selecting a role. The user follows the link to set and confirm their password through the reset-password flow.

## Operations

Operations manages departments, role options, and client account administration.

- The default onboarding org chart uses these departments: Owners / Founders, Project Management, Operations, Digital Marketing, Analytics / Data, Automation / Tech, Website Developers, and Payroll / Finance.
- Default role options are maintained in the backend org catalog. Payroll employee forms read live department `availableRoles` from the backend, with frontend static helpers used only as an offline fallback.
- Role-option APIs preserve existing configured roles and add missing org-chart defaults for matching departments, so admin onboarding is not blocked by stale seed data.
- Admin Operations syncs the default org chart into persisted department and role rows so `/operations` displays the planned structure even on databases that still contain older department records.
- Department creation in Operations only asks for the department name; department cards do not expose Google Drive IDs, Drive link status, or internal department IDs.
- The Operations `Members` tab lists internal users/employees only, shows their active authorization groups, and lets full-access admins add or remove role assignments through the server-controlled user-role APIs.
- The Operations `Org Chart` tab builds a flexible manager/direct-report hierarchy from internal member reporting lines, renders it as centered tree tiers, and lets full-access admins update each member's manager.
- Department and role deletes now require a typed confirmation modal.
- The delete action stays disabled until the exact target name is typed.
- Department delete confirmation displays linked task and user-role counts when provided by the API.
- `/operations/onboarding` generates copyable setup links for approved internal users without exposing passwords to admins.
- Operations includes a `Clients` tab that lists client portal accounts separately from employees and links to the client account operations workflow.
- `/operations/clients` is the Client Operations command center for account health, open work, requests, approvals, latest updates, reports, and focused route links.
- `/operations/clients/accounts` manages client setup, website work intake type, invitations, approved existing-user access, membership status changes, account profile details, service tiers, and archive/restore controls.
- Client service tiers include the SOP-derived presets: Standard Business Website, Growth Business Website, Conversion and Local Growth System, Managed Growth Website System, and Premium Managed Growth System.
- `/operations/clients/delivery`, `/operations/clients/requests`, `/operations/clients/approvals`, `/operations/clients/reports`, `/operations/clients/assets`, `/operations/clients/billing`, `/operations/clients/roadmap`, and `/operations/clients/calendar` split client production records into focused admin work areas.
- `/operations/clients/requests` supports internal ticket triage with service staff assignment, linked project selection, internal notes, SLA labels, and next-action status labels.
- `/operations/clients/calendar` and `/operations/clients/reports` surface linked project progress so schedule/report work can show active project completion context.
- `/operations/clients/billing` now manages provider-ready client storage roots, booking requests, Stripe/Square/bank/manual payment connection readiness records, manual invoices, and monthly invoice generation from billing status.
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
- `/client/account` includes a client-facing call request form and shows visible booking requests while preserving internal-only payment/storage configuration.
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
- Employee add/edit role selectors use Operations department role options. Custom roles must be created in Operations first, then appear in payroll employee forms after the catalog refreshes.
- Employee payroll setup includes max billable hours per day and a salary divisor scheme: weekdays credited, flat 30 days, flat 20 days, or flat 160 hours.
- Payslip previews and generation show tracked hours, billable hours, and pending overtime separately. Automatic gross pay excludes time beyond the daily billable cap until a manager manually overrides or approves it.
- The Payroll Setup Wizard on the employee overview writes the same payroll profile fields used by backend payslip calculation.
- The Scheduler tab lets payroll-management users manually run payroll period advance, automatic payslip generation, department report, and client invoice generation jobs, then review recent run status.
- Vercel Cron calls `/api/scheduler/cron` on the configured schedules to run the period advance, auto-payslip, department report, and client-invoice jobs together. Production cron calls require a `CRON_SECRET` or legacy `SCHEDULER_SECRET` bearer token.

### Reporting Behavior

- Payroll-management users can filter payroll report stats and the payslip archive by department, employee, and payslip status.
- Report summary and detailed views include period navigation so payroll-management users can move between generated payroll periods without changing filters.
- Reports include department cost summaries for gross pay, deductions, net pay, payslip count, and tracked hours.
- The frontend Reports tab exposes CSV exports for filtered payslip archives and department cost summaries, plus batch ZIP downloads that bundle report CSVs with a manifest.
- Payslip archive rows include employee email, department, role/title, tracked hours, gross pay, deductions, net pay, and period/status context.

## Announcements

Announcements centralize company updates, shoutouts, events, and birthdays for internal users.

- Category cards filter the feed by Company News, Shoutouts, Events, or Birthdays and show current post counts.
- The category tab row uses the same filters, includes Birthdays, resets pagination on filter changes, and reflects the active filter in the `category` URL query parameter.
- Management users can create custom announcement types; custom categories are normalized into URL-safe slugs, appear as filter cards/tabs, and keep the same management permissions as built-in announcement types.
- Event announcements use separate date and time controls while storing the same event timestamp payload.
- Empty filtered states let users return to all posts without losing the announcement page context.
- Management users can create, edit, and delete announcements from the announcement feed; non-management users keep read, like, comment, and RSVP actions without seeing management-only controls. Event RSVP can be toggled between going and not going from the event card.

## Whiteboard

Whiteboard is an admin-only local brainstorming canvas.

- Tools include pencil, eraser, line, rectangle, and circle.
- The canvas autosaves the latest draft locally in the browser and restores it on return.
- Undo, clear, and PNG export actions are available from the toolbar.
- Whiteboard work is not shared or synced to backend storage until a persistence/sharing product spec is defined.

## Company Chat

Company Chat supports internal direct messages, group/channel conversations, realtime updates, and message correction.

- Conversations can be archived per user from the chat sidebar without deleting message history, restored from an Archived view, and automatically return to Active when new messages are sent.
- The new-message and channel member pickers group people by Operations org-chart relationships: manager, direct reports, team peers, and company directory.
- Users can edit or delete their own messages.
- Users can attach files, images, and GIFs through the message composer.
- The composer includes expandable quick emoji insertion.
- Messages support stored quick reactions; reaction chips show counts and can be toggled by conversation participants, while quick reaction shortcuts expand from a side action button beside each message bubble.
- Reactions are broadcast through the same conversation room as message events.

## Notifications

Notifications combine REST-derived history with live Socket.io events.

- The header notification drawer supports marking individual notifications read, marking all read, clearing local notifications, and following notification links.
- Read notification IDs remain locally persisted in the browser.
- Browser alert preferences are stored per user in localStorage and respect the browser's Notification permission state.
- Users can enable or disable browser alerts and mute live notification categories for info, success, warning, and error alerts.
- Notification records are currently derived from existing announcements, tasks, and chat activity; there is no dedicated durable Notification table in Prisma.
