# Development Notes

## 2026-06-11 - Escape Closes Popup Windows

### Completed

- Added a reusable Escape-close layer so the newest open popup, modal, drawer, or menu closes first.
- Wired Escape dismissal into shared modals, custom task/report/payslip dialogs, profile and notification drawers, mobile sidebar, command palette, task display menu, announcement menu, chat search, chat reactions, and the profile phone-code picker.
- Added unit coverage for the Escape layer stack order.

### Files Changed

- `frontend/src/hooks/useEscapeToClose.ts`
- `frontend/src/lib/escape-layer-stack.ts`
- `frontend/tests/escape-layer-stack.test.mjs`
- `frontend/src/hooks/useDialogA11y.ts`
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/NotificationSidebar.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/ProfilePhoneInput.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/tasks/LogReportModal.tsx`
- `frontend/src/components/tasks/ProjectOverviewModal.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/components/payroll/EmployeeOverviewTab.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/app/announcements/page.tsx`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/app/my-payslips/page.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Centralized Escape handling so nested transient surfaces close the topmost layer first instead of each component adding unrelated document listeners.
- Kept existing button/backdrop close behavior unchanged.

### How to Test

- Open task detail, report, payslip, notification/profile drawers, command palette, chat search/reactions, and announcement/task menus, then press `Esc` to confirm only the active surface closes.
- Open a project task filter without another popup and press `Esc` to confirm it still exits the project view.

## 2026-06-11 - Task Detail Quick Actions

### Completed

- Added simple quick action buttons to the task detail modal.
- Open tasks now expose `Start` or `Pause` based on timer state plus `Done`.
- Completed tasks keep the existing `Reopen Task` action.

### Files Changed

- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Reused the existing task action handler and `TASK_QUICK_ACTION_LABELS` so detail actions stay consistent with list and board actions.
- Kept `Pause` state-driven because pausing is only meaningful while the timer is running.

### How to Test

- Open `/task-tracking`, click an open task, and confirm the detail modal shows `Start` and `Done`.
- Start the task and confirm the detail modal changes to `Pause` and `Done`.
- Mark the task done and confirm the completed detail action becomes `Reopen Task`.

## 2026-06-11 - Payroll Audit Date Icon Cleanup

### Completed

- Removed the extra custom calendar icons from the Time Entry Audit `From` and `To` date inputs.
- Let the native browser date picker icon be the only calendar affordance in those controls.

### Files Changed

- `frontend/src/components/payroll/PayrollAuditFilterBar.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Date inputs should not layer a decorative icon over the native date picker control.
- The existing `Today` shortcuts remain beside each date label.

### How to Test

- Open `/payroll-calendar?tab=calendar` as a payroll-management user and confirm each audit date field shows only one calendar icon.
- Use the `Today` buttons and confirm the date fields still update.

## 2026-06-11 - Dashboard Skip Link Removal

### Completed

- Removed the floating `Skip to main content` link from the app shell.
- Removed the now-unused global `.skip-link` styling.

### Files Changed

- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/app/globals.css`
- `docs/dev-notes.md`

### Decisions Made

- The shell should not show a floating skip control over the branded sidebar/header.
- The existing `main-content` container remains as the stable content target for layout and focus behavior.

### How to Test

- Open `/dashboard` and confirm no `Skip to main content` button appears over the sidebar.
- Navigate protected shell pages and confirm the sidebar/header layout is unchanged.

## 2026-06-11 - Auth Refresh Shell Guard

### Completed

- Moved the authenticated workspace shell behind the auth guard so the sidebar does not render before identity is known.
- Replaced the protected-route loading header fallback with a neutral account-access loading state.
- Stopped rendering protected workspace content during loading when only a stored token exists and no user snapshot is available.

### Files Changed

- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/AuthLoadingState.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `docs/dev-notes.md`

### Decisions Made

- A stored token alone is not enough to render role-gated navigation; the workspace shell needs a user snapshot first.
- Anonymous or stale sessions should redirect to login instead of briefly showing a Guest workspace.

### How to Test

- Hard refresh `/dashboard` with an admin session and confirm admin sidebar items remain visible.
- Clear auth storage or use an expired token, then open `/dashboard` and confirm it routes to login without a Guest workspace shell.

## 2026-06-11 - Operations Department Drive Metadata Removal

### Completed

- Removed the Google Drive ID field from the Operations department create form.
- Changed department creation to submit only the department name.
- Removed internal department IDs and GDrive/No Drive status text from department cards.
- Added a focused payload helper test to prevent Drive metadata from returning to the create flow.

### Files Changed

- `frontend/src/app/operations/page.tsx`
- `frontend/src/lib/operations-data.ts`
- `frontend/tests/operations-data.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Left backend `driveId` compatibility intact because existing records and API serializers may still contain it.
- Kept department cards useful with role/task counts instead of Drive metadata.

### How to Test

- Open `/operations`, choose `Departments`, and confirm cards show no internal ID, `GDrive Linked`, or `No Drive ID` copy.
- Click `Add Department`, confirm the form only asks for the department name, and create a department.

## 2026-06-11 - Chat Sidebar Delete Button Polish

### Completed

- Replaced the oversized circular chat sidebar delete buttons with compact square icon actions.
- Made channel and direct-message delete controls share one subtle class helper.
- Kept destructive red styling for hover/focus instead of showing a full red or white blob by default.

### Files Changed

- `frontend/src/components/chat/ChatSidebar.tsx`
- `frontend/src/lib/chat-sidebar-layout.ts`
- `frontend/tests/chat-sidebar-layout.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept delete buttons hidden until row hover or keyboard focus so the sidebar remains scannable.
- Preserved existing delete behavior and confirmation flow; this is visual/control polish only.

### How to Test

- Open `/chat`, hover a channel or direct-message row, and confirm the delete action appears as a small subtle icon button.
- Focus the delete button by keyboard and confirm the visible focus ring and confirmation flow still work.

## 2026-06-11 - Chat Message Reaction Side Actions

### Completed

- Moved each message quick-reaction trigger from the lower reaction row to a side action rail beside the message bubble.
- Kept stored reaction chips below the message only when a message has actual reaction counts.
- Added a focused helper and test for outgoing vs teammate message action placement.

### Files Changed

- `frontend/src/app/chat/page.tsx`
- `frontend/src/lib/chat-message-layout.ts`
- `frontend/tests/chat-message-layout.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Preserved the existing quick reaction set and `toggleMessageReaction` API contract.
- Kept own-message edit/delete actions in the same side rail, with the reaction trigger visible beside the bubble.

### How to Test

- Open `/chat`, select a conversation, and confirm the reaction button sits beside each message bubble instead of below it.
- Click the side reaction button, choose a quick reaction, and confirm the reaction chip/count appears below the message.
- Confirm Escape closes the quick reaction picker.

## 2026-06-11 - Announcement Category Filters

### Completed

- Made the top announcement category cards functional filter buttons.
- Added shared announcement filter helper logic for category options, URL parsing, filtering, and post counts.
- Synced announcement filters to the `category` URL query parameter and added Birthdays to the lower filter tab row.

### Files Changed

- `frontend/src/app/announcements/page.tsx`
- `frontend/src/lib/announcement-filters.ts`
- `frontend/tests/announcement-filters.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Used real `<button>` elements for the category cards so click, keyboard, focus, and pressed state behave like controls.
- Kept filtering frontend-side because the page already fetches the authenticated announcement list and filters it locally.

### How to Test

- Open `/announcements`, click each category card, and confirm the feed, tab row, counts, and `category` URL query update.
- Use `All Posts` or an empty filtered state action to clear the filter.
- Run `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and focused visual smoke for `/announcements`.

## 2026-06-11 - Payroll Audit Filter Bar

### Completed

- Replaced the vague inline `Employee Audit` controls with a dedicated `Time Entry Audit` filter bar on Payroll Calendar.
- Added current audit summary text, employee search preservation for the selected employee, date `Today` shortcuts, date-range warning, and reset action.
- Kept the existing URL-driven `userId`, `start`, and `end` query behavior so payroll-management users can deep-link audits.

### Files Changed

- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/components/payroll/PayrollAuditFilterBar.tsx`
- `frontend/src/lib/payroll-calendar/audit-target.ts`
- `frontend/tests/payroll-audit-target.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the audit feature because it is functional: the selected employee and date range feed `usePayrollData`, which requests scoped payroll time entries from the backend.
- Moved audit UI into a focused payroll component so the page continues to own state and URL updates without carrying all filter markup inline.

### How to Test

- Open `/payroll-calendar?tab=calendar`, confirm payroll-management users see `Time Entry Audit` with employee search, `Auditing`, `From`, and `To` controls.
- Search/select an employee, use `Today` for either date, and confirm the URL updates with `userId`, `start`, and `end`.
- Run `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and focused visual smoke for `/payroll-calendar`.

## 2026-06-11 - Operations Org Chart Tree Layout

### Completed

- Changed the Operations Org Chart tab from nested vertical rows to centered hierarchy tiers that widen downward.
- Added reusable org-chart helper logic for tree building, row flattening, search-aware hierarchy display, and descendant checks.
- Kept manager assignment controls on each member node while preventing descendant/self manager options.

### Files Changed

- `frontend/src/components/operations/OperationsOrgChartPanel.tsx`
- `frontend/src/lib/operations-org-chart.ts`
- `frontend/tests/operations-org-chart.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Treated members with no manager or a missing manager as top-level roots so the chart remains flexible while reporting lines are still being cleaned up.
- Kept the layout CSS-first with existing tokens and motion primitives, avoiding a charting dependency for this format-only change.

### How to Test

- Open `/operations`, choose `Org Chart`, and confirm members render in centered levels rather than a vertical list.
- Change a member's `Reports to` field and confirm the card moves into the next tier after refresh.
- Run `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and focused visual smoke for `/operations`.

## 2026-06-11 - Daily Log HH:MM And Task-Derived Status

### Completed

- Changed the Daily Log hours input from a number spinner to an `HH:MM` text input with blur normalization.
- Added a `Today` action to the Daily Log date field label row.
- Removed the manual Daily Log status field from the add/edit form.
- Preserved Task Tracking status metadata on imported Daily Log tasks and displayed task status badges in logs.
- Derived the saved Daily Log status from logged task rows.

### Files Changed

- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/components/forms/FormField.tsx`
- `frontend/src/components/ui/StatusBadge.tsx`
- `frontend/src/lib/daily-log-format.ts`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/src/lib/daily-logs.ts`
- `frontend/tests/daily-log-format.test.mjs`
- `frontend/tests/daily-log-task-import.test.mjs`
- `docs/features.md`
- `docs/api.md`
- `docs/database.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the backend Daily Log status contract intact, but made the frontend derive it from task state.
- Kept review-stage tasks separate from bulk import while preserving their status if the user adds them.

### How to Test

- Open `/daily-logs`, click `Add Log`, confirm `Hours Logged` uses `HH:MM`, `Date` has `Today`, and the form has no manual Status selector.
- Import or add tasks, confirm task badges show Completed, Review, or In Progress, then save and verify the submitted log status follows the task rows.
- Run `npm --prefix frontend test`, `npm --prefix frontend run lint`, and `npm --prefix frontend run build`.

## 2026-06-11 - Neutral Form Backdrops

### Completed

- Added a shared `portal-form-backdrop` utility for neutral dark scrims with stronger backdrop blur.
- Replaced hardcoded light, gray, and black modal overlays across task, chat, payroll, command palette, side drawers, approval, and shared modal surfaces.
- Darkened the light-theme scrim token so forms no longer sit over a pale washed-out layer.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/tasks/ProjectOverviewModal.tsx`
- `frontend/src/components/tasks/LogReportModal.tsx`
- `frontend/src/components/chat/NewChatModal.tsx`
- `frontend/src/components/chat/CreateChannelModal.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/NotificationSidebar.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/payroll/EmployeeOverviewTab.tsx`
- `frontend/src/app/my-payslips/page.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Centralized backdrop styling in CSS instead of repeating opacity and blur values per modal.
- Kept modal panels and form fields unchanged; only the layer behind overlays changed.

### How to Test

- Open `/task-tracking?new=1`, command palette, chat create modals, and a shared `Modal` route and confirm the backdrop is neutral/dark blur, not a light gray wash.
- Run visual smoke against task, chat, announcements, payroll, and profile-adjacent routes.

## 2026-06-11 - Task Modal Account Assignment

### Completed

- Removed the visible Department selector and quick-add department control from the Task Tracking task modal.
- Kept task create/update payloads populated from the selected assignee's account department and role.
- Added manager/admin helper copy that shows whether the selected assignee has a usable account assignment.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Department and role remain part of the task API contract, but the form no longer asks users to choose them manually.
- If an assignee account has no department/role assignment, task creation stops with account-assignment guidance instead of allowing stale form state.

### How to Test

- Open `/task-tracking?new=1`, confirm the task modal has no Department field, select an assignee, and confirm the account assignment hint appears.
- Submit a task and confirm the payload still includes the selected assignee's account department and role.

## 2026-06-11 - Task Modal Date And Estimate Inputs

### Completed

- Replaced the task modal ETOC number/unit controls with a single `HH:MM` input.
- Added `Today` shortcut buttons beside both start date and due date segmented inputs.
- Added shared estimate helpers and tests for `HH:MM` formatting/parsing while preserving minute-based task payloads.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/lib/task-estimate.ts`
- `frontend/tests/task-estimate.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept backend/API task estimates in total minutes and only changed the modal entry format.
- Kept date values as `YYYY-MM-DD`; `Today` buttons simply populate the existing segmented date state.

### How to Test

- Open `/task-tracking?new=1`, click both `Today` buttons, enter ETOC as `01:30`, and submit.
- Confirm the task payload stores `estimatedTime: 90` with today's start and due dates.

## 2026-06-11 - Task Tracking Board And Calendar Scroll

### Completed

- Removed the fixed-height Task Tracking page trap that clipped the board and calendar views.
- Let the Task Tracking page scroll normally while keeping kanban columns horizontally scrollable.
- Gave board columns stable minimum height and capped long column bodies with their own scroll.
- Let the calendar and its summary cards remain reachable below the fold.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskCalendarView.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept task data, filters, project behavior, and FullCalendar contracts unchanged.
- Used page-level vertical scrolling for the route because Work Focus and Project Organization can make the task views taller than a single viewport.

### How to Test

- Open `/task-tracking`, switch to card view, and confirm the kanban columns are not clipped and the page can scroll down.
- Switch to calendar view, scroll below the calendar, and confirm the due-today, overdue, and overview cards are reachable.

## 2026-06-11 - Expandable Chat Emoji Controls

### Completed

- Collapsed per-message quick reactions behind one compact expandable reaction button.
- Kept stored reaction chips visible so participants can still see and toggle actual reaction counts.
- Collapsed composer quick emoji shortcuts behind the smile button with outside-click and Escape dismissal.

### Files Changed

- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the existing quick reaction set and `toggleMessageReaction` API contract unchanged.
- Avoided adding an emoji-picker dependency until a separate source review is needed for a full emoji/GIF library.

### How to Test

- Open `/chat`, select a conversation, click a message reaction button, confirm the quick reaction row expands and closes after selection or Escape.
- Click the composer smile button, confirm the emoji shortcuts expand, insert into the message input, and dismiss on outside click or Escape.

## 2026-06-11 - Expanded Project Overview Analytics

### Completed

- Added an expanded Project Overview dialog from the Task Tracking Project Organization panel.
- Added per-project analytics for completion, open tasks, review tasks, overdue work, due-today work, estimates, tracked time, and target-date risk.
- Kept existing project-card task filtering and project status actions intact.
- Added unit coverage for project analytics calculations.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/ProjectOverviewModal.tsx`
- `frontend/src/components/tasks/ProjectAnalyticsCard.tsx`
- `frontend/src/components/tasks/ProjectOverviewMetric.tsx`
- `frontend/src/lib/task-project-analytics.ts`
- `frontend/tests/task-project-analytics.test.mjs`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept analytics client-side because the page already loads the required `projects` and `tasks` data.
- Capped the expanded project list at 48 visible project cards to avoid turning the modal into an unbounded large-list render.

### How to Test

- Open `/task-tracking`, click the Project Organization header or empty panel surface, confirm the expanded overview opens, project analytics render, project task-view toggles still work, and Esc closes the overview.

## 2026-06-11 - Neutral Task Detail Backdrop

### Completed

- Replaced the hardcoded light task detail overlay with the shared neutral scrim token and a restrained backdrop blur.

### Files Changed

- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Used `--scrim` instead of a route-specific gray so the modal backdrop stays aligned with the active theme.

### How to Test

- Open `/task-tracking`, open any task detail popup, and confirm the background dims neutrally without the white washed-out blur.

## 2026-06-11 - Project Card Task View Toggle

### Completed

- Changed Task Tracking project cards so clicking the card opens that project's task view.
- Clicking the selected project card again now returns to all tasks.
- Added Escape-key support to clear the active project task view when no task modal, detail modal, EOD modal, or display menu is open.
- Preserved project action buttons so Complete, Pause, Reopen, and Resume do not trigger the card filter.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Reused the existing `filterProjectId` state instead of adding a second project-view state.
- Kept the visible `Back to all tasks` banner as an explicit escape hatch while making the card itself the main toggle target.

### How to Test

- `npm --prefix frontend run lint`
- `npm --prefix frontend test`
- Open `/task-tracking`, click a project card, confirm only that project's tasks are shown, click the same card again, then repeat with Esc.

## 2026-06-10 - Authorization-Aware Global Search

### Completed

- Added authenticated `GET /api/search` to search permitted tasks, daily logs, announcements, chat messages, files, people, client records, and payroll records.
- Wired the header command palette to debounce backend global search and merge authorized record results with page commands.
- Restricted payroll-management page commands and payroll record results to payroll-management roles or configured admin emails.
- Restricted the main sidebar Payroll Calendar destination to payroll-management roles; employee payslips remain available through My Payslips.
- Kept client users scoped to active assigned client organizations and client-visible records.

### Files Changed

- `backend/src/main.ts`
- `backend/src/search/search.access.ts`
- `backend/src/search/search.clients.ts`
- `backend/src/search/search.controller.ts`
- `backend/src/search/search.internal.ts`
- `backend/src/search/search.payroll.ts`
- `backend/src/search/search.service.ts`
- `backend/src/search/search.types.ts`
- `backend/src/search/search.utils.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/search.access.test.ts`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/global-search.ts`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Search authorization is enforced server-side instead of trusting the frontend command palette.
- Payroll search is treated as finance/payroll-management scope; ordinary employees can still search safe internal records but cannot discover payroll records through global search.

### How to Test

- `node -r ts-node/register tests/search.access.test.ts`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend run lint`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:visual` with `VISUAL_SMOKE_BASE_URL=http://127.0.0.1:3001` and `VISUAL_SMOKE_ROUTES=/profile`
- Open the command palette and search as admin, employee, and client personas to confirm results match authorization.

### Next Steps

- Add record-specific deep links for daily-log and chat-message results if those pages gain detail-route support.

## 2026-06-10 - Daily Log Department Field Removal

### Completed

- Removed the Department selector from the Add/Edit Daily Log modal.
- Changed daily-log create requests to omit department so the backend derives it from the authenticated user's assigned role.
- Stopped daily-log edits from resubmitting department while keeping department display and filtering for stored logs.

### Files Changed

- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/lib/daily-logs.ts`
- `frontend/src/hooks/useDailyLogsQuery.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept the backend as the source of truth for daily-log department assignment.
- Preserved department filters because managers still need to review stored logs by department.

### How to Test

- `npm --prefix frontend run lint`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_BASE_URL=http://127.0.0.1:3001 VISUAL_SMOKE_ROUTES=/daily-logs VISUAL_SMOKE_THEMES=dark npm --prefix frontend run test:visual`

### Next Steps

- None.

## 2026-06-10 - Feedback Batch Review Fixes

### Completed

- Centralized client-only role detection and excluded client-only accounts from deployed employee lists and bulk payslip generation.
- Added payroll-management authorization to payroll event create, update, and delete routes.
- Increased smoke-flagged touch targets on task project actions, task status filters, chat reactions, profile editor close, and segmented birthday inputs.
- Reworked the selected payroll employee card to use accent foreground text instead of low-contrast white text on cyan.

### Files Changed

- `backend/src/org/org-access-policy.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/employees/employees.security.ts`
- `backend/src/employees/employees.service.ts`
- `backend/src/payroll/payroll.controller.ts`
- `backend/src/payroll/payroll.service.ts`
- `backend/tests/employees.security.test.ts`
- `backend/tests/payroll.permissions.test.ts`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/components/forms/SegmentedDateInput.tsx`
- `frontend/src/components/payroll/EmployeeSidebarItem.tsx`
- `docs/api.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the privacy boundary server-side so hidden frontend controls are not the source of truth.
- Treated client-only accounts as users with only client roles or client memberships; mixed internal/client-role users remain internal.
- Kept the visual fixes scoped to accessibility regressions instead of redesigning the affected pages.

### How to Test

- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES=/task-tracking,/chat,/profile,/payroll-calendar npm --prefix frontend run test:visual`

### Next Steps

- Keep client portal users confined to `/client` and admin client navigation as new workflows are added.

## 2026-06-10 - Feedback Batch Phase 4

### Completed

- Added payroll setup fields for `payrollScheme` and `maxBillableHoursPerDay` with additive migration `202606100003_payroll_schemes`.
- Updated payslip preview/generation to separate tracked hours, billable hours, and pending overtime; automatic gross pay now uses billable hours after the daily cap.
- Surfaced payroll scheme and daily billable cap in employee edit/profile and payslip generation UI.
- Added additive `MessageReaction` schema/migration plus authenticated chat reaction toggling and realtime `chat:reaction_updated` broadcasts.
- Added quick emoji insertion and visible image/GIF attachment affordance in the chat composer.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606100003_payroll_schemes/migration.sql`
- `backend/prisma/migrations/202606100004_chat_message_reactions/migration.sql`
- `backend/src/payroll/payroll.controller.ts`
- `backend/src/payroll/payroll.permissions.ts`
- `backend/src/payroll/payroll.service.ts`
- `backend/src/chat/chat.controller.ts`
- `backend/src/chat/chat.limits.ts`
- `backend/src/chat/chat.service.ts`
- `backend/src/employees/employees.security.ts`
- `backend/src/users/users.controller.ts`
- `backend/tests/chat.limits.test.ts`
- `backend/tests/employees.security.test.ts`
- `backend/tests/payroll.permissions.test.ts`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/components/payroll/EmployeeEditModal.tsx`
- `frontend/src/components/payroll/EmployeeProfilePanel.tsx`
- `frontend/src/components/payroll/GeneratePayslipModal.tsx`
- `frontend/src/lib/chat.ts`
- `frontend/src/lib/payroll-calendar/types.ts`
- `frontend/src/lib/types/api.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept overtime approval as an explicit later workflow; this slice prevents overtime from silently becoming billable by separating pending overtime in previews and generated items.
- Restricted chat reactions to a built-in quick reaction set for this deploy instead of adding a third-party emoji/GIF dependency without source review.
- Kept message reactions scoped to conversation participants through backend authorization, not frontend-only controls.

### How to Test

- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npx prisma generate --schema backend/prisma/schema.prisma`
- `npm --prefix backend run prisma:deploy`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `git diff --check`

### Next Steps

- Add a durable overtime request/approval queue before paying pending overtime automatically.
- Add admin chat export/archive controls as a separate governance slice.
- Review any third-party GIF/emoji picker source before adding a dependency.

## 2026-06-10 - Feedback Batch Phase 3

### Completed

- Removed the duplicate `/client` entry from normal employee Work navigation while preserving client-shell navigation for client users and `/operations/clients` for admin client management.
- Added metadata-aware Task Tracking search that matches task title, description, status, priority, notes, project, department, assignee, creator, and collaborators.
- Added per-user pinned Work Focus selection with automatic fallback to overdue, due-today, in-progress, review, then todo work.
- Added additive `TaskCollaborator` schema and migration for collaborator invitations on internal tasks.
- Added backend collaborator visibility so invited/accepted collaborators can read shared tasks.
- Added manager/admin task collaborator controls in the task modal, collaborator badges in task list/card views, and collaborator names in task details.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606100002_task_collaborators/migration.sql`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.permissions.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/tests/tasks.permissions.test.ts`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/tasks/BoardCard.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/tasks/TaskListRow.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/lib/task-focus.ts`
- `frontend/src/lib/task-search.ts`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/tests/task-focus.test.mjs`
- `frontend/tests/task-search.test.mjs`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept `Task.assigneeId` as the primary owner/worker and added collaborators beside it to avoid breaking existing task ownership, timer, report, and notification contracts.
- Restricted collaborator editing to task assignment managers/admins for this slice because collaborator changes affect server-side task visibility.
- Treated collaborator invitations as readable task sharing immediately, with `status` available for a later accept/decline inbox.
- Kept Work Focus pinning local and per-user because it is a personal workflow preference, not shared task data.

### How to Test

- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npx prisma generate --schema backend/prisma/schema.prisma`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`

### Next Steps

- Apply `backend/prisma/migrations/202606100002_task_collaborators` before deploying code that reads or writes `TaskCollaborator`.
- Add a collaborator accept/decline inbox if the product wants explicit acceptance instead of immediate readable invites.
- Add drag ordering for Work Focus after the pinned-focus model is verified in browser QA.

## 2026-06-10 - Feedback Batch Phase 2

### Completed

- Added additive Prisma migration `202606100001_task_projects_org_reporting` for internal task projects and flexible manager reporting lines.
- Added task project APIs for listing, creating, updating, deleting, and assigning projects to tasks.
- Added `User.managerId` updates for full-access admins with self-manager and cycle protection.
- Added Task Tracking project organization UI, project filters/grouping, project labels on task cards/list/detail, and project data in Deskii PDF reports.
- Added full-access admin quick-add department support inside the Task Tracking modal.
- Added shared segmented day/month/year date inputs for task start/due dates and profile birthday editing.
- Fixed segmented date inputs so narrow profile drawers cannot push the `YYYY` segment outside the field.
- Added a compact profile phone country-code picker with custom `+###` entry while preserving a single saved international phone string.
- Added Operations `Org Chart` tab for scalable manager/direct-report viewing and manager assignment.
- Applied the new local database migration with `npm --prefix backend run prisma:deploy`.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606100001_task_projects_org_reporting/migration.sql`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.security.ts`
- `backend/src/users/users.service.ts`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/forms/SegmentedDateInput.tsx`
- `frontend/src/components/ProfilePhoneInput.tsx`
- `frontend/src/components/operations/OperationsOrgChartPanel.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/tasks/BoardCard.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/tasks/TaskListRow.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/hooks/useTasksQuery.ts`
- `frontend/src/lib/country-calling-codes.ts`
- `frontend/src/lib/member-role-management.ts`
- `frontend/src/lib/operations-session.ts`
- `frontend/src/lib/phone-number.ts`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/src/lib/users.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept task projects as an internal `TaskProject` model instead of reusing client `ClientProject` records because internal task organization and client-facing project delivery have different visibility and ownership rules.
- Made project assignment optional so existing tasks and future one-off work do not require a project.
- Limited Task Tracking quick-add department to full-access admins because department writes are admin-only on the backend.
- Used `User.managerId` self-relations for org chart flexibility instead of fixed role depth assumptions.
- Kept profile phone storage as one backend string and handled country-code presets on the frontend to avoid an unnecessary schema/API migration.

### How to Test

- `npm --prefix backend run prisma:generate`
- `npm --prefix backend run prisma:deploy`
- `npx dotenv -e .env -- prisma validate` from `backend`
- `npm --prefix backend run build`
- `npm --prefix backend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix frontend test`
- `git diff --check`

### Next Steps

- Apply `backend/prisma/migrations/202606100001_task_projects_org_reporting` to production before deploying code that uses `TaskProject` or `User.managerId`.
- Add Apple OAuth only after Apple Developer credentials and callback URLs are available.
- Continue visual QA on real production data after deployment because project/org-chart density depends on actual member and task volume.

## 2026-06-10 - Feedback Batch Phase 1

### Completed

- Rebranded the visible app/login shell from MyDeskii to Deskii without renaming technical storage keys.
- Added local Deskii logo and favicon assets plus app metadata icons.
- Reworked the login page into a more dynamic Deskii auth surface with Google sign-in access and a disabled Apple sign-in placeholder until Apple credentials/backend strategy exist.
- Added workspace-aware login copy using `NEXT_PUBLIC_WORKSPACE_NAME` with a `?workspace=` override for client-specific sign-in links.
- Fixed profile editing usability with collapsible edit controls, US phone defaults, optional profile fields, and authenticated avatar uploads through the shared API helper.
- Removed the manual Role field from task forms while preserving backend-compatible role auto-fill from the selected assignee.
- Made task due dates optional end-to-end, including clearing existing due/start dates on edit.
- Added ETOC unit selection for minutes, hours, and days while storing estimated time in minutes.
- Added visible All/Open/Completed task quick filters, improved PDF export metadata, and renamed exports to Deskii reports.
- Reduced task timer action latency by updating React Query task caches in place instead of refetching every task after play/pause/complete.
- Changed the Task Tracking Organize dropdown into a viewport-fixed scroll panel so it does not get cut off near the page bottom.

### Files Changed

- `backend/src/tasks/tasks.service.ts`
- `frontend/public/deskii-logo.svg`
- `frontend/public/favicon.svg`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/login.module.css`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/tasks.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept Apple sign-in disabled because working Apple OAuth requires Apple Developer credentials and backend strategy configuration.
- Kept internal task `role` data in the API/database for compatibility, but removed manual role selection from the user-facing task form.
- Left org chart hierarchy and task projects for the next phase because both need database-backed models and migration review.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- Browser affected-flow audit: `/login`, `/signup`, `/profile`, and `/task-tracking`.

### Next Steps

- Implement flexible org chart reporting lines with an additive schema migration.
- Implement internal task projects with a separate `TaskProject` model and task assignment/filtering UI.
- Add real Apple OAuth after the required Apple credentials and callback URLs are available.

## 2026-06-09 - Operations Loading Follow-Up

### Completed

- Removed the duplicate Operations roles API request by deriving role options from the departments payload that already includes `availableRoles`.
- Restored deferred member-directory loading so `/operations` does not start the heavier `/api/users` request before the Members tab is opened.
- Added an idle member prefetch after the visible Operations section is stable, keeping Members warm without competing with departments on first paint.
- Limited automatic org-catalog sync to empty department catalogs so normal Operations visits do not trigger an extra sync POST.
- Added a session-scoped departments cache so revisits can show org-catalog content immediately while React Query refreshes in the background.
- Narrowed backend user-directory reads to the sanitized fields the API actually returns.
- Made stored-session adoption hydration-safe so protected routes and the sidebar do not render different authenticated markup between server HTML and the first client frame.
- Made the theme toggle hydrate from a stable default before syncing the saved browser theme, removing light-mode React hydration errors.

### Files Changed

- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/lib/operations-data.ts`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/tests/operations-data.test.mjs`
- `backend/src/users/users.service.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept the public departments and roles API contracts intact for signup and existing callers.
- Avoided browser-caching authenticated member data; only the public org-catalog department payload is cached in the current browser session.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- Browser affected-flow audit: open `/operations`, confirm Departments and Roles no longer trigger separate `/api/roles` work, then open Members and confirm the member list loads without replacing the shell.

### Next Steps

- If production org-catalog endpoints still take multiple seconds after this change, move the backend off Vercel serverless/free cold starts or add a carefully invalidated backend cache for public org-catalog reads.

## 2026-06-07 - Client Directory Access Guard

### Completed

- Restricted internal user directory list/search and cross-user reads to internal accounts only.
- Preserved client-only self profile and self role reads so the client portal can still resolve the signed-in account.
- Added regression coverage for admin, employee, and client-only access paths on `/api/users`.
- Documented the Vercel same-origin API requirement after production login failed against the old Render public API URL.

### Files Changed

- `backend/src/users/users.controller.ts`
- `backend/tests/users.routes-security.test.ts`
- `docs/api.md`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Treated normalized client roles as portal-only roles; accounts with any non-client org role remain internal for directory access.
- Kept response sanitization in place as defense-in-depth, but did not rely on sanitization as the access boundary.

### How to Test

- `node -r ts-node/register tests/users.routes-security.test.ts` from `backend/`
- `npm --prefix backend test`
- `npm --prefix backend run build`

### Next Steps

- Redeploy the backend/frontend bundle before expecting production `/api/users` to enforce the new guard.
- Remove or reset Vercel `NEXT_PUBLIC_API_URL` to `/api` before redeploying the monorepo Vercel project, or update Render `CORS_ORIGIN` if using Render as the browser-facing backend.

## 2026-06-07 - Navigation Skeleton Layout Polish

### Completed

- Reworked shared page skeleton presets so loading states follow the real route box layouts instead of drawing generic headers, filters, or board columns.
- Matched Dashboard, Task Tracking, Announcements, Daily Logs, and generic panel skeletons to their mounted page structure while keeping route headers and sidebar visible.
- Removed an extra Operations department-card placeholder control that did not exist in the final card layout.

### Files Changed

- `frontend/src/components/ui/Skeleton.tsx`
- `frontend/src/components/operations/OperationsLoadingStates.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Kept skeletons as content placeholders only; page headers and navigation remain mounted by the owning route during loading.
- Preserved API/data-loading behavior and focused the change on visual stability.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser affected-flow audit: reload Dashboard, Task Tracking, Announcements, Daily Logs, and Operations and confirm skeleton boxes match the final sections without replacing the sidebar or route header.

### Next Steps

- Add page-specific skeleton presets only when a route has a unique layout that the generic panel skeleton cannot represent.

## 2026-06-07 - Operations Loading Performance

### Completed

- Split Operations data loading into independent cached queries for departments, roles, and members.
- Deferred the Members request until the Members tab is opened or prefetched, so departments and roles no longer wait on the slow member list.
- Moved the first org-catalog sync into a background refresh instead of blocking the initial Operations render.
- Added section-level skeletons and retry states so the Operations page stays usable while one section loads.
- Refined Operations skeletons to match final department, role, and member layouts with stable card dimensions and screen-reader-only loading labels.

### Files Changed

- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/operations/OperationsLoadingStates.tsx`
- `frontend/src/lib/operations-data.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept backend API contracts unchanged and used the existing React Query provider for caching, prefetching, and invalidation.
- Kept role assignment disabled while roles are still loading or failed, but members can load independently.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser affected-flow audit: open `/operations`, switch Departments, Roles, Members, and confirm the shell and tabs remain visible while section data loads.

### Next Steps

- Consider server-side pagination or virtualized rendering for the Members tab if production member count grows beyond the current bounded list.

## 2026-06-07 - Sidebar Navigation Stability

### Completed

- Stabilized sidebar admin/work navigation during client-side route changes by preventing client-workspace resolution from resetting on ordinary user object refreshes.
- Added focused tests for the sidebar client-workspace resolving decision.

### Files Changed

- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/sidebar-client-workspace.ts`
- `frontend/tests/sidebar-client-workspace.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Hard reloads may still show the safe auth-loading state until a user is known; client-side navigation should keep role-gated sidebar sections stable.
- The client-workspace lookup now keys off stable user id and access booleans instead of the whole user object.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Browser affected-flow audit: navigate Dashboard -> Task Tracking -> Daily Logs and confirm Admin nav stays mounted.

### Next Steps

- Push this follow-up after verification if the rendered check stays clean.

## 2026-06-07 - Production Audit Fixes

### Completed

- Blocked self-service account email changes while preserving ordinary profile edits.
- Restricted email provider test/send/status endpoints to full-access administrators.
- Added bounded default pagination for user, announcement, and daily-log list reads while preserving legacy array responses when callers omit pagination.
- Prevented the workspace sidebar and command palette from mounting while protected-route auth is still unknown.
- Marked profile email as read-only in the edit form so the frontend matches the server-side identity rule.
- Added focused backend regression tests for account email mutation, email route authorization, and pagination bounds.

### Files Changed

- `backend/src/users/users.controller.ts`
- `backend/src/email/email.controller.ts`
- `backend/src/http/pagination.ts`
- `backend/src/announcements/announcements.controller.ts`
- `backend/src/daily-logs/daily-logs.controller.ts`
- `render.yaml`
- `backend/tests/users.routes-security.test.ts`
- `backend/tests/email.routes.test.ts`
- `backend/tests/pagination.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/ProfileFormInput.tsx`
- `frontend/src/lib/api.ts`
- `frontend/scripts/visual-smoke.mjs`
- `docs/api.md`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept account email as an admin-managed identity field instead of allowing self-service changes that could affect admin email bypass logic.
- Kept existing unpaginated frontend response shapes for compatibility, but bounded the backend query work.
- Used the existing auth guard and shell structure rather than introducing a new layout system.
- Moved Render frontend URL and CORS origin values to dashboard-managed env vars so the blueprint does not lock production to the temporary preview domain.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Focused visual smoke on `/client`, `/profile`, `/announcements`, `/daily-logs`, and `/task-tracking`.

### Next Steps

- Continue splitting the largest frontend route files and add deeper code splitting where route chunks remain heavy.

## 2026-06-06 - Client Portal Navigation And Profile Drawer

### Completed

- Removed the duplicate client portal horizontal nav from client-facing pages so client users navigate the portal from the sidebar only.
- Preserved the admin Client Operations top navigation under `/operations/clients`.
- Tightened the profile drawer surface and text wrapping while keeping the v3 portal-based overlay structure.

### Files Changed

- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Treated `ClientPortalTopNav` as redundant only for client-facing portal routes, not for admin client operations routes.
- Preserved the newer v3 profile drawer portal implementation instead of replacing it with the older v2 layout.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- Browser affected-flow audit: `/client`, `/client/tickets`, another `ClientPortalWorkspaceFrame` route such as `/client/account`, and the profile drawer.

### Next Steps

- Delete `ClientPortalTopNav` only if admin client operations no longer depends on that component in the future.

## 2026-06-06 - Admin And Client Workflow Runbook

### Completed

- Added a team-facing workflow runbook for internal admins and client portal users.
- Documented client onboarding, team access, delivery, requests, approvals, reports, assets, billing, roadmap, calendar, visibility rules, and adoption cadence.

### Files Changed

- `docs/admin-client-workflows.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the workflow guide as Markdown in `docs/` so the team can review and adapt it directly in the repo.
- Used current Client Operations and Client Portal routes as the source of truth instead of inventing a separate process.

### How to Test

- `git diff --check`

### Next Steps

- Convert this Markdown runbook into a client-ready PDF or DOCX if the team needs a shareable handout.

## 2026-06-06 - Org Role Access Model

### Completed

- Connected Admin Operations to the org catalog with an admin-only sync endpoint and a one-time page sync before loading departments and roles.
- Added an Operations `Members` tab for internal user/employee role assignment management and authorization group visibility.
- Added the SAVAGE LLC org chart role catalog for onboarding and role dropdowns.
- Centralized backend role normalization and access groups for full access, management, payroll management, and client operations.
- Mirrored frontend navigation/payroll access helpers so the sidebar, command palette, daily logs, file directory, whiteboard, task assignment, and payroll UI follow the same model.
- Merged missing org-chart default roles into department/role API responses so existing databases with older configured roles still expose the new defaults.
- Allowed admin onboarding invitations to accept default org-role IDs when an `AvailableRole` row has not been seeded yet.
- Updated local seed data to upsert the new departments and role options without changing the Prisma schema.

### Files Changed

- `backend/src/org/org-access-policy.ts`
- `backend/src/org/org-catalog-sync.ts`
- `backend/src/departments/departments.controller.ts`
- `backend/src/departments/departments.service.ts`
- `backend/src/auth/signup-role-options.ts`
- `backend/src/auth/auth.middleware.ts`
- `backend/src/roles/roles.service.ts`
- `backend/src/users/users.service.ts`
- `backend/src/tasks/tasks.permissions.ts`
- `backend/src/daily-logs/daily-logs.department.ts`
- `backend/src/employees/employees.security.ts`
- `backend/src/payroll/payroll.permissions.ts`
- `backend/src/clients/clients.access.ts`
- `backend/prisma/seed.ts`
- `frontend/src/lib/role-access.ts`
- `frontend/src/lib/member-role-management.ts`
- `frontend/src/lib/users.ts`
- `frontend/src/lib/departments.ts`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/operations/OperationsMembersPanel.tsx`
- `docs/api.md`
- `docs/database.md`
- `docs/architecture.md`
- `docs/features.md`

### Decisions Made

- Reused existing `Department`, `AvailableRole`, and `UserRole` records instead of adding schema.
- Preserved configured role rows and only added missing org-chart defaults to API responses.
- Reused existing full-access user-role APIs for Operations member authorization management instead of adding schema or a parallel permission store.
- Kept finance roles limited to payroll management by default.
- Kept website developer roles in client operations without giving every department lead global client-management access.

### How to Test

- `npx dotenv -e "D:\CODE\Internal Company Portal - SAVAGE LLC\backend\.env" -- npm test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Focused rendered audit of `/dashboard`, `/operations`, `/operations/onboarding`, `/payroll-calendar`, `/task-tracking`, `/daily-logs`, `/file-directory`, `/operations/clients`, and `/whiteboard` on desktop plus dashboard/onboarding on mobile.
- Operations member role helper coverage is included in `frontend/tests/member-role-management.test.mjs`.

### Next Steps

- Run the seed/upsert during deployment so the database becomes the long-term source of truth for the new department and role catalog.

## 2026-06-05 - v3 Motion Review Fix Cycle

### Completed

- Ported the focused motion-review fixes onto `v3-improvements`.
- Added shared CSS motion primitives for panels, drawers, view transitions, list reveals, interactive controls, and reduced-motion behavior.
- Applied the shared motion classes to Task Tracking view switches, the Organize menu, Notification Sidebar, and Profile Sidebar.
- Updated side drawers to use `100dvh` so mobile browser chrome does not shrink or jump the panel height.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/NotificationSidebar.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Kept the motion implementation in shared CSS instead of adding a new animation dependency.
- Used transform and opacity animations only, with `prefers-reduced-motion` disabling entrance motion.
- Applied this polish on top of the broader v3 improvement set already staged for the branch.

### How to Test

- `npm --prefix frontend run lint`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `git diff --check`

### Next Steps

- Manually click through Task Tracking view changes and both side drawers in the running app when a local authenticated session is available.

## 2026-06-05 - Frontend Skill Routing And Motion Stack

### Completed

- Installed the official GreenSock GSAP skill pack globally for Codex.
- Updated frontend workflow routing so frontend/UI work uses the approved craft stack plus `motion-web-design`.
- Documented when to add GSAP-specific skills for React/Next.js animation, ScrollTrigger, timelines, plugins, utilities, and animation performance.

### Files Changed

- `AGENTS.md`
- `docs/agent-workflows.md`
- `docs/dev-notes.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/.agents/skills/vibe-auto-research/references/prompt-to-quality-cycle.md`
- `skills/skills-lock.json`

### Decisions Made

- Keep `motion-web-design` as the default motion skill for MyDeskii product UI.
- Use GSAP skills only when the task needs GSAP-level motion, not for ordinary dashboard hover, press, modal, drawer, or reduced-motion work.
- Keep the full GSAP pack global instead of copying every GSAP skill into the curated repo-local snapshot.

### How to Test

- `npx --yes skills list -g --agent codex --json`
- `npm run check:skills`

### Next Steps

- Restart Codex if newly installed global skills do not appear in a future active skill list.

## 2026-06-05 - Client Website Work Type Intake

### Completed

- Added a client organization website-work type for choosing whether the client needs a new website build or improvement to an existing website.
- Added the Website Work selector to the admin Create Client form and adjusted Website URL helper copy based on the selected intake type.
- Displayed the saved website-work type in the admin account profile and client operations header.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606050001_client_website_work_type/migration.sql`
- `backend/src/clients/clients.validation.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/components/client-portal/AdminClientAccountProfilePanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-website-work.ts`
- `frontend/tests/client-website-work.test.mjs`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Use an additive nullable string field instead of storing the choice in internal notes.
- Keep the accepted values narrow: `existing_site_improvement` and `new_build`.

### How to Test

- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser affected-flow audit: `/operations/clients/accounts`

### Next Steps

- Add an edit flow for existing client website profile details if admins need to change this after client creation.

## 2026-06-05 - Accessibility Remediation Pass

### Completed

- Added a global skip link and skip target for keyboard users.
- Added semantic `main` landmarks to auth and chat surfaces that were missing them.
- Added accessible status semantics to the auth-loading state.
- Added dialog roles, unique labels, escape handling, focus restoration, and tab containment to task/chat modals.
- Fixed heading-order issues on Chat, Daily Logs, and File Directory.
- Replaced low-contrast accent/emerald text combinations with existing foreground-safe tokens.
- Disabled FullCalendar toolbar icons in the shared wrapper so calendar navigation buttons render with text labels.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/forgot-password/page.tsx`
- `frontend/src/app/reset-password/page.tsx`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/file-directory/page.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/chat/ChatSidebar.tsx`
- `frontend/src/components/chat/CreateChannelModal.tsx`
- `frontend/src/components/chat/NewChatModal.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/components/payroll/CalendarTab.tsx`
- `frontend/src/components/ui/LazyFullCalendar.tsx`
- `frontend/src/hooks/useDialogA11y.ts`

### Decisions Made

- Keep the remediation scoped to concrete WCAG/axe findings instead of redesigning the affected screens.
- Put FullCalendar icon remediation in the shared wrapper so task, client, and operations calendar routes stay consistent.
- Reuse current design tokens and components rather than adding accessibility dependencies.

### How to Test

- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser affected-flow audit: login, signup, forgot/reset password, chat modals, task modal, task calendar, payroll calendar, daily logs, and file directory.

### Next Steps

- Run a broader authenticated axe sweep after any remaining route-specific UI cleanup.

## 2026-06-05 - SOP Client Tier Presets

### Completed

- Added the approved SOP-derived client tier presets as a backend source of truth for MyDeskii service tiers.
- Added a standalone `npm run seed:client-service-tiers` command to apply the five presets without running the full demo user seed.
- Included the presets in the normal Prisma seed flow.
- Added shared frontend labels so SOP presets display as `Name (Tier N)` in service-tier selectors and tier lists.
- Updated visual-smoke client tier mock data so rendered client operations routes use the SOP tier names.

### Files Changed

- `backend/src/clients/client-service-tier-presets.ts`
- `backend/prisma/seed-client-service-tiers.ts`
- `backend/prisma/seed.ts`
- `backend/package.json`
- `backend/tests/client-service-tier-presets.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/components/client-portal/AdminClientAccountProfilePanel.tsx`
- `frontend/src/components/client-portal/AdminClientServiceTiersPanel.tsx`
- `frontend/src/components/client-portal/production-records/BillingPanel.tsx`
- `frontend/src/lib/client-service-tiers.ts`
- `frontend/tests/client-service-tiers.test.mjs`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Upsert presets by tier name so existing matching presets are refreshed while unrelated custom tiers remain untouched.
- Store the `$9,997+` premium tier as `9997` in the existing numeric price field and keep the plus qualifier in the description.
- Avoid a schema migration because `ClientServiceTier` already supports name, description, price, and rank.

### How to Test

- `npm --prefix backend run seed:client-service-tiers`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Browser affected-flow audit: open `/operations/clients/accounts` and confirm the five SOP tier names appear in the Service Tiers panel and client tier selectors.

### Next Steps

- If the business later separates one-time package price from recurring maintenance price, add a dedicated price field instead of overloading the existing service-tier price field.

## 2026-06-05 - Frontend Craft Stack Routing

### Completed

- Replaced `frontend-visual-quality` as the default frontend taste driver in repo workflow instructions.
- Documented the approved MyDeskii frontend craft stack: `impeccable`, `emil-design-eng`, `design-taste-frontend`, `web-design-guidelines`, and Browser/Chrome rendered verification.
- Reserved `gpt-taste` for marketing, landing-page, portfolio, campaign, or brand-heavy surfaces instead of internal operations dashboards or accessibility remediation.
- Updated the repo-local `vibe-auto-research` skill and prompt-to-quality reference so future frontend work follows the same routing.

### Files Changed

- `AGENTS.md`
- `docs/agent-workflows.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/.agents/skills/vibe-auto-research/references/prompt-to-quality-cycle.md`
- `skills/skills-lock.json`
- `docs/dev-notes.md`

### Decisions Made

- Keep the global `frontend-visual-quality` skill unchanged to avoid affecting other repositories.
- Treat `impeccable` as the primary product UI quality skill for MyDeskii frontend work.
- Use `emil-design-eng` and `design-taste-frontend` as supporting checks rather than blindly loading every frontend skill.

### How to Test

- `npm run check:skills`
- Search workflow docs for stale `frontend-visual-quality` default routing.

### Next Steps

- Apply the new craft stack on the next frontend remediation or redesign task and verify with a rendered affected-flow audit.

## 2026-06-05 - Admin Onboarding Setup Links

### Completed

- Added an admin-only onboarding endpoint that creates or completes approved internal user accounts from an email and role selection.
- Reused the existing reset-password token flow so admins generate setup links without seeing or setting user passwords.
- Added `/operations/onboarding` with email, role, generate-link, read-only setup link, and copy-link controls.
- Added admin navigation and command-palette access for the onboarding page.
- Added backend route coverage and frontend helper coverage for onboarding link generation.

### Files Changed

- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/users.onboarding.test.ts`
- `frontend/src/app/operations/onboarding/page.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/admin-onboarding.ts`
- `frontend/tests/admin-onboarding.test.mjs`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Use existing `AvailableRole` records for the visible role dropdown; department assignment is derived from the selected role.
- Reject onboarding generation for users that already have a password so active accounts use password reset instead of admin-generated setup links.
- Keep the setup link copyable even though email delivery can be added later.

### How to Test

- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Browser affected-flow audit: open `/operations/onboarding`, select a role, generate a setup link, copy it, then open the link and confirm the reset-password form renders.

### Next Steps

- Add optional email delivery if admins should both copy the link and send the onboarding email from the same form.

## 2026-06-05 - Client Service Tier Delete

### Completed

- Added an admin-only `DELETE /api/clients/service-tiers/:id` route for removing client service tiers.
- Wired a selected-tier delete action into the Client Accounts service-tier panel with typed-name confirmation.
- Kept tier deletion non-destructive to clients by relying on the existing `ClientOrganization.tierId` `onDelete: SetNull` relation.
- Added backend route coverage and frontend helper coverage for deleting service tiers.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/components/client-portal/AdminClientServiceTiersPanel.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-service-tiers.ts`
- `frontend/tests/client-service-tiers.test.mjs`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Use a direct delete endpoint instead of soft-deleting service tiers because the existing schema already preserves client organizations by clearing assigned `tierId` values.
- Refresh client organization data after deletion so the selected client and account profile reflect the cleared tier assignment.

### How to Test

- `npm --prefix backend test`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Browser affected-flow audit: create or select a service tier in `/operations/clients/accounts`, type the tier name into the delete confirmation field, confirm on a disposable tier, and verify it disappears from tier lists.

### Next Steps

- If service tiers need historical reporting later, add an archived/inactive tier status instead of deleting records.

## 2026-06-05 - Client Operations Overview Banners

### Completed

- Limited the large client operations hero and control-surface metric banner to the `/operations/clients` overview route.
- Kept the client selector and section tabs available on focused client admin pages such as Accounts, Delivery, Requests, Reports, Billing, Roadmap, and Calendar.
- Added focused navigation-helper coverage for identifying the Client Operations overview route.

### Files Changed

- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/lib/client-operations-navigation.ts`
- `frontend/tests/client-operations-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Treat the banners as overview context only so focused client admin sections start closer to their working controls.
- Preserve the selected-client picker across subpages because it remains needed for scoped client work.

### How to Test

- `npm --prefix frontend test -- client-operations-navigation.test.mjs`
- `npm --prefix frontend run lint`
- Browser or visual-smoke affected-flow audit: `/operations/clients` shows overview banners; `/operations/clients/accounts` does not show the repeated hero/control-surface banners.

### Next Steps

- If focused subpages still feel too tall, review the client picker density separately instead of removing client switching.

## 2026-06-05 - Admin Client Navigation Cleanup

### Completed

- Removed the client-facing `/client` portal entry from internal/admin sidebar navigation.
- Removed client-facing portal commands from the internal command palette while keeping client users on their dedicated client portal command set.
- Updated the Operations client card so admins are directed to Client Operations instead of the client-facing portal.

### Files Changed

- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/app/operations/page.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Preserve the `/client` routes for actual client users; this pass only removes duplicate internal/admin navigation.
- Keep admin client work centralized under `/operations/clients`.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Browser affected-flow audit: confirm admin sidebar and command palette show `Clients` under Admin but no `Client Portal` work item, then confirm client-user navigation still uses the client portal section.

### Next Steps

- If the client-facing portal should be fully removed later, plan that as a separate auth, routing, docs, and data-visibility change.

## 2026-06-04 - Anti-Hallucination Evidence Gate

### Completed

- Made memory and current repo evidence an explicit first step for meaningful Vibe Auto Research work.
- Added an anti-hallucination evidence gate that requires current files, docs, commands, git state, and rendered-app evidence when relevant.
- Clarified rendered website tool routing: Browser/in-app browser for local web evidence, Chrome plugin for user Chrome profile/session/tab/extension needs, Computer Use for real Windows app surfaces, and visual-smoke scripts for broad safe coverage.
- Updated the repo-local Vibe Auto Research skill and references so global copies can carry the same behavior.

### Files Changed

- `AGENTS.md`
- `README.md`
- `docs/agent-workflows.md`
- `docs/code-review.md`
- `docs/dev-notes.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/.agents/skills/vibe-auto-research/references/browser-experience-review.md`
- `skills/.agents/skills/vibe-auto-research/references/prompt-to-quality-cycle.md`
- `skills/skills-lock.json`

### Decisions Made

- Do not force Computer Use or Chrome for every website task; use the surface that gives the strongest evidence with the least risk.
- Treat memory as a search hint and require current verification for anything that may have changed.
- If a requested browser or desktop surface is unavailable, report `blocked` or `not applicable` instead of guessing.

### How to Test

- `npm run check:skills`
- `git diff --check`
- Confirm global `vibe-auto-research` files include the anti-hallucination gate.

### Next Steps

- Future UI/workflow implementation should report memory, repo, rendered-route, browser/Chrome/Computer Use, and blocker evidence as applicable.

## 2026-06-04 - Task Controls And Seed Safety

### Completed

- Replaced the task modal's native-looking select controls with theme-stable select styling so macOS does not show the glossy system dropdown treatment.
- Fixed manual task-role entry by separating manual-entry mode from the actual role value; selecting `Other / type a role` now starts with an empty text field and keeps the field visible while typing.
- Added labeled task quick actions so list and board controls read as `Start`, `Pause`, `Done`, and `Reopen` instead of icon-only actions.
- Added a completed-task `Reopen` path in list rows and task details; reopening moves the task back to `in_progress` so the backend clears `completedAt`.
- Hardened normal Prisma seeding to preserve existing users unless `SEED_RESET_USERS=true` is explicitly set against localhost.
- Added an explicit local-only confirmation gate to the legacy manual seed script and removed its hardcoded password.

### Files Changed

- `backend/prisma/seed.ts`
- `backend/seed-manual.js`
- `frontend/src/app/globals.css`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/BoardCard.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/tasks/TaskListRow.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/lib/task-status-actions.ts`
- `frontend/tests/task-status-actions.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Preserve existing accounts during normal seed runs; destructive local resets must be explicit instead of the default.
- Leave branding unchanged in this pass because repo docs say `MyDeskii` while the provided conversation screenshot says `Deskii`.
- Use the existing task `PATCH /api/tasks/:id` contract for undoing completion rather than adding a new endpoint.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix backend test`
- `cd backend && npx prisma validate`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix backend run build`
- `cd backend && npx prisma generate`
- `$env:VISUAL_SMOKE_ROUTES = '/task-tracking'; npm --prefix frontend run test:visual`
- `git diff --check`
- Browser affected-flow audit: task modal manual role entry, task list `Done`/`Reopen`, completed task detail `Reopen Task`, and task cleanup through the API.

### Next Steps

- Confirm whether the product name should remain `MyDeskii` or switch to `Deskii` before making branding edits.
- If real user passwords need recovery, reset only the requested accounts through an explicit recovery step and verify login afterward.

## 2026-06-03 - Completion Audit Cycle Hardening

### Completed

- Added a mandatory Completion Audit Cycle after Vibe Auto Research implementations.
- Defined affected-flow audit versus full-feature audit so narrow changes stay focused and cross-cutting or "all features" requests get broader manual coverage.
- Required the reviewer pass to find and fix material issues before the final response when verification is possible.
- Updated the repo-local Vibe Auto Research skill references, code review checklist, and README workflow summary.

### Files Changed

- `AGENTS.md`
- `README.md`
- `docs/agent-workflows.md`
- `docs/code-review.md`
- `docs/dev-notes.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/.agents/skills/vibe-auto-research/references/browser-experience-review.md`
- `skills/.agents/skills/vibe-auto-research/references/prompt-to-quality-cycle.md`
- `skills/skills-lock.json`

### Decisions Made

- Use affected-flow audit for focused implementation work.
- Escalate to full-feature audit for cross-cutting shell, auth, role, navigation, dashboard, broad redesign, release/publish, or explicit "all features" requests.
- Allow `not applicable` only for docs-only, non-rendered backend, CLI-only, or unreachable-app work, with the reason stated.

### How to Test

- `npm run check:skills`
- `git diff --check`

### Next Steps

- When future UI/workflow implementation changes land, report audit scope as affected-flow, full-feature, blocked, or not applicable.

## 2026-06-03 - Vibe Auto Research Activation Hardening

### Completed

- Made Vibe Auto Research explicitly always-on for meaningful repo work, even when the user does not name the workflow.
- Clarified that supporting skills can come from the active session, global Codex skills, repo-local snapshots, or plugin skills.
- Added a missing-skill protocol that uses `find-skills` / `npx skills find` before falling back to broad general work.
- Added a concise Codex personalization snippet for carrying the same default into repos that do not have this `AGENTS.md`.

### Files Changed

- `AGENTS.md`
- `docs/agent-workflows.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/skills-lock.json`
- `docs/dev-notes.md`

### Decisions Made

- Do not copy every global skill into the repo-local snapshot; use the snapshot for curated repeatable repo workflows and route to global skills when available.
- Do not install low-install overlapping repo-research skills without a clearer capability gap.
- Keep personalization general and repo docs specific.

### How to Test

- `npm run check:skills`
- `git diff --check`
- `npx --yes skills list -g --agent codex --json`
- `npx --yes skills find "agent workflow repo research"`

### Next Steps

- Paste the personalization snippet into Codex settings if this behavior should apply outside this repository.
- Add a new repo-local skill only when a repeated workflow gap is proven by actual portal work.

## 2026-06-02 - Exhaustive Interaction Audit Fix Cycle

### Completed

- Reframed the audit away from broad sampling and into route-by-route, persona-by-persona coverage.
- Expanded visual smoke with optional interaction auditing for visible links, buttons, inputs, selects, tabs, checkboxes, radios, and range controls.
- Added safe admin, employee, client, and anonymous personas to visual smoke.
- Added safe mock responses for auth forms and payroll clock/manual-entry actions so workflow checks do not touch real backend data.
- Ran desktop and mobile interaction sweeps across client, employee, admin operations, payroll, auth, and shell-level controls.
- Used the in-app Browser for visible shell checks: sidebar collapse/expand, command palette, notifications, profile panel, and theme toggle.
- Fixed undersized password visibility buttons on login, signup, and reset-password forms.

### Files Changed

- `frontend/scripts/visual-smoke.mjs`
- `frontend/src/app/login/login.module.css`
- `docs/dev-notes.md`

### Decisions Made

- Treated redirect aliases like `/payroll-dashboard` and `/` as route behavior to verify separately from route-body click isolation.
- Kept destructive or external actions skipped in automated clicks: uploads, downloads, print, Discord/external links, and file inputs.
- Used mocked auth/payroll responses for function checks because real local submissions could mutate data.

### How to Test

- `VISUAL_SMOKE_USER_ROLE=client VISUAL_SMOKE_INTERACTIONS=1 VISUAL_SMOKE_ROUTE_CONTROLS_ONLY=1 VISUAL_SMOKE_ROUTES=/client,/client/work,/client/tickets,/client/approvals,/client/messages,/client/reports,/client/resources,/client/account,/client/calendar VISUAL_SMOKE_THEMES=dark npm --prefix frontend run test:visual`
- `VISUAL_SMOKE_USER_ROLE=admin VISUAL_SMOKE_INTERACTIONS=1 VISUAL_SMOKE_ROUTE_CONTROLS_ONLY=1 VISUAL_SMOKE_ROUTES=/operations,/operations/clients,/operations/clients/accounts,/operations/clients/delivery,/operations/clients/requests,/operations/clients/approvals,/operations/clients/reports,/operations/clients/assets,/operations/clients/billing,/operations/clients/roadmap,/operations/clients/calendar,/payroll-calendar,/whiteboard VISUAL_SMOKE_THEMES=dark npm --prefix frontend run test:visual`
- `VISUAL_SMOKE_USER_ROLE=anonymous VISUAL_SMOKE_INTERACTIONS=1 VISUAL_SMOKE_ROUTES=/login,/signup,/forgot-password,/reset-password,/reset-password?token=audit-token&email=audit%40example.test VISUAL_SMOKE_THEMES=dark npm --prefix frontend run test:visual`
- Persona shell sweeps with `VISUAL_SMOKE_INTERACTIONS=1` on `/client` for client users and `/dashboard` for employee/admin users.

### Next Steps

- Keep external links, file inputs, downloads, and print actions as explicit manual checks because automated interaction should not trigger them without user intent.

## 2026-06-02 - Client Persona Workflow Fix Cycle

### Completed

- Simulated the portal as a client user instead of relying on the admin session.
- Fixed authenticated client landing so `/` and `/dashboard` resolve to `/client`.
- Changed login and already-authenticated auth screens to use the existing role-aware landing helper.
- Restricted the shared sidebar to client-facing portal routes for client users.
- Made the command palette role-aware so client search no longer exposes employee/admin destinations.
- Hid the employee time clock from client users.
- Added a client persona mode to visual smoke with checks for client landing redirects and internal navigation leaks.
- Improved the mobile navigation toggle label and `aria-expanded` state while the client drawer is open.

### Files Changed

- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/forgot-password/page.tsx`
- `frontend/src/app/reset-password/page.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/sidebar-navigation.ts`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/tests/sidebar-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept the fix to navigation, landing, and shell behavior; no backend route or database contract changed.
- Reused `getAuthenticatedLandingPath` and `CLIENT_PORTAL_NAV_ITEMS` instead of adding another role/navigation source.
- Treated client search and mobile drawer behavior as part of the client workflow, not optional polish.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- Client persona smoke: `VISUAL_SMOKE_USER_ROLE=client VISUAL_SMOKE_ROUTES=/,/dashboard,/client,/client/work,/client/tickets,/client/approvals,/client/messages,/client/reports,/client/resources,/client/account,/client/calendar npm --prefix frontend run test:visual`
- Admin focused smoke: `VISUAL_SMOKE_ROUTES=/dashboard,/operations,/operations/clients,/client npm --prefix frontend run test:visual`
- `npm --prefix frontend run build`
- Manual client workflow simulation: client lands on `/client`, searches Requests, submits a request, opens the mobile drawer, and navigates to Requests without internal nav leaks.

### Next Steps

- Add deeper route-level authorization/redirect rules for direct-linked internal employee/admin pages if client accounts should be blocked beyond the dashboard landing behavior.

## 2026-06-02 - Full Usability Audit Fix Cycle

### Completed

- Ran a broader Vibe Auto Research audit across admin, employee-facing, client-facing, and shared workflow routes.
- Added a rendered client portal section nav across `/client` and `/client/*` pages, including direct access to client `Requests`.
- Expanded the command palette so client, operations, payslip, task calendar, payroll dashboard, and whiteboard routes are discoverable by search.
- Fixed mobile Payslips overflow by removing the legacy manual sidebar offset and using the shared app shell spacing.
- Enlarged undersized announcement action controls, whiteboard tools/color swatches/range input, dashboard text links, and client resource/account/message links.
- Added proper page shells and `Header` titles for Task Calendar and Discord placeholder routes.
- Expanded the default visual smoke route matrix to include the previously skipped full-site audit routes.

### Files Changed

- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/src/app/client/resources/page.tsx`
- `frontend/src/app/client/account/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/my-payslips/page.tsx`
- `frontend/src/app/whiteboard/page.tsx`
- `frontend/src/app/task-calendar/page.tsx`
- `frontend/src/app/discord/page.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/announcements/AnnouncementCard.tsx`
- `frontend/src/components/client-portal/ClientPortalTopNav.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `frontend/src/lib/client-portal-navigation.ts`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/tests/client-portal-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Treated visual-smoke failures as authoritative unless the browser pass disproved them.
- Reused the existing client operations top-nav pattern for client portal sections instead of creating a separate visual language.
- Kept fixes scoped to discoverability, hit areas, responsive shell spacing, route titles, and audit coverage; no backend or database contracts changed.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test:visual`
- Focused client smoke: `VISUAL_SMOKE_ROUTES=/client,/client/work,/client/tickets,/client/messages npm --prefix frontend run test:visual`
- `npm --prefix frontend run build`
- `git diff --check`
- Chrome extension checks: route matrix, sidebar collapse, modal-open workflows, command palette searches for `client`, `operations`, `payslip`, and `whiteboard`, and client nav on `/client`, `/client/work`, and `/client/tickets`.

### Next Steps

- Add a logged-out/public-route smoke mode for `/login`, `/signup`, `/forgot-password`, and `/reset-password`; current visual smoke seeds an authenticated user.

## 2026-06-02 - Manual Usability Fix Cycle

### Completed

- Ran the Vibe Auto Research and Prompt-to-Quality cycle against the manual desktop/browser audit findings.
- Enlarged FullCalendar toolbar controls across client, operations client, payroll, and task calendar surfaces.
- Fixed small custom chat controls in the sidebar, message actions, search panel, and composer.
- Made Daily Logs filters responsive on mobile and removed the horizontal overflow found by visual smoke.
- Reworked Operations tabs into accessible 40px tab controls and resized destructive icon buttons.
- Resized File Directory breadcrumbs, folder-card icon actions, and toolbar fields.
- Added a Client Portal sidebar item so `/client/*` routes keep a clear active navigation anchor.
- Fixed the Task Tracking search input hit area.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/file-directory/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/chat/ChatSidebar.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/components/file-directory/FolderCard.tsx`
- `frontend/tests/sidebar-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept the fixes scoped to hit areas, wrapping, active navigation, and workflow polish instead of changing API or data behavior.
- Used shared FullCalendar CSS for calendar controls so client and admin calendar routes improve together.
- Kept native Daily Logs checkboxes visually compact while making their label rows the 40px touch targets.

### How to Test

- `npm --prefix frontend test -- sidebar-navigation.test.mjs`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test:visual`
- `git diff --check`
- Chrome extension route audit: `/operations/clients`, `/client`, `/client/calendar`, `/operations/clients/calendar`, `/task-tracking`, `/daily-logs`, `/chat`, `/file-directory`, and `/operations`.
- Chrome workflow checks: chat search open/close, Daily Logs add-modal open/close, Operations tab switching.

### Next Steps

- Keep visual smoke as the regression gate for future app-shell and workflow UI changes.

## 2026-06-02 - Sidebar Collapse Shell Cycle

### Completed

- Checked the repo instructions, design docs, app shell files, visual-smoke script, and validation commands before editing.
- Confirmed Google Chrome is installed and the Codex Chrome Extension/native host are configured; the first Chrome backend retry was unavailable, then a later extension retry connected successfully.
- Added a persisted desktop sidebar collapse state while preserving the existing mobile drawer behavior.
- Wired the header hamburger to open mobile navigation on small screens and collapse/expand the desktop sidebar on desktop.
- Added focused helper coverage for sidebar toggle mode and accessible toggle labels.
- Verified the desktop collapse/expand cycle in the in-app Browser and again through the Chrome extension.
- Fixed the overlapping admin nav active state so `/operations/clients` highlights `Clients` without also glowing `Operations`.

### Files Changed

- `frontend/src/contexts/SidebarContext.tsx`
- `frontend/src/lib/sidebar-navigation.ts`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/tests/sidebar-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept mobile navigation as a drawer because that matches the existing design contract.
- Put collapse state in a shell context so `Sidebar`, page padding, and fixed `Header` stay synchronized.
- Persisted desktop collapse with the existing `STORAGE_KEYS.SIDEBAR_COLLAPSED` key instead of adding a new storage convention.
- Made the `Operations` sidebar item exact-match only while keeping `Clients` section matching for `/operations/clients/*` pages.
- Used Browser Use as the initial live click-through fallback while Chrome was unavailable, then reran the same desktop route and hamburger check through the Chrome extension after the connection recovered.
- Restarted the frontend dev server after a stale dev route response returned 404 for `/operations/clients`; the route then served correctly and Browser Use navigation passed.

### How to Test

- `npm --prefix frontend test -- sidebar-navigation.test.mjs`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm run check:skills`
- `git diff --check`
- `npm --prefix backend audit --audit-level=high`
- `npm --prefix frontend audit --audit-level=high`
- `npm audit --audit-level=high`
- `VISUAL_SMOKE_ROUTES='/dashboard,/operations/clients,/client,/login' VISUAL_SMOKE_THEMES='dark,light' npm --prefix frontend run test:visual`
- Browser Use desktop check: `/dashboard` collapse to `80px`, reload persistence, collapsed `Clients` navigation to `/operations/clients`, then restore expanded `288px` state.
- Chrome extension desktop check: `/operations/clients` rendered authenticated client operations, hamburger collapsed to `80px`, restored expanded `288px`, and reported no console warnings/errors.
- Chrome extension active-state check: `/operations/clients` sets `aria-current="page"` only on `Clients`; `Operations` remains inactive.

### Next Steps

- If the Chrome backend disappears again, retry the extension connection once before reinstalling or reloading the Chrome plugin from the Codex plugin UI.
- Add a dedicated visual test assertion for the hamburger collapse/expand cycle if this shell behavior becomes a release gate.

## 2026-06-02 - Light And Dark Theme Fix

### Completed

- Consolidated MyDeskii theme variables so dark mode and light mode share the same token contract.
- Added missing workspace tokens used by client/admin command-center hero surfaces.
- Fixed light-mode sidebar readability by giving light mode its own sidebar token set.
- Tokenized client workspace hero labels, actions, progress bars, and detail text instead of hard-coded cyan-on-dark classes.
- Added light/dark theme coverage to the visual smoke script.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/workspace/ProductionWorkspace.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept dark mode as the default MyDeskii visual direction.
- Made light mode a complete operational theme instead of a partial inversion.
- Preserved routes, query parameters, backend APIs, and existing client navigation behavior.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES='/operations/clients,/operations/clients/delivery,/client,/dashboard,/login' VISUAL_SMOKE_THEMES='dark,light' npm --prefix frontend run test:visual`
- Browser smoke `/operations/clients?client=<id>` by toggling dark and light mode.

### Next Steps

- Continue token migration on lower-priority payroll, file directory, and chat internals as those screens enter review scope.

## 2026-06-02 - Prompt-to-Quality Agent Workflow

### Completed

- Added a Prompt-to-Quality Cycle for prompt intake, skill planning, repo applicability checks, plan quality gates, implementation, reviewer passes, and fix/review loops.
- Updated the Vibe Auto Research skill so implementation prompts must review technical quality and user-flow quality before final response.
- Added a focused skill reference for the new cycle and documented the workflow in the repo agent guide.

### Files Changed

- `AGENTS.md`
- `docs/agent-workflows.md`
- `docs/dev-notes.md`
- `skills/.agents/skills/vibe-auto-research/SKILL.md`
- `skills/.agents/skills/vibe-auto-research/references/prompt-to-quality-cycle.md`
- `skills/skills-lock.json`

### Decisions Made

- Kept the workflow inside `vibe-auto-research` instead of creating a competing orchestration skill.
- Treated `to-prd` as opt-in for PRD or issue-tracker output, not a default action for every plan.
- Required browser click-through for UI/user-flow work when the app can be rendered.

### How to Test

- `npm run check:skills`
- `git diff --check`

### Next Steps

- Restart Codex or start a new session to have newly installed global skills appear automatically.

## 2026-06-02 - Chrome Stale Auth Session Fix

### Completed

- Inspected the user's real Chrome tab with the Codex Chrome Extension.
- Confirmed the Chrome errors were stale-auth failures: `Invalid or expired token` for client organization fetches, time entries, and socket auth.
- Added shared auth-session handling so token-specific `403` responses follow the refresh/logout path instead of rendering protected screens with empty data.
- Updated user state to react immediately when a shared API request clears stale auth.
- Updated socket connection logic to wait for verified user state and a current token before connecting.
- Added focused unit coverage for token-auth failure detection.

### Files Changed

- `frontend/src/lib/auth-session.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/context/SocketContext.tsx`
- `frontend/tests/auth-session.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept normal `403 Insufficient permissions` behavior separate from `403 Invalid or expired token`.
- Avoided redirecting directly inside `apiFetch`; it clears auth and lets `AuthGuard` route the user to `/login`.
- Did not inspect or expose Chrome token values.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Chrome smoke: reload a stale-auth local portal tab and confirm it lands on `/login` without new console errors.

### Next Steps

- If the team wants a friendlier UX, add a login-page notice when the redirect was caused by session expiry.

## 2026-06-02 - Client Delivery Polish Continuation

### Completed

- Created and executed a skill-guided plan for the next Client Delivery polish pass.
- Added default input `name` support to the shared `FormField` component.
- Added delivery form control names, autocomplete handling, textarea resizing, and ellipsis-style placeholder copy.
- Added a compact empty state when a client has no work items.
- Hardened long project, work-item, and completed-work text so client content wraps instead of clipping.
- Rechecked the live Delivery tab and focused visual smoke route.

### Files Changed

- `frontend/src/components/forms/FormField.tsx`
- `frontend/src/components/client-portal/AdminClientProjectsPanel.tsx`
- `frontend/src/components/client-portal/AdminClientUpdatesPanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsPanel.tsx`
- `frontend/src/components/client-portal/production-records/shared.tsx`
- `frontend/src/components/client-portal/production-records/WorkItemsPanel.tsx`
- `frontend/src/app/operations/clients/delivery/page.tsx`
- `docs/superpowers/plans/2026-06-02-client-delivery-polish.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the implementation inside existing shared controls and delivery panels instead of redesigning the route.
- Treated checkbox labels as the interaction target, with the checkbox visual remaining smaller than the label hit area.
- Preserved backend/API contracts and did not add dependencies.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES='/operations/clients/delivery' npm --prefix frontend run test:visual`
- Browser smoke `/operations/clients/delivery?client=<id>` on the live local tab.

### Next Steps

- Apply the same form-control metadata pass to the remaining production-record routes if they become part of the next review scope.

## 2026-06-02 - Client Delivery UI Review

### Completed

- Reviewed the admin Client Delivery route at desktop and mobile sizes.
- Raised shared button minimum heights so Delivery form actions meet the touch-target gate.
- Improved client operation website links, checkbox sizing, record title wrapping, and mobile header handling.
- Rechecked the route with focused browser smoke after the visual fixes.

### Files Changed

- `frontend/src/components/Button.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/ClientOperationsPanel.tsx`
- `frontend/src/components/client-portal/production-records/shared.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Fixed the shared UI primitives that owned the issues instead of adding page-only overrides.
- Kept the mobile page header compact by hiding secondary subtitle copy below the `sm` breakpoint.
- Preserved the existing dark MyDeskii operations style and top client navigation.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES='/operations/clients/delivery' npm --prefix frontend run test:visual`
- Browser smoke `/operations/clients/delivery?client=<id>` at desktop and mobile widths.

### Next Steps

- Continue using the focused visual smoke route whenever shared client operations controls change.

## 2026-06-02 - Client Operations Top Navigation

### Completed

- Added a shared top navigation bar for the client operations section directly below the page header.
- Reused the existing client operations navigation config so Overview, Accounts, Delivery, Requests, Approvals, Reports, Assets, Billing, Roadmap, and Calendar stay in one route order.
- Preserved the selected `client` query parameter when moving between client operations sections.
- Added focused active-state coverage so Overview is not incorrectly marked active on nested client operations routes.

### Files Changed

- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/lib/client-operations-navigation.ts`
- `frontend/tests/client-operations-navigation.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Put the nav in `ClientOperationsShell` so every `/operations/clients/*` page gets the same top navigation.
- Use real `Link` elements with `aria-current` and visible focus states instead of one-off buttons or click handlers.
- Keep desktop as a compact single-row bar and mobile as a horizontal scroll strip to avoid wrapping the workflow controls.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `VISUAL_SMOKE_ROUTES='/operations/clients/accounts,/operations/clients/reports' npm --prefix frontend run test:visual`
- Browser smoke `/operations/clients/accounts?client=<id>` at desktop and mobile widths.

### Next Steps

- Consider adding the same style of top navigation to the client-facing `/client/*` portal if the team wants parity for client users.

## 2026-06-02 - MyDeskii Command-Center Redesign Planning

### Completed

- Preserved the MyDeskii product identity while incorporating the boss-approved dark command-center reference into the design direction.
- Updated the frontend redesign plan with frontend best-practice gates for accessibility, focus states, forms, responsive layout, content handling, URL state, performance, data formatting, motion, and dark-mode readability.
- Clarified that the reference should influence visual style and dashboard energy, not introduce marketing-page sections or fake decorative metrics.

### Files Changed

- `DESIGN.md`
- `docs/frontend-redesign-plan.md`
- `docs/dev-notes.md`

### Decisions Made

- Treat the boss reference as a premium MyDeskii command-center style, not a rename or direct Gemfield template copy.
- Start future implementation with global tokens, shared components, shell, auth, and dashboard before touching dense workflow internals.
- Keep frontend best practices as explicit gates in the plan so visual polish does not weaken accessibility, responsiveness, or performance.

### How to Test

- Review `DESIGN.md` and `docs/frontend-redesign-plan.md`.
- When implementation starts, run `npm --prefix frontend test`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and browser checks for desktop and mobile.

### Next Steps

- Create or update the first implementation task for global tokens, shared components, shell, auth, and dashboard.
- Browser-review the current MyDeskii dashboard against the boss-reference direction before broad route edits.

## 2026-06-02 - MyDeskii Command-Center First Implementation

### Completed

- Updated the global MyDeskii frontend theme to default to a dark command-center palette with cyan and magenta accents, glass surfaces, stronger borders, and dark form controls.
- Refined shared shell components, cards, buttons, sidebar, header, and protected layout surfaces so the app keeps the MyDeskii identity while matching the boss-approved visual direction.
- Upgraded login and signup screens with the new dark treatment, better focus states, accessible icon handling, keyboard-reachable password toggles, proper form names, and Next `Link` navigation.
- Restyled the dashboard landing surface, metrics, quick links, attention rows, chat input, announcements, and quick actions into a denser command-center experience.
- Browser-verified login, signup, and the authenticated admin dashboard at desktop and mobile widths.

### Files Changed

- `frontend/src/app/globals.css`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/login/login.module.css`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/Card.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/LoginInput.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/components/ui/button.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the product name and shell branding as MyDeskii rather than copying the Gemfield identity from the reference.
- Apply the reference as a product-app command-center language, not a marketing landing page.
- Start with shared tokens, auth, shell, and dashboard because those areas set the visual system for later route-by-route redesign work.
- Preserve light-mode support as a secondary fallback, while making dark mode the default MyDeskii experience.

### How to Test

- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `git diff --check -- frontend/src/app/globals.css frontend/src/app/layout.tsx frontend/src/components/ThemeToggle.tsx frontend/src/app/login/login.module.css frontend/src/app/login/page.tsx frontend/src/app/signup/page.tsx frontend/src/app/dashboard/page.tsx frontend/src/components/LoginInput.tsx frontend/src/components/Button.tsx frontend/src/components/Card.tsx frontend/src/components/Header.tsx frontend/src/components/LayoutWrapper.tsx frontend/src/components/Sidebar.tsx frontend/src/components/ui/button.tsx docs/dev-notes.md`
- Browser smoke at `http://localhost:3000/login`, `http://localhost:3000/signup`, and authenticated `http://localhost:3000/dashboard` for desktop and mobile viewport checks.

### Next Steps

- Carry the command-center tokens into the dense workflow pages in small route groups.
- Add route-specific visual smoke coverage once the broader redesign reaches task tracking, payroll, files, chat, and operations.

## 2026-06-02 - Client Side Shell Restored

### Completed

- Added a visible client setup hub at `/operations/clients`.
- Added a client-facing portal shell at `/client`.
- Wired the client area into the sidebar and the Operations page with a `Clients` tab.
- Added reusable client portal configuration for shell sections, status cards, principles, and next backend steps.
- Documented that client routes are currently frontend shells because this checkout has no client Prisma models or API routes.

### Files Changed

- `frontend/src/lib/client-portal.ts`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/Sidebar.tsx`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Do not invent client records, Prisma models, or API contracts in this pass.
- Make the client side visible immediately while clearly labeling persisted data and membership access as the next backend slice.
- Keep client data boundaries explicit: only published or assigned client-safe records should appear in the future client portal.

### How to Test

- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser smoke `/operations`, `/operations/clients`, and `/client` at desktop and mobile widths.
- `git diff --check -- frontend/src/lib/client-portal.ts frontend/src/app/operations/clients/page.tsx frontend/src/app/client/page.tsx frontend/src/app/operations/page.tsx frontend/src/components/Sidebar.tsx docs/features.md docs/dev-notes.md`

### Next Steps

- Add client organization, membership, report, calendar, and file models in a backend/database vertical slice.
- Add tenant-scoped API routes and permission checks before rendering persisted client records.

## 2026-06-02 - Full Client Portal Module Retrieved

### Completed

- Retrieved the full client portal module from the earlier client-service-tier commit instead of leaving the temporary frontend shell in place.
- Restored client Prisma models, migrations, seed data, backend client services/routes/serializers/validation, frontend client and operations route groups, reusable client portal components, hooks, libraries, and focused tests.
- Mounted the restored backend client controller at `/api/clients`.
- Restored the frontend visual smoke script and `test:visual` package script.
- Tightened shared header, sidebar, and time-clock touch targets so the restored client route visual smoke passes on desktop and mobile.
- Updated feature and API documentation to describe the restored full client portal behavior and client-safe data boundaries.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/prisma/migrations/202605240001_client_portal_foundation/migration.sql`
- `backend/prisma/migrations/202605270001_client_portal_production_records/migration.sql`
- `backend/prisma/migrations/202605270002_client_activity/migration.sql`
- `backend/prisma/migrations/202605270003_client_resource_ownership/migration.sql`
- `backend/src/main.ts`
- `backend/src/clients/*`
- `backend/tests/run-tests.ts`
- `backend/tests/clients.*.test.ts`
- `frontend/package.json`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/src/app/client/*`
- `frontend/src/app/operations/clients/*`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/TimeClock.tsx`
- `frontend/src/components/client-portal/*`
- `frontend/src/components/workspace/ProductionWorkspace.tsx`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `frontend/src/hooks/useClientPortalWorkspace.ts`
- `frontend/src/lib/client-*.ts`
- `frontend/tests/client-*.test.mjs`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Restore the existing proven client portal module from repository history rather than rebuilding it from scratch.
- Preserve the current MyDeskii command-center shell and sidebar styling while bringing back the deeper client functionality.
- Keep client-safe serialization, tenant membership checks, server-derived ownership, and internal/client visibility boundaries as the client module contract.

### How to Test

- `npm --prefix backend run prisma:generate`
- `npx prisma validate` from `backend/`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix backend run build`
- `npm --prefix backend test`
- Browser smoke `/operations/clients`, `/client`, `/client/reports`, and focused client operations routes at desktop and mobile widths.

### Next Steps

- Apply restored migrations to any real database environment before relying on live client records.
- Verify demo client login and membership access against the target database.
- Continue route-by-route visual polish so the restored client module fully matches the new MyDeskii command-center direction.

## 2026-06-02 - Generic Upload Serving Hardening

### Completed

- Hardened generic uploads so stored filenames use a sanitized basename plus a canonical extension derived from validated MIME/signature, not from the user-supplied extension.
- Added stored upload filename validation for authenticated file serving, including unsupported-extension and traversal-marker rejection.
- Set served upload `Content-Type` from the canonical extension and added `X-Content-Type-Options: nosniff`.
- Added focused helper tests for canonical upload metadata and stored filename validation.
- Added route-level upload tests for authentication, canonical `.pdf`/`.txt` storage, served MIME headers, MIME/signature mismatch rejection, unsupported extensions, and encoded traversal attempts.

### Files Changed

- `backend/src/uploads/upload.validation.ts`
- `backend/src/uploads/uploads.controller.ts`
- `backend/tests/upload.validation.test.ts`
- `backend/tests/uploads.routes.test.ts`
- `backend/tests/run-tests.ts`
- `docs/api.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept generic upload serving authenticated and dependency-free.
- Preserved compatibility for legacy timestamped filenames that include dots in the basename, while rejecting `..`, path separators, and unsupported final extensions.
- Kept response `name` as the sanitized display name with canonical extension and added `filename` for the stored object name.

### How to Test

- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm run check`
- `git diff --check`

### Next Steps

- Consider adding a body-size preflight check before base64 decoding if uploads become a high-traffic or abuse-prone endpoint.
- Consider adding persistence for uploaded file metadata if the file directory starts relying on richer file records.

## 2026-06-02 - Agent Skill Inventory Validation

### Completed

- Fixed the repo skill inventory so locked skill paths match the actual hidden `skills/.agents/skills` snapshot.
- Added a root `check:skills` script that validates every locked skill path and SHA-256 hash.
- Added the skill inventory validator to the repository CI checks.
- Added a root `README.md` as the setup and verification entry point.
- Added `docs/code-review.md` as the repo-specific review checklist for backend, frontend, auth, uploads, database, agent workflow, and release readiness.
- Expanded agent workflow docs with repo-local versus global skill policy, third-party skill trust rules, hidden skill snapshot inspection, and skill add/remove maintenance steps.

### Files Changed

- `AGENTS.md`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/agent-workflows.md`
- `docs/architecture.md`
- `docs/code-review.md`
- `docs/dev-notes.md`
- `package.json`
- `scripts/check-skills-lock.mjs`
- `skills/skills-lock.json`

### Decisions Made

- Kept repo-local skills under `skills/.agents/skills` instead of moving the snapshot, and documented `rg --hidden --files skills` for inspection.
- Treated `skills/skills-lock.json` as a repository inventory that must match the current `SKILL.md` contents.
- Kept third-party skill use conservative: useful for repeated portal workflows, reviewed before import, and not used with private portal data unless explicitly approved.

### How to Test

- `npm run check:skills`
- `npm run check`
- `git diff --check`

### Next Steps

- Before committing, decide whether all currently snapshotted third-party skills should remain repo-local or whether rarely used skills should stay global only.
- Keep `docs/code-review.md` current as new release gates or sensitive portal workflows are added.

## 2026-06-01 - Repo Agent Workflow Setup

### Completed

- Made Vibe Auto Research explicit as the default operating workflow in `AGENTS.md`.
- Added `docs/agent-workflows.md` as the repo memory for skill selection, agent delegation, verification gates, and skill maintenance.
- Documented when to use third-party skills such as `web-design-guidelines`, `improve-codebase-architecture`, `supabase-postgres-best-practices`, `gsap-frameworks`, and `ai-image-generation`.
- Updated the repo skill inventory so the local `vibe-auto-research` and `find-skills` snapshots are listed beside the curated third-party skills.

### Files Changed

- `AGENTS.md`
- `docs/agent-workflows.md`
- `docs/dev-notes.md`
- `skills/skills-lock.json`

### Decisions Made

- Kept repo-level agent behavior in `AGENTS.md` plus `docs/` instead of creating a `.codex/` folder, because no verified repo-local `.codex` convention exists in this checkout.
- Kept global Codex skills available globally, but documented only a curated repo-local skill snapshot to avoid loading irrelevant skills into every task.
- Treated `skills/skills-lock.json` as the repo inventory for curated skills.

### How to Test

- From repo root: `git diff --check`
- From repo root: validate `skills/skills-lock.json` as JSON.

### Next Steps

- If a future Codex release documents repo-local `.codex/` behavior, revisit whether this repo should add one.
- Add or remove repo-local skill snapshots only when there is a repeated portal workflow that needs them.

## 2026-06-01 - Skills And Avatar Validation Review

### Completed

- Exercised the repo-local Vibe Auto Research and parallel agent workflow against the current upload-hardening branch.
- Used two read-only explorer agents to review upload/avatar security and CI/release readiness in parallel.
- Closed the highest-risk finding by adding shared avatar value validation for user create, profile patch, and dedicated avatar update paths.
- Added tests for accepted avatar URLs/relative paths, image data URIs, unsupported schemes, MIME mismatches, oversized data URIs, and non-string avatar values.
- Fixed the repository-level CI whitespace check so GitHub Actions validates the pushed or pull-request diff range instead of checking a clean checkout.
- Added the root package audit to the root `npm run check` command and CI repository checks.

### Files Changed

- `backend/src/uploads/upload.validation.ts`
- `backend/src/users/users.controller.ts`
- `backend/tests/upload.validation.test.ts`
- `.github/workflows/ci.yml`
- `package.json`
- `docs/api.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept stored user avatars limited to http(s) URLs, relative paths, empty removal values where profile updates allow them, or validated image data URIs.
- Kept avatar validation in the uploads validation helper so every user-avatar persistence path uses the same rules.
- Kept generic upload filename/content-type hardening as a follow-up because it is a separate serving-contract change from avatar persistence validation.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- From repo root: `npm run check`
- From repo root: `git diff --check`

### Next Steps

- Derive or enforce generic upload filename extensions from validated MIME types, or persist/set validated content types when serving files.
- Consider adding Express route-level tests for upload and user avatar endpoints.

## 2026-05-31 - Workflow And Upload Hardening

### Completed

- Switched active work to the documented `v2-improvements` branch.
- Expanded GitHub Actions coverage for `v2-improvements` and added backend tests, frontend tests, frontend lint, dependency audits, Prisma validation, and repository checks to CI.
- Hardened generic upload and avatar validation so decoded content signatures must match declared file/image types.
- Updated the standalone frontend start script to run the generated standalone server.
- Removed the root package dependency sink and added a root lockfile so root-level audits have a deterministic package surface.
- Removed the Docker Compose fallback database password so local Compose validation requires explicit database and auth secrets.

### Files Changed

- `.github/workflows/backend-ci.yml`
- `.github/workflows/ci.yml`
- `backend/src/uploads/upload.validation.ts`
- `backend/src/uploads/uploads.controller.ts`
- `backend/src/users/users.controller.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/upload.validation.test.ts`
- `docker-compose.yml`
- `frontend/next.config.ts`
- `frontend/package.json`
- `package.json`
- `package-lock.json`
- `docs/api.md`
- `docs/architecture.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept upload signature checks dependency-free and focused on the file types already accepted by the API.
- Kept CI split into the existing backend, frontend, and repository-level jobs instead of introducing a new CI layout.
- Kept root dependencies out of the repo root; package dependencies remain owned by `backend/` and `frontend/`.
- Pinned the frontend Turbopack root to the frontend package so the root audit lockfile does not make Next infer the repository root during builds.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npx prisma generate`
- `cd backend && npm audit --audit-level=high`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm audit --audit-level=high`
- From repo root with temporary local secrets: `docker compose config`
- From repo root: `git diff --check`
- From repo root: `npm audit --audit-level=high`

### Next Steps

- Consider adding a focused visual smoke script to this branch after the route set stabilizes.
- Replace production `console.log` calls with a structured logger in a later backend observability pass.

## 2026-05-24 - Documentation Cleanup Before Client Portal

### Completed

- Removed completed historical Markdown artifacts that were no longer the source of truth for the current app.
- Deleted old daily report files, obsolete launch/session/audit reports, and stale backend/frontend status documents.
- Kept durable project memory in `docs/architecture.md`, `docs/features.md`, `docs/api.md`, `docs/database.md`, `docs/dev-notes.md`, `PRODUCT.md`, `DESIGN.md`, and the active frontend redesign plan.
- Updated backend and frontend READMEs so they point to the remaining source-of-truth docs instead of deleted status logs.

### Files Changed

- `backend/README.md`
- `frontend/README.md`
- `docs/architecture.md`
- `docs/dev-notes.md`
- Removed completed historical Markdown reports and status logs from the repo.

### Decisions Made

- Keep one concise project memory system instead of preserving every completed report as a root or package-level Markdown file.
- Preserve active product/design direction because it will guide client portal work.
- Treat `docs/dev-notes.md` as the place for session history instead of creating new one-off report files.

### How to Test

- `rg --files -g '*.md'`
- `git status --short`
- `git diff --check`

### Next Steps

- Run the normal backend/frontend readiness checks before starting the client portal vertical slice.
- Keep future client portal planning in the existing docs instead of adding extra standalone report files.

## 2026-05-24 - Daily Log Department And EOD Report Posting

### Completed

- Added backend department resolution for Daily Logs so employee logs derive department from the authenticated user's assigned role.
- Blocked non-privileged department spoofing while preserving manager/admin department overrides.
- Updated the Daily Logs form so regular employees see their assigned department as a locked field.
- Fixed Task Tracking's `Generate EOD Report` flow to post structured task objects into Daily Logs instead of task ID strings.
- Made EOD shift notes optional so a user can post the generated report without adding notes.
- Hardened Daily Logs review summaries so older malformed task arrays no longer crash the page.
- Added regression coverage for backend department resolution and frontend task-report payload mapping.
- Browser-smoked the Task Tracking EOD modal and `/daily-logs?new=1` modal after the legacy task fix.

### Files Changed

- `backend/src/daily-logs/daily-logs.controller.ts`
- `backend/src/daily-logs/daily-logs.department.ts`
- `backend/tests/daily-logs.department.test.ts`
- `backend/tests/run-tests.ts`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/components/tasks/LogReportModal.tsx`
- `frontend/src/lib/daily-log-review.ts`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/tests/daily-log-review.test.mjs`
- `frontend/tests/daily-log-task-import.test.mjs`

### Decisions Made

- Kept `POST /daily-logs` as the single endpoint for both manual Daily Logs and Task Tracking generated reports.
- The backend remains the source of truth for Daily Log department assignment; frontend locking is only UX support.
- Used existing React Query cache invalidation instead of adding a new daily-log event path.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- From repo root: `git diff --check`
- Browser smoke: open Task Tracking, click `Generate EOD Report`, confirm the report can post to Daily Logs and the created log shows linked task entries.

### Next Steps

- Add a browser smoke script that creates and then cleans up a generated EOD daily log in a test database.
- Continue redesigning the Task Tracking and Daily Logs surfaces as one connected workflow.

## 2026-05-24 - Frontend Redesign Foundation Pass

### Completed

- Added product and design context files for MyDeskii so future frontend work has a stable design direction.
- Added a route-by-route frontend redesign plan covering foundation, shell, auth, dashboard, task logs, payroll, collaboration, files, and admin screens.
- Updated global visual tokens for the restrained light product theme, semantic states, 8px radius, compact app typography, and faster interaction easing.
- Refined shared Card and Button components so panels, actions, focus states, and press feedback feel consistent.
- Remodeled the app shell with a wider desktop sidebar, cleaner header, improved route titles, mobile drawer behavior, and profile footer.
- Polished login and signup pages, including clearer signup role helper text and a non-emoji account-submitted state.
- Improved the dashboard first viewport, metrics, attention rows, quick links, chat surface, and quick actions while preserving existing data behavior.

### Files Changed

- `PRODUCT.md`
- `DESIGN.md`
- `docs/frontend-redesign-plan.md`
- `docs/dev-notes.md`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/login/login.module.css`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/Card.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/ThemeToggle.tsx`
- `frontend/src/components/TimeClock.tsx`
- `frontend/src/lib/design-tokens.ts`

### Decisions Made

- Treat MyDeskii as a product UI with restrained color, familiar navigation, and clear state handling rather than a decorative redesign.
- Keep using the existing Next.js, Tailwind CSS v4, Geist, and `lucide-react` stack for this pass.
- Avoid new dependencies and avoid changing backend API contracts.
- Use system Chrome for visual smoke tests because Playwright's bundled Chromium executable is not installed locally.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: `/signup` shows department options and keeps role disabled until a department is selected.
- Browser smoke: local admin login reaches `/dashboard` with no console errors on desktop or mobile widths.
- From repo root: `git diff --check`

### Next Steps

- Redesign Task Tracking and Daily Logs as one workflow, including the finish-task to daily-log handoff with optional notes.
- Continue with Payroll Calendar and employee approval review polish.
- Add route-level visual QA screenshots before merging a larger frontend redesign branch.

## 2026-05-22 - Release Readiness Verification

### Completed

- Removed the obsolete top-level Docker Compose `version` field so `docker compose config` no longer emits the Compose version warning.
- Fixed invalid chat sidebar markup by making the direct-message delete action a sibling of the row button instead of a nested button.
- Re-ran backend, frontend, Prisma, audit, Compose, and browser smoke checks after the markup fix.
- Verified authenticated local smoke routes for dashboard, task tracking, daily logs, payroll calendar, announcements, chat, and file directory.
- Opened draft PR #1 from `v2-improvements` to `main` and confirmed GitHub backend/frontend CI plus Vercel deployment checks passed.

### Files Changed

- `docker-compose.yml`
- `frontend/src/components/chat/ChatSidebar.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Kept the chat sidebar behavior unchanged and only corrected the HTML structure that caused the hydration warning.
- Used temporary local placeholder secrets for Compose validation only; production still requires real `JWT_SECRET` and `REFRESH_TOKEN_SECRET` values.
- Used installed system Chrome for the browser smoke pass because the Playwright bundled Chromium executable was not installed locally.
- Public preview URLs are protected by Vercel Authentication, so unauthenticated HTTP smoke tests cannot reach the frontend or backend preview from this machine.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npm audit --audit-level=high`
- `cd backend && npx prisma validate`
- `cd backend && npm run prisma:generate`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm audit --audit-level=high`
- From repo root with temporary local secrets: `docker compose config`
- From repo root: `git diff --check`
- Browser smoke through system Chrome against local `http://localhost:3000` and `http://localhost:4000`.
- PR checks for draft PR #1: backend CI, frontend CI, and Vercel preview deployments.

### Next Steps

- Run the same smoke flow against the public preview/staging URL after Vercel Authentication is available or a preview bypass token is configured.
- Public/staging smoke should especially verify auth, WebSocket chat, uploads/file-directory, OAuth/email, and production env/CORS behavior.

## 2026-05-22 - Signup Role Options Fix

### Completed

- Fixed signup role loading so the frontend uses role options returned with the selected department instead of relying on a separate roles fetch.
- Added backend fallback signup role options for known org-chart departments when a department exists but has no configured role rows yet.
- Kept signup validation server-side so fallback roles are only accepted for the matching department name and unknown roles are still rejected.
- Added regression coverage for department role selection and Website Developers fallback role validation.

### Files Changed

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/signup-role-options.ts`
- `backend/src/departments/departments.service.ts`
- `backend/tests/signup.requests.test.ts`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/lib/signup-options.ts`
- `frontend/tests/signup-options.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Did not mutate or clear database contents; the fix works with existing department rows and configured roles.
- Preserved configured database roles when they exist, and only uses fallback roles for departments with no role rows.
- Used local Engineering data for the browser smoke test because the local seed database does not include the Website Developers department.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- From repo root: call `http://localhost:3000/api/departments` and confirm each department includes `availableRoles`.
- Browser smoke: open `http://localhost:3000/signup`, select a department, and confirm the Role dropdown enables with role choices.

### Next Steps

- On staging/production, verify the Website Developers department row now exposes the fallback role list in signup.
- Optionally seed official `AvailableRole` rows for the org-chart departments so the database becomes the long-term source of truth.

## 2026-05-22 - Public Auth Noise Fix

### Completed

- Guarded the global socket/notification provider so unauthenticated public pages no longer fetch protected notification or chat unread endpoints.
- Stopped stale or missing auth state from opening a socket connection with an invalid token.
- Verified fresh unauthenticated visits to `/`, `/login`, and `/signup` no longer produce 401 console errors.

### Files Changed

- `frontend/src/context/SocketContext.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Kept protected notification/chat loading for authenticated sessions only.
- Did not change backend auth rules; protected endpoints still require valid tokens.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke with a fresh context against `/`, `/login`, and `/signup`.

### Next Steps

- After logging in locally, smoke protected pages again with a valid session to verify notifications and chat unread counts still load.

## 2026-05-22 - MyDeskii Shell Remodel Foundation

### Completed

- Audited protected MyDeskii pages locally with the admin session: dashboard, task tracking, daily logs, payroll, chat, file directory, operations, and announcements.
- Captured the Open Design direction from the real app structure and audit notes.
- Tightened the shared shell header for mobile so the dashboard no longer overflows horizontally.
- Reduced the dashboard command-center stretch and tightened spacing as the first implementation pass toward the Open Design-inspired workspace direction.

### Files Changed

- `frontend/src/components/Header.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Started with the shared shell and dashboard because every protected page inherits that rhythm.
- Kept the pass conservative: no route rewrites, no backend changes, and no broad redesign of task/log/payroll internals yet.
- Kept the Open Design direction as a reference prompt rather than a direct clone of Open Design's product UI.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke with admin login against `/dashboard` on desktop and mobile widths.

### Next Steps

- Use the current product/design docs for richer screen mockups when needed.
- Continue implementation with the app shell/nav system, then task tracking, daily logs, and payroll in that order.

## 2026-05-20 - Session Summary

### Completed

- Captured the May 20 flaw report and remediation backlog in project notes.
- Fixed the backend TypeScript build blocker in file-directory auth typing.
- Centralized file-directory admin email bypass checks through `isAdminEmail()`.
- Fixed frontend signup to call `/backend-auth/signup`.
- Fixed refresh-token storage after login and cleanup during logout.
- Prevented non-privileged self-updates of protected employee fields.
- Removed generic user-update auto-approval side effects.
- Fixed frontend lint errors in payroll reports, log-report modal, and `test-fetch.ts`.
- Hardened Docker/CI runtime configuration around Node version and auth secrets.
- Added Socket.io JWT verification and conversation room authorization.

### Files Changed

- `.github/workflows/backend-ci.yml`
- `.github/workflows/ci.yml`
- `.gitignore`
- `backend/.env.example`
- `backend/Dockerfile`
- `backend/src/file-directory/file-directory.controller.ts`
- `backend/src/notifications/socket.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `docker-compose.yml`
- `docs/dev-notes.md`
- `frontend/Dockerfile`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/components/payroll/ReportsTab.tsx`
- `frontend/src/components/tasks/LogReportModal.tsx`
- `frontend/src/lib/api.ts`
- `frontend/test-fetch.ts`

### Decisions Made

- Treat the audit report as the remediation tracker instead of reviving deleted root report files.
- Keep the first code pass focused on build reliability, auth/session mismatches, approval bypass prevention, and socket access control.
- Use explicit required Docker Compose secrets instead of unsafe default JWT secrets.
- Do not untrack root `node_modules/` yet because that requires an index cleanup command.

### How to Test

- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- From repo root, set `JWT_SECRET` and `REFRESH_TOKEN_SECRET`, then run `docker compose config`.

### Next Steps

- Add safe serializers for auth/user API responses.
- Restrict broad user list/detail endpoints.
- Rework signup so requested role/department do not create active authorization roles before approval.
- Create a baseline Prisma migration after confirming the current schema is the intended baseline.
- Clean the remaining frontend lint warnings in feature-sized batches.

## 2026-05-20 - Task Tracking Assignment Pass

### Completed

- Added server-side task assignment authorization.
- Added employee self-assignment defaults in task creation.
- Added manager/admin `Assign to me` support and assignee-based role/department autofill.
- Added a small task permission regression test.

### Files Changed

- `backend/package.json`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.permissions.ts`
- `backend/tests/tasks.permissions.test.ts`
- `docs/api.md`
- `docs/features.md`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/lib/task-access.ts`
- `frontend/src/lib/tasks.ts`

### Decisions Made

- No schema change for this pass.
- Non-privileged users cannot submit or update task assignment fields.
- New employee tasks derive assignment from `UserRole`.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- In the app, open `/task-tracking`, create a task as a normal employee, and confirm assignment is shown as the logged-in user instead of manual fields.

### Next Steps

- Add backend read scoping for employee task lists if task visibility should be private.
- Consider adding a creator/requester field to tasks if employees need to request work for later assignment.

## 2026-05-21 - Portal Quality-of-Life Sweep

### Completed

- Ran a route sweep across the main authenticated portal pages.
- Fixed the profile page so it uses the shared authenticated user context instead of a stale `/api/auth/me` request.
- Added accessible labels and tooltips to the task-tracking view toggle buttons.
- Removed a hydration warning source from the auth loading spinner and suppressed the expected theme attribute mismatch.
- Moved USD-to-PHP exchange-rate loading behind a local Next route to avoid browser CORS failures.

### Files Changed

- `docs/dev-notes.md`
- `frontend/src/app/internal/exchange-rate/route.ts`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/lib/exchange-rate.ts`

### Decisions Made

- Keep the profile page tied to `UserContext` so session verification stays in one place.
- Keep browser-blocked external data calls behind local server routes.
- Treat the remaining lint warnings as feature-sized cleanup batches instead of mixing them into this focused fix.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Open `/profile` and confirm the signed-in user details load without the failed-profile message.
- Open `/task-tracking` and confirm the list, card, and calendar view buttons still switch views.
- Watch the browser console for exchange-rate CORS failures and hydration warnings.

### Next Steps

- Clean the existing frontend lint warnings in small batches.
- Add safer confirmation patterns around destructive admin actions in Operations.
- Add visible fallback status where exchange rates are displayed, if finance/payroll users need to know when the fallback rate is active.

## 2026-05-21 - Daily Logs Task Import

### Completed

- Added a tested daily-log task-import helper.
- Added a frontend test command for focused Node-based utility tests.
- Added `Import from Task Tracking` to the Add Daily Log modal.
- Daily logs can now import completed and in-progress tasks assigned to the logged-in user for the selected log date.
- Kept manual task entry available for work that was not tracked as a task.

### Files Changed

- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/package.json`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/hooks/useTasksQuery.ts`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/tests/daily-log-task-import.test.mjs`

### Decisions Made

- No database schema change for this pass.
- Import only `completed` and `in_progress` task statuses.
- Use selected log date against task `updatedAt`, `dueDate`, and `startDate` until task work sessions or completion timestamps exist.
- Prevent duplicate imports by tracking imported tasks as `task:<taskId>` in the daily-log task list.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Open `/daily-logs`, click `Add Log`, and confirm Task Tracking suggestions can be imported into the task list.

### Next Steps

- Add task completion timestamps or work-session records if daily logs need exact "worked today" reporting instead of date heuristics.
- Consider linking imported daily-log tasks back to their source task detail view.

## 2026-05-21 - Task Visibility, Approval, Sessions, and QoL

### Completed

- Scoped backend task reads so employees only see their assigned tasks.
- Kept signup role/department requests pending until approval and blocked pending logins.
- Added `Task.completedAt` and `TaskWorkSession` history for completed/running task timers.
- Updated Daily Logs task import to prefer `completedAt`.
- Replaced Operations destructive `confirm()` prompts with typed confirmation modals.
- Cleaned remaining frontend lint warnings across touched support screens.
- Removed the Prisma migration ignore rule so migration SQL files are tracked.

### Files Changed

- `backend/.gitignore`
- `backend/package.json`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605210001_task_sessions_signup_requests/migration.sql`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/signup.requests.ts`
- `backend/src/employees/employees.service.ts`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.permissions.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/signup.requests.test.ts`
- `backend/tests/tasks.permissions.test.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/src/lib/tasks.ts`

### Decisions Made

- Preserve the existing task ownership model and scope employee reads by `assigneeId`.
- Keep requested signup role data on `EmployeeProfile` until explicit approval.
- Store task timer sessions as history rows instead of trying to infer all work from the current task timer fields.
- Use typed confirmation for destructive Operations actions without deleting anything during UI smoke testing.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- API smoke: create temporary signup users, approve them, verify pending-login block, task read scoping, `completedAt`, and `TaskWorkSession` creation.
- Browser smoke: open `/operations`, start a delete flow, and confirm Delete enables only after typing the exact target name.

### Next Steps

- Add a visible task-session history panel if managers need to audit per-task work time.
- Consider adding a task requester/creator field if employees need to request tasks for later assignment.

## 2026-05-21 - Task Detail Work History

### Completed

- Exposed task work-session history from `GET /api/tasks/:id`.
- Added a task detail modal with assignment, dates, progress, tracked-vs-estimated time, and work history.
- Changed board, list, and calendar task clicks to open details first; editing now starts from `Edit Task`.
- Added task work-history helper coverage for duration formatting, newest-first session sorting, and estimate summaries.

### Files Changed

- `backend/src/tasks/tasks.service.ts`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskCalendarView.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/hooks/useTasksQuery.ts`
- `frontend/src/lib/task-work-history.ts`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/tests/task-work-history.test.mjs`

### Decisions Made

- Reused the existing task detail endpoint instead of adding a separate work-history route.
- Kept work sessions out of task list responses so the board/list/calendar views stay lightweight.
- Kept the existing edit modal and made the detail modal the default read path.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && npm test`
- `cd backend && npm run build`
- API smoke: create a temporary task, start/pause its timer, verify `GET /api/tasks/:id` returns `workSessions`, then delete the task.
- Browser smoke: open `/task-tracking`, search a temporary task, click it, and confirm the detail modal shows `Work History`.

### Next Steps

- Add a direct deep link to a task detail modal if notifications should open a specific task.
- Consider showing session history inside Daily Logs import previews when managers need per-day audit context.

## 2026-05-21 - Payroll Calendar Day Review QoL

### Completed

- Added a tested payroll day-audit helper for date filtering, sorted entries, daily totals, and QA warnings.
- Replaced the basic calendar date event panel with a day review panel showing payroll status, warnings, time entries, and events.
- Added typed confirmation before deleting a time entry from Payroll Calendar.
- Browser-smoked the workflow with a temporary time entry and confirmed the delete action stays disabled until `DELETE` is typed.

### Files Changed

- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/components/payroll/CalendarTab.tsx`
- `frontend/src/components/payroll/PayrollDayDetailPanel.tsx`
- `frontend/src/components/payroll/TimeEntryDeleteModal.tsx`
- `frontend/src/lib/payroll-calendar/day-audit.ts`
- `frontend/tests/payroll-day-audit.test.mjs`

### Decisions Made

- Kept this pass frontend-focused and avoided changing payroll API contracts.
- Split day review and delete confirmation into dedicated components instead of expanding `CalendarTab.tsx` further.
- Used warnings as review signals rather than blocking payroll actions in this pass.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: create a temporary time entry, open `/payroll-calendar`, click its date, confirm `Payroll day review` appears, open delete confirmation, type `DELETE`, and confirm the delete button enables.

### Next Steps

- Harden backend payroll profile field permissions so employees cannot update sensitive payroll fields.
- Add edit support for manual time entries instead of requiring delete-and-recreate.

## 2026-05-21 - Payroll Permissions and Time Entry Editing

### Completed

- Centralized payroll management access checks for time entries, payslip preview/config reads, payslip reads, and payroll profile updates.
- Blocked non-privileged users from updating protected payroll profile fields such as salary, currency, bank account, and tax ID.
- Added backend support for `PATCH /api/payroll/entry/:id` with owner checks, privileged reassignment, and time-range validation.
- Added frontend edit support for manual time entries from today's entry list and the day review panel.
- Added focused backend and frontend regression tests for payroll permissions and time-entry form defaults/validation.

### Files Changed

- `backend/src/payroll/payroll.controller.ts`
- `backend/src/payroll/payroll.permissions.ts`
- `backend/src/payroll/payroll.service.ts`
- `backend/tests/payroll.permissions.test.ts`
- `backend/tests/run-tests.ts`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/components/payroll/AddTimeEntryModal.tsx`
- `frontend/src/components/payroll/CalendarTab.tsx`
- `frontend/src/components/payroll/PayrollDayDetailPanel.tsx`
- `frontend/src/lib/payroll-calendar/day-audit.ts`
- `frontend/src/lib/payroll-calendar/time-entry-form.ts`
- `frontend/src/lib/payroll-calendar/usePayrollData.ts`
- `frontend/src/lib/time-entries.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/tests/payroll-time-entry-form.test.mjs`

### Decisions Made

- Keep payroll authorization server-side and reuse a small permission helper rather than relying on hidden frontend controls.
- Treat compensation, banking, tax, payroll frequency, employment type, and job title as protected payroll profile fields.
- Reuse the add-time-entry modal for editing to avoid duplicate form behavior.
- Keep day-review warnings advisory for now; they do not block editing or deletion.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- API smoke: create a temporary approved employee, verify self-only payroll access, protected field rejection, own-entry edit, reassignment rejection, privileged config update, privileged entry update, and cleanup.
- Browser smoke: open `/payroll-calendar`, edit a temporary time entry through the modal, verify the backend notes changed, then clean up the entry.

### Next Steps

- Add an employee selector/filter to Payroll Calendar for management day audits.
- Consider adding a payroll audit log for sensitive profile and time-entry corrections.

## 2026-05-21 - Dashboard Command Center

### Completed

- Reworked Dashboard into a role-aware command center.
- Added live summary metrics for tracked time, visible tasks, in-progress work, completed-today tasks, overdue tasks, approvals, and daily-log status.
- Added a `Needs Attention` panel for approvals, payroll warnings, overdue tasks, missing daily logs, and no tracked time.
- Added richer quick actions for tasks, daily logs, payroll review, and management approvals.
- Added tested dashboard summary logic so the page does not own all metric and attention-item rules.

### Files Changed

- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/lib/dashboard-summary.ts`
- `frontend/src/lib/employees.ts`
- `frontend/tests/dashboard-summary.test.mjs`

### Decisions Made

- Reused existing task, time-entry, daily-log, and pending-employee APIs instead of adding new backend endpoints.
- Treated dashboard management access as admin, administrator, manager, operations manager, and chief operations officer.
- Kept quick actions as route-level jumps for this pass rather than opening cross-page modals from Dashboard.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: open `/dashboard`, confirm command-center copy, `Needs Attention`, metrics, and quick actions render.
- Responsive smoke: verify `/dashboard` at mobile and desktop widths has no horizontal overflow.

### Next Steps

- Add deep links or query params so Dashboard quick actions can open the exact target modal, such as Add Daily Log or Employee Overview pending approvals.

## 2026-05-21 - Dashboard Workflow Deep Links

### Completed

- Added shared Dashboard deep-link constants and query-param helpers.
- Updated Dashboard quick actions and attention links to target exact workflows.
- Added create-modal deep-link handling for Task Tracking and Daily Logs.
- Added Payroll Calendar tab/view deep-link handling for calendar review and pending employee approvals.

### Files Changed

- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/payroll/EmployeeOverviewTab.tsx`
- `frontend/src/lib/dashboard-deep-links.ts`
- `frontend/src/lib/dashboard-summary.ts`
- `frontend/tests/dashboard-deep-links.test.mjs`
- `frontend/tests/dashboard-summary.test.mjs`

### Decisions Made

- Kept query-param parsing in a small shared helper instead of scattering route strings across pages.
- Consumed create-modal deep links once per page load so closing the modal does not reopen it.
- Guarded management-only payroll tabs so non-management users fall back to the calendar tab.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: from `/dashboard`, click Create Task, Add Daily Log, Review Payroll, and Approvals; confirm each route opens the intended workflow state.

### Next Steps

- Add task-filter deep links for overdue/in-progress dashboard attention items.
- Consider replacing anchor-based attention links with router navigation for consistent client-side transitions.

## 2026-05-21 - Release Readiness Dependency Check

### Completed

- Ran high-severity dependency audits for backend and frontend before pushing to `main`.
- Applied non-breaking audit fixes to backend and frontend dependency locks.
- Updated frontend Next.js and matching ESLint config to `16.2.6` to clear high-severity Next.js advisories.
- Added targeted npm overrides for Prisma's transitive `@hono/node-server` and Next's nested `postcss` advisory.
- Deferred report-file cleanup until explicit approval so it stayed out of that release.
- Fixed the payroll audit target test assertion and cleaned the remaining payroll data hook lint warning.
- Re-ran tests, lint, builds, Prisma validation/generation, Docker Compose config, and Git whitespace checks after dependency updates.

### Files Changed

- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/lib/payroll-calendar/usePayrollData.ts`
- `frontend/tests/payroll-audit-target.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Treat high and critical dependency audit findings as release blockers.
- Use targeted npm overrides instead of `npm audit fix --force` when the force recommendation would downgrade or otherwise make a breaking package change.
- Keep documentation/report deletions out of the release unless they are explicitly requested.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npm audit`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm audit`

### Next Steps

- Re-run the same release checks immediately before committing or pushing.

## 2026-05-21 - Task Ownership, Daily Log Import, and Payroll Audit Completion

### Completed

- Added task requester ownership with `Task.createdById`, creator relations, additive Prisma migration, backend read visibility, and task notification/detail deep links.
- Added Dashboard-to-Task Tracking filters for overdue and in-progress task attention items.
- Added `/task-tracking?task=:taskId` detail modal loading for readable tasks.
- Tightened Daily Logs task import so completed tasks require `completedAt` for the selected date, while in-progress assigned tasks are still suggested.
- Switched task modal role options to backend department `availableRoles`.
- Sanitized user directory responses so password/reset fields and sensitive payroll profile fields are not returned.
- Added Payroll Calendar employee audit selection for management users, including `?userId=` support and audit-mode clock controls.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605210002_task_creator/migration.sql`
- `backend/src/departments/departments.service.ts`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.permissions.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.security.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/tasks.permissions.test.ts`
- `backend/tests/users.security.test.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/payroll/CalendarTab.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/src/lib/dashboard-deep-links.ts`
- `frontend/src/lib/dashboard-summary.ts`
- `frontend/src/lib/payroll-calendar/audit-target.ts`
- `frontend/src/lib/payroll-calendar/usePayrollData.ts`
- `frontend/src/lib/task-deep-links.ts`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/tests/daily-log-task-import.test.mjs`
- `frontend/tests/dashboard-deep-links.test.mjs`
- `frontend/tests/dashboard-summary.test.mjs`
- `frontend/tests/payroll-audit-target.test.mjs`
- `frontend/tests/task-deep-links.test.mjs`

### Decisions Made

- Kept task requester identity server-controlled by setting `createdById` from the authenticated user on task creation.
- Preserved assignment semantics: `assigneeId` remains the worker/current owner, while `createdById` supports requester visibility.
- Kept Daily Logs imports conservative for completed work so due dates and update dates do not create false completed-task logs.
- Reused the existing payroll time-entry API permission model for manager/admin calendar audits instead of adding a new endpoint.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run prisma:generate`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: open `/payroll-calendar?tab=calendar&userId=:userId`, confirm audit mode hides clock-in/out and shows the selected employee's entries.
- Browser smoke: open `/daily-logs?new=1`, confirm the Add Daily Log modal opens and the import copy references completed and in-progress assigned tasks.
- Browser smoke: open `/task-tracking?filter=overdue`, confirm Task Tracking loads with the filtered URL and no console errors.

### Next Steps

- Add richer task-detail route state, such as opening a task detail from notification history after page refresh.
- Add manager daily-log review helpers that preview imported task sessions and review-status items without automatically mixing them into employee self-reports.

## 2026-05-21 - Workflow Polish and Review Helpers

### Completed

- Added shared role-access helpers for management checks used by payroll and daily-log review screens.
- Added Task Tracking filter labels, result counts, clear-filter behavior, and unavailable-task link warnings.
- Added Payroll Calendar management audit controls for employee search, start/end date filtering, and correction-note context.
- Added Daily Logs manager review summaries plus optional review-stage task suggestions with session preview data.
- Fixed the shared modal wrapper so modals use the full viewport on narrow screens instead of being offset by the desktop sidebar.
- Added focused regression tests for role access, task filter clearing, payroll audit ranges, and daily-log review/import behavior.

### Files Changed

- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/payroll/AddTimeEntryModal.tsx`
- `frontend/src/components/payroll/CalendarTab.tsx`
- `frontend/src/components/Modal.tsx`
- `frontend/src/lib/daily-log-review.ts`
- `frontend/src/lib/daily-log-task-import.ts`
- `frontend/src/lib/payroll-calendar/audit-target.ts`
- `frontend/src/lib/payroll-calendar/usePayrollData.ts`
- `frontend/src/lib/role-access.ts`
- `frontend/src/lib/task-deep-links.ts`
- `frontend/tests/daily-log-review.test.mjs`
- `frontend/tests/daily-log-task-import.test.mjs`
- `frontend/tests/payroll-audit-target.test.mjs`
- `frontend/tests/role-access.test.mjs`
- `frontend/tests/task-deep-links.test.mjs`

### Decisions Made

- Keep review-status task suggestions separate from bulk daily-log import to avoid polluting employee self-reports.
- Preserve URL-driven workflow state for task filters and payroll audit filters so dashboard links and refreshes remain useful.
- Reuse the existing payroll time-entry API and permission model; this pass did not add new endpoints.
- Centralize management-role normalization in a frontend helper so UI checks stay consistent across pages.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: open `/task-tracking?filter=overdue`, confirm the filter banner appears and `Clear filter` removes only the filter query parameter.
- Browser smoke: open `/payroll-calendar?tab=calendar&userId=:userId&start=YYYY-MM-DD&end=YYYY-MM-DD`, confirm employee search and date range controls drive the audit view.
- Browser smoke: open `/daily-logs?new=1`, confirm completed/in-progress task imports remain available and review-stage tasks are shown separately when present.

### Next Steps

- Add durable audit-history storage for payroll corrections if managers need immutable correction trails.
- Consider linking daily-log task badges directly back to the Task Tracking detail modal when cross-page navigation is acceptable.

## 2026-05-21 - Documentation Refresh

### Completed

- Added a current architecture overview for backend, frontend, data model, access control, and verification commands.
- Updated API notes to include current auth, OAuth, users, employees, task visibility, daily-log, payroll, chat, upload, and notification behavior.
- Expanded database notes for migrations, identity/authorization, available roles, daily-log task JSON, payroll records, and collaboration/file data.
- Refreshed the release-state notes so they reflect the pushed release instead of the earlier uncommitted worktree snapshot.
- Marked the May 20 audit findings as a historical backlog and listed the remaining cleanup items after the release.

### Files Changed

- `docs/architecture.md`
- `docs/api.md`
- `docs/database.md`
- `docs/dev-notes.md`

### Decisions Made

- Keep `docs/features.md` unchanged because it already matches the current workflow behavior.
- Keep the old audit findings as historical evidence, but add a clear current-status section to avoid treating fixed blockers as active risks.
- Document current API and database behavior from controllers, helper files, and Prisma schema rather than from older report text.

### How to Test

- `git diff --check`
- Review the changed Markdown files for stale release-state claims.

### Next Steps

- Add or refresh a root `README.md` if the repo should have a short setup entry point.
- Keep docs updated whenever API contracts, schema behavior, or cross-page workflow deep links change.

## 2026-05-23 - Backend Readiness and Approval Safety Pass

### Completed

- Ran the full backend/frontend readiness suite and fixed the remaining npm audit advisory by refreshing lockfile-resolved dependency versions.
- Verified the local database still has an approved admin account, departments, signup role options, and no approved users without roles.
- Hardened employee approval so pending accounts cannot become approved unless a role/department assignment can be created or preserved.
- Improved the employee approval UI error toast so backend approval errors are shown to managers.
- Started local dev servers and smoke-tested backend health, frontend login, public signup department options, and protected no-auth route responses.

### Files Changed

- `backend/package-lock.json`
- `backend/src/auth/signup.requests.ts`
- `backend/src/employees/employees.controller.ts`
- `backend/src/employees/employees.service.ts`
- `backend/tests/signup.requests.test.ts`
- `frontend/package-lock.json`
- `frontend/src/components/payroll/EmployeeOverviewTab.tsx`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the database unchanged during readiness checks; old pending accounts missing requested role data should be fixed through an explicit admin decision, not automatic inference.
- Allow approval to preserve an existing role assignment for older pending records, but block approval when no role/department source exists.
- Treat moderate dependency advisories as worth fixing when `npm audit fix` is patch-level and verification remains green.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npm run prisma:generate`
- `cd backend && npm audit --audit-level=high`
- `cd backend && npm ci --dry-run`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm audit --audit-level=high`
- `cd frontend && npm ci --dry-run`
- `docker compose config` with temporary local `JWT_SECRET` and `REFRESH_TOKEN_SECRET`
- `git diff --check`
- Live smoke: `GET /health`, `/login`, public `/api/departments`, and unauthenticated protected routes.

### Next Steps

- Manually decide whether to reject or repair old pending applications that have no requested role/department.
- Add route-level integration tests for employee approval responses if the backend test harness is expanded beyond helper-level checks.

## 2026-05-21 - Source-Based Security Cleanup

### Completed

- Re-checked the active source code instead of relying on older backlog notes.
- Added auth serializers for `/auth/login`, `/auth/me`, and OAuth callbacks so password and reset-token fields are not returned.
- Blocked OAuth token issuance for pending/unapproved users and made new OAuth users pending by default.
- Revalidated refresh-token requests against the current user approval state before issuing a new access token.
- Restricted pending/deployed employee review endpoints to employee-management access and serialized employee responses.
- Stopped public employee verification responses from returning raw user records.
- Tightened directory user serialization to public fields only.
- Restricted employee-created company-wide chat/channel conversations.
- Replaced public `/uploads` static serving with authenticated `/api/uploads/files/:filename` access for future generic uploads.
- Removed tracked root `node_modules`, `backend/debug_output.txt`, and `backend/final_list.txt` from the git index without deleting local files.

### Files Changed

- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.security.ts`
- `backend/src/auth/strategies/discord.strategy.ts`
- `backend/src/auth/strategies/google.strategy.ts`
- `backend/src/chat/chat.controller.ts`
- `backend/src/chat/chat.permissions.ts`
- `backend/src/employees/employees.controller.ts`
- `backend/src/employees/employees.security.ts`
- `backend/src/employees/employees.service.ts`
- `backend/src/main.ts`
- `backend/src/uploads/uploads.controller.ts`
- `backend/src/users/users.security.ts`
- `backend/tests/auth.security.test.ts`
- `backend/tests/chat.permissions.test.ts`
- `backend/tests/employees.security.test.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/users.security.test.ts`
- `docs/dev-notes.md`

### Decisions Made

- Keep management payroll/employee views able to see salary data, but only behind employee-management access.
- Keep direct and ordinary group chat creation available to employees; reserve channels and `General`/`Global` style company-wide conversations for management.
- Leave local debug/dependency files on disk and only remove them from version control.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && npm audit --audit-level=high`
- `cd frontend && npm audit --audit-level=high`

### Next Steps

- Add integration tests around the actual Express routes for auth, employees, uploads, and chat.
- Consider moving browser tokens from localStorage to httpOnly cookies in a later auth hardening pass.

## 2026-06-06 - Session Summary

### Completed

- Removed the horizontal client portal section nav from client-facing pages so client users navigate the portal from the sidebar only.
- Kept the admin client operations top navigation unchanged under `/operations/clients`.

### Files Changed

- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Treated the removable "top nav" as the duplicate client portal horizontal nav, not the global page header or the admin client operations nav.
- Left `ClientPortalTopNav` in place for now instead of deleting the component file, because the request was scoped to removing it from the client-facing experience.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- Log in as a client user and verify `/client` and `/client/tickets` use the sidebar for client portal navigation without the horizontal nav.
- Verify `/operations/clients` still shows the admin client operations top nav.
- Browser affected-flow audit: client login, `/client`, sidebar click to Requests, and `/client/tickets`.

### Next Steps

- Delete `ClientPortalTopNav` later if no future mobile or fallback use is needed.

## 2026-06-06 - Profile Drawer Layout Fix

### Completed

- Fixed the profile drawer so its background covers the full drawer height instead of letting page content show through behind profile content.
- Moved the User ID strip into the drawer flex layout so it stays at the bottom and no longer overlaps the avatar, name, or buttons on short viewports.
- Moved profile editing onto the `/profile` page and changed the drawer Edit Profile action to route there instead of opening a second overlay.
- Extracted the profile edit form into a reusable component so the page and any future modal wrapper share one implementation.
- Fixed audit-found profile form issues so the avatar camera control meets the repo touch-target threshold and saved contact fields remain in local user state after the sanitized backend response.
- Added profile form input names, autocomplete hints, input modes, error relationships, and decorative-icon hiding during the full-feature audit follow-up.

### Files Changed

- `frontend/src/app/profile/page.tsx`
- `frontend/src/components/EditProfileModal.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/ProfileFormInput.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/lib/api.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept the change scoped to the shared profile drawer because the overlap reproduced from the drawer shell, not from client portal page content.
- Avoided stacking an edit modal above the profile drawer; profile editing now lives in the main profile route where it has stable page space.
- Left the local Socket.IO 404 as a separate runtime/server mismatch because port `4000` is currently served by another project worktree.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- Browser affected-flow audit: log in as the dummy client, open the profile drawer from `/client`, verify profile content stays inside the opaque right drawer at narrow viewport height, click Edit Profile, and verify the drawer closes while `/profile#edit-profile` shows the edit form on the page.

### Next Steps

- Restart the backend from this checkout if the dev overlay still reports Socket.IO 404s from a stale or alternate worktree process.
- For local production previews, either run `next start`/`next dev` or copy `.next/static` into the standalone bundle before `node .next/standalone/server.js`; a fresh standalone-only preview did not serve rebuilt static chunks in this audit environment.

## 2026-06-06 - Client Portal Workflow Guide

### Completed

- Added a detailed admin/client client portal workflow guide covering account setup, access, client-visible records, requests, approvals, reports, resources, assets, billing, roadmap, calendar, and client self-service workflows.
- Cross-linked the workflow guide from the client portal feature documentation.

### Files Changed

- `docs/client-portal-workflows.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Made this a dedicated operating guide instead of expanding the concise feature summary.
- Used the current source files, API docs, Prisma schema, access helpers, serializers, validation rules, and route files as the source of truth.
- Ran a read-only Browser sanity check against `127.0.0.1:3001`; both `/client` and `/operations/clients` redirected to `/login` without an authenticated session.

### How to Test

- `git diff --check -- docs/client-portal-workflows.md docs/features.md docs/dev-notes.md`
- Browser protected-route sanity check: open `http://127.0.0.1:3001/client` and `http://127.0.0.1:3001/operations/clients` while logged out and verify both route to `/login`.
- Review `docs/client-portal-workflows.md` against `/operations/clients/*` and `/client/*` routes when the frontend is running.
- For future behavior changes, run the frontend and backend checks listed in the workflow guide.

### Next Steps

- Add screenshots or short walkthrough media after demo data and a stable running portal environment are available.

## 2026-06-06 - Client Portal Workflow DOCX Export

### Completed

- Created a shareable Word document version of the client portal workflow guide for team onboarding and training.
- Formatted the DOCX as a compact operator reference with a title page, quick navigation, running header/footer, page numbers, clean headings, readable lists, and code-style route/command formatting.

### Files Changed

- `docs/Client_Portal_Workflows_Guide_Admin_Client.docx`
- `docs/dev-notes.md`

### Decisions Made

- Kept the DOCX next to the source Markdown guide so the repo documentation and shareable artifact stay together.
- Used the `compact_reference_guide` document preset because this is a dense admin/client operating manual.
- Preserved the existing workflow guide content instead of rewriting it during export.

### How to Test

- Open `docs/Client_Portal_Workflows_Guide_Admin_Client.docx` in Word.
- Confirm the document opens, page numbers render, and the admin/client workflow sections are present.
- Structural QA passed with `python-docx` by confirming required DOCX package parts, source heading coverage, and required admin/client workflow phrases.
- Word COM open check passed and reported 39 pages.

### Next Steps

- Run full rendered PNG visual QA on the DOCX if LibreOffice/soffice or another PDF rasterizer becomes available on the machine.

## 2026-06-06 - Client Portal Important Pages Table

### Completed

- Added an `Important Pages At A Glance` table to the client portal workflow guide.
- Updated the shareable DOCX with the same table near the front of the document for team onboarding.

### Files Changed

- `docs/client-portal-workflows.md`
- `docs/Client_Portal_Workflows_Guide_Admin_Client.docx`
- `docs/dev-notes.md`

### Decisions Made

- Used a four-column table so the page remains readable in Word: side, page/route, use case, and key actions.
- Included all primary admin client operations routes and all primary client portal routes.
- Kept the table near the start of the guide so new team members can find the right page before reading detailed procedures.

### How to Test

- Open `docs/Client_Portal_Workflows_Guide_Admin_Client.docx` in Word and confirm `Important Pages At A Glance` appears before the detailed workflow sections.
- Confirm the table has 19 route rows covering admin and client pages.
- Re-run structural DOCX validation after editing the table.
- Word COM open check passed and reported 40 pages.
- Full rendered PNG QA is still blocked because `render_docx.py` cannot find LibreOffice/soffice in this environment.

### Next Steps

- Add screenshots beside the table later if the team wants a more visual onboarding handout.

## 2026-06-06 - Client Portal Sidebar-Only Shell Fix

### Completed

- Removed the fixed top header from client-facing `/client` portal pages.
- Kept the admin and client-operations admin routes on the existing top-header shell.
- Removed client-route top padding reservation so the client portal uses the sidebar-only layout without a blank header gap.

### Files Changed

- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Scoped the shell change to `/client` and `/client/*` only.
- Left `/operations/clients/*` untouched because those are admin client-operations pages, not the client portal.

### How to Test

- Start the frontend and backend locally.
- Log in as a client user and open `/client`, `/client/tickets`, and another `/client/*` route.
- Confirm only the side navigation is visible on client portal routes.
- Log in as admin and open `/dashboard` or `/operations/clients` to confirm the top header still appears there.

### Next Steps

- Commit and push this focused fix after the rendered verification pass.

## 2026-06-06 - Work Dashboard Header Alignment Fix

### Completed

- Fixed the work/admin dashboard header alignment by moving the fixed `Header` outside the animated centered dashboard content wrapper.
- Preserved the admin/work dashboard top header and sidebar behavior.

### Files Changed

- `frontend/src/app/dashboard/page.tsx`
- `docs/dev-notes.md`

### Decisions Made

- The root cause was the dashboard `Header` living inside an animated wrapper that computed a transform, causing fixed positioning to anchor to the wrapper instead of the viewport.
- Kept the fix scoped to `/dashboard` because other admin routes do not wrap the fixed header in the same animated centered container.

### How to Test

- Open `/dashboard` at desktop width and confirm the top header starts immediately after the sidebar and spans the work area.
- Confirm the dashboard content remains centered below the fixed header.
- Run the focused rendered geometry check for `/dashboard`.

## 2026-06-06 - Production Deployment Configuration

### Completed

- Added a production Docker Compose file that deploys the backend, frontend, and Redis while using an external Postgres/Supabase database.
- Added production environment templates for the root Docker deploy and backend Prisma commands.
- Added a guarded production database bootstrap command for the first deployment to a verified empty database.
- Updated Prisma CLI config so migrations/bootstrap can use `DIRECT_DATABASE_URL` or `DIRECT_URL` while runtime keeps using `DATABASE_URL`.
- Updated the production GitHub Actions workflow to validate runtime secrets, sync `.env.production` files to the SSH host, optionally bootstrap an empty database, run production migrations, deploy with the production compose file, and smoke `/health`.

### Files Changed

- `.github/workflows/deploy.yml`
- `.env.production.example`
- `.gitignore`
- `docker-compose.production.yml`
- `backend/.env.production.example`
- `backend/.gitignore`
- `backend/package.json`
- `backend/prisma.config.ts`
- `backend/scripts/bootstrap-production-database.mjs`
- `docs/database.md`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Did not add a normal baseline migration because the existing historical migrations would conflict with a full current-schema baseline on a fresh database.
- Used a guarded bootstrap script instead: empty databases require `ALLOW_EMPTY_DATABASE_BOOTSTRAP=true`, existing databases go through `prisma migrate deploy`.
- Kept local `docker-compose.yml` unchanged so local Docker Postgres development remains available.

### How to Test

- Set local compose placeholders, then run `docker compose config`.
- `docker compose --env-file .env.production.example -f docker-compose.production.yml config`
- `cd backend && npx prisma validate`
- Run `npm run prisma:bootstrap-production` against a disposable empty Postgres database with `ALLOW_EMPTY_DATABASE_BOOTSTRAP=true`.
- Run the Production Deploy workflow manually after GitHub secrets and variables are configured.

### Next Steps

- Add the production GitHub secrets/variables before attempting SSH deploy.
- In Supabase, use a migration/direct connection for `DIRECT_DATABASE_URL` and the runtime connection for `DATABASE_URL`.
- Use `bootstrap_empty_database=true` only for the first deployment to a verified empty database.

## 2026-06-06 - Temporary Vercel Supabase Deploy Wiring

### Completed

- Added root Vercel configuration for deploying the monorepo from the repository root.
- Routed Vercel `/api`, `/auth`, `/backend-auth`, and `/health` traffic to the backend serverless entrypoint while leaving app routes on the frontend Next app.
- Added a backend `/backend-auth` alias so frontend relative auth requests work without changing the existing API client.
- Documented the required Vercel environment variables and Vercel limitations for Socket.io and local file uploads.

### Files Changed

- `vercel.json`
- `backend/src/main.ts`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Used repo-side Vercel config because the Vercel dashboard root-directory settings page was unreliable during browser automation.
- Kept the SSH/Docker deployment path as the full production recommendation because Vercel Functions are not a durable Socket.io runtime.

### How to Test

- Push the change to the Vercel-connected repository.
- Configure the required Vercel environment variables.
- Trigger a Vercel redeploy and verify `/`, `/login`, `/health`, and a login request.

### Next Steps

- Add Vercel project environment variables before expecting auth/API routes to boot.
- Use a persistent Node deployment target for full realtime chat and durable upload behavior.

## 2026-06-06 - Client Portal Performance First Pass

### Completed

- Added a production-safe realtime feature flag so Socket.io is not opened when the deployment does not support persistent websocket transport.
- Added a client portal bootstrap endpoint that returns visible organizations, selected organization, overview, activity, and action queue data in one request.
- Updated the client portal workspace hook and main `/client` page to hydrate from the bootstrap endpoint and skip the duplicate first overview refetch.
- Documented the new API route and Vercel realtime behavior.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `frontend/src/context/SocketContext.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/hooks/useClientPortalWorkspace.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/config.ts`
- `docs/api.md`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Left Prisma indexes unchanged in this pass because the first performance win is reducing failed realtime connections and route-level API fan-out.
- Kept REST notification and chat count loading active so Vercel preview still has a non-realtime fallback.
- Defaulted production realtime to off unless `NEXT_PUBLIC_ENABLE_REALTIME=true` or a public websocket URL is configured.

### How to Test

- Run backend build and frontend lint/build.
- Log in as a client user and open `/client`, `/client/tickets`, and another `/client/*` route.
- Confirm `/api/clients/portal/bootstrap` is used on first client workspace load and `/api/socket` is not requested when realtime is disabled.

### Next Steps

- Deploy to Vercel with `NEXT_PUBLIC_ENABLE_REALTIME=false` for the temporary preview.
- Move the backend to a persistent Node host before enabling realtime chat in production.
- Add measured composite Prisma indexes after query logs confirm the hottest remaining client portal filters.

## 2026-06-07 - Persistent Backend Deployment Prep

### Completed

- Added frontend API/auth URL helpers so browser REST and auth requests can target either same-origin Vercel proxy routes or an external persistent backend from `NEXT_PUBLIC_API_URL`.
- Updated signup and current-user session verification flows to use the same URL builder as shared API calls.
- Added a Render Blueprint for a persistent Docker backend service with internal Key Value storage for Redis-compatible rate limiting.
- Documented the Render backend plus Vercel frontend handoff variables.

### Files Changed

- `render.yaml`
- `frontend/src/lib/api-url.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/config.ts`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/tests/api-url.test.mjs`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept same-origin `/api` as the default frontend API base so the existing Vercel preview and local rewrites continue to work without extra environment variables.
- Used Render Key Value as the Redis-compatible service for auth rate limiting.
- Left database URLs and provider secrets as unsynced Blueprint values so secrets are not committed.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Keep the current Vercel preview on same-origin `/api`, then smoke login and `/client`.

### Next Steps

- Create the Render Blueprint from GitHub, fill Supabase database secrets, and wait for `/health`.
- Set Vercel `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and `NEXT_PUBLIC_ENABLE_REALTIME=true` after the Render backend URL is known.
- Redeploy Vercel and smoke realtime chat, uploads, auth refresh, client portal, and admin workflows.

## 2026-06-07 - Render Deployment Auth Preflight

### Completed

- Installed Render CLI `v2.20.0` locally from the official Windows amd64 release and verified the published SHA256 before running it.
- Added the user-local Render CLI directory to the Windows user `PATH` for new terminals.
- Confirmed the current repository is clean on `main` and GitHub repository deploy secrets/variables are not configured.
- Confirmed Render Blueprint validation is blocked until a Render login, `RENDER_API_KEY`, and workspace are available.

### Files Changed

- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the Render Blueprint as the preferred persistent backend path because the SSH Docker deploy path has no configured GitHub deployment host secrets.
- Did not use Chrome as a Render-auth fallback because provider auth is the real blocker and browser account setup should be explicit.

### How to Test

- Run `render --version` in a new terminal.
- Set `RENDER_API_KEY`, choose the Render workspace, and run `render blueprints validate ./render.yaml`.
- After Blueprint creation, verify the backend `/health` endpoint before switching Vercel to the external backend URL.

### Next Steps

- Provide or set `RENDER_API_KEY`, then select the Render workspace.
- Validate and create the Render Blueprint.
- Update Vercel production variables to the Render backend URL and redeploy the frontend.

## 2026-06-07 - Render Migration Pre-Deploy Wiring

### Completed

- Added Render-specific Prisma migration scripts that read managed-platform environment variables directly instead of requiring `backend/.env.production`.
- Wired the Render backend Blueprint to run the normal Prisma migration deploy before each backend release.
- Updated the Render Blueprint to deploy only after linked Git checks pass.
- Documented how the Render migration command differs from the SSH/Docker `.env.production` command.

### Files Changed

- `backend/package.json`
- `render.yaml`
- `docs/deployment.md`
- `docs/database.md`
- `docs/dev-notes.md`

### Decisions Made

- Used a normal migration deploy for Render pre-deploys because the live Supabase database is expected to already contain the application schema.
- Used `autoDeployTrigger: checksPass` instead of the older commit-trigger behavior so Render waits for GitHub checks.
- Kept empty-database bootstrap as an explicit one-time operator step guarded by `ALLOW_EMPTY_DATABASE_BOOTSTRAP=true`.

### How to Test

- Run `cmd /c "cd backend && npm run prisma:deploy:render -- --help"` to confirm the managed-platform migration script resolves the Prisma CLI.
- Run `npx prisma validate` and backend build checks.
- After Render auth is available, run `render blueprints validate ./render.yaml`.

### Next Steps

- Provide or set `RENDER_API_KEY`, select the Render workspace, and validate the Blueprint with Render.
- Create the Blueprint, set Supabase secrets, and verify `/health`.

## 2026-06-07 - Render API Key And Blueprint Validation

### Completed

- Created a Render account through GitHub authorization for the existing Chrome user session.
- Created a Render API key for deployment automation and stored it as the Windows user `RENDER_API_KEY`.
- Verified Render CLI authentication as the Render account user and listed the available Render workspace.
- Added the explicit GitHub `repo` field required by Render Blueprint API validation.

### Files Changed

- `render.yaml`
- `docs/deployment.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept the Render service on `starter` instead of downgrading to a free preview because the target is production backend readiness.
- Stopped before billing setup because Render requires workspace payment information for the paid backend and Key Value resources.

### How to Test

- Run `render whoami` with `RENDER_API_KEY` available.
- Run `render workspaces -o json` and select the workspace.
- Run `render blueprints validate ./render.yaml`; after payment info is added, remaining validation should continue past the current billing requirement.

### Next Steps

- Add Render workspace payment information in the Render dashboard.
- Re-run `render blueprints validate ./render.yaml`.
- Create the Blueprint, fill Supabase secrets, and verify `/health`.

## 2026-06-07 - Navigation Loading Smoothness

### Completed

- Investigated why clicking client/admin navigation could feel like a full-screen reload.
- Found the affected navigation links were mostly soft Next links already, but client portal and admin client operations pages remounted their workspace hooks per route and showed fresh loading states on each route change.
- Added per-user workspace caches for the client portal and admin client operations hooks so previously loaded workspace data remains visible while the next route revalidates.
- Converted the dashboard attention row from a plain anchor to a Next `Link` so internal dashboard actions use client-side navigation.
- Replaced the protected-route full-screen auth spinner with shell-aware loading so session verification no longer blanks the whole viewport.
- Cleared client workspace caches when the auth session is cleared so cached client/admin data is not retained after logout or session expiration.
- Strengthened the visual-smoke client mocks so client portal routes verify the same bootstrap payload shape used by the app.
- Strengthened visual-smoke route checks and the desktop sidebar click audit so dashboard body content leaking into non-dashboard routes fails the audit.

### Files Changed

- `frontend/src/hooks/useClientPortalWorkspace.ts`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `frontend/src/components/AuthLoadingState.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept the fix scoped to navigation smoothness instead of rewriting the app shell or adding new route layouts.
- Keyed workspace caches by user id to avoid showing cached client/admin workspace data across users.
- Kept protected content hidden while auth is unknown; the follow-up moved that loading state into the route body so the real shell remains mounted.
- Removed the native-history app-shell fallback after Chrome proved it only synchronized route state and left dashboard content mounted under other route headings.
- Left external links as plain anchors because those should still open or navigate like normal external links.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Run focused visual smoke for `/client`, `/client/reports`, `/client/work`, `/client/tickets`, `/operations/clients`, `/operations/clients/reports`, `/operations/clients/accounts`, and `/dashboard`; the admin dashboard pass also clicks desktop sidebar routes and checks for dashboard body leakage.
- Verify a delayed `/backend-auth/me` response keeps the real app shell visible instead of the old full-screen `Loading...` view.

### Next Steps

- Monitor the preview URL for any remaining hard reloads caused by the legacy Vercel build configuration.

## 2026-06-07 - Auth Shell Stability Follow-up

### Completed

- Fixed the follow-up issue where auth loading could replace the real workspace shell with a skeleton and make the screen look black during navigation or reloads.
- Moved the auth gate inside the mounted app shell so the sidebar and header remain real UI while protected route content verifies the session.
- Replaced the full-shell auth skeleton with a compact main-content status panel.
- Fixed the session refresh path so a successful token refresh cannot leave `UserContext.isLoading` stuck.
- Added delayed-auth visual smoke coverage that fails if the protected-route sidebar disappears while `/backend-auth/me` is slow.

### Files Changed

- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/AuthLoadingState.tsx`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept protected content blocked only for unknown sessions; already-known sessions stay visible during background verification.
- Kept the real shell mounted for protected routes instead of drawing a fake sidebar skeleton.
- Left public auth pages free to render while session state is resolving so login/signup do not flash a skeleton.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Run focused visual smoke with `VISUAL_SMOKE_AUTH_DELAY_MS=4000` on `/dashboard` and `/task-tracking` to verify the sidebar remains present while auth verification is delayed.

### Next Steps

- Monitor the preview URL for any remaining shell flicker under slow production auth responses.

## 2026-06-07 - Task Tracking Loading Header Polish

### Completed

- Removed the duplicate header area from the Task Tracking loading skeleton.
- Kept the real fixed Task Tracking header visible while the task board body loads.
- Added delayed task-loading visual smoke coverage so the task skeleton header cannot regress.

### Files Changed

- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/ui/Skeleton.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Made the task-board skeleton header optional instead of removing it globally, preserving existing fallback behavior for any future direct skeleton use.
- Verified the route-specific loading branch calls the skeleton without the header so the app header remains the only header.

### How to Test

- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run build`.
- Run focused visual smoke with `VISUAL_SMOKE_TASKS_DELAY_MS=4000` on `/task-tracking`.

### Next Steps

- Monitor the preview route for any remaining loading-state flicker under slow task responses.

## 2026-06-07 - Backend Structured Logging Cleanup

### Completed

- Added a reusable backend logger that emits structured JSON logs with level, scope, timestamp, message, and sanitized context.
- Replaced backend `console.log`, `console.warn`, and `console.error` usage with scoped loggers across API controllers, auth, email, payroll, notifications, uploads, database, and startup code.
- Redacted email-like values and sensitive key names such as tokens, passwords, secrets, cookies, and authorization values before logs are written.
- Removed applicant and manager identifiers from employee verification logs, keeping only event and delivery outcome context.
- Added focused logger tests for redaction, production error sanitization, and log-level filtering.

### Files Changed

- `backend/src/observability/logger.ts`
- `backend/src/main.ts`
- `backend/src/config/env.config.ts`
- `backend/src/database/prisma.service.ts`
- `backend/src/auth/**`
- `backend/src/email/**`
- `backend/src/employees/**`
- `backend/src/notifications/**`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/payroll/**`
- `backend/src/clients/clients.controller.ts`
- `backend/src/announcements/announcements.controller.ts`
- `backend/src/chat/chat.controller.ts`
- `backend/src/daily-logs/daily-logs.controller.ts`
- `backend/src/file-directory/file-directory.controller.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/uploads/uploads.controller.ts`
- `backend/tests/observability.logger.test.ts`
- `backend/tests/run-tests.ts`

### Decisions Made

- Kept Docker/host log collection simple by continuing to write to stdout/stderr through one logger module instead of adding a new dependency.
- Preserved existing API response contracts and non-blocking email side effects.
- Kept stack traces out of production logs while retaining them in non-production logs for debugging.

### How to Test

- Run `npm --prefix backend run build`.
- Run `npm --prefix backend test`.
- Run `rg -n "console\\.(log|warn|error)" backend/src --glob "!backend/src/observability/logger.ts"` to confirm raw backend console calls are gone.

### Next Steps

- Consider routing the structured logs to the production host's log drain or monitoring provider after backend hosting is finalized.

## 2026-06-07 - Client Backend Service Split

### Completed

- Split client service-tier persistence into a focused `ClientServiceTiersService`.
- Split client organization creation, service-tier assignment, and archive/restore updates into a focused `ClientOrganizationsService`.
- Kept `ClientsService` as the controller-facing facade so existing routes, validation, serializers, and API contracts stay unchanged.

### Files Changed

- `backend/src/clients/client-service-tiers.service.ts`
- `backend/src/clients/client-organizations.service.ts`
- `backend/src/clients/clients.service.ts`
- `docs/dev-notes.md`

### Decisions Made

- Started with the admin-only organization/service-tier slice because existing route coverage already protects service-tier CRUD, assignment/clearing, archive/restore, activity logging, and client visibility boundaries.
- Preserved transaction behavior for organization service-tier and status updates so activity history remains atomic with the changed organization record.

### How to Test

- Run `npm --prefix backend run build`.
- Run `npm --prefix backend test`.
- Run `git diff --check`.

### Next Steps

- Continue splitting the remaining client backend domains in small slices, starting with billing/calendar or projects/updates after checking test coverage for each route group.

## 2026-06-07 - Client Billing And Calendar Service Split

### Completed

- Split client billing status upsert and billing activity creation into `ClientBillingService`.
- Split client calendar create, lookup, update, delete, project ownership validation, and calendar activity creation into `ClientCalendarService`.
- Kept `ClientsService` as the controller-facing facade so billing and calendar routes keep their existing API contract.

### Files Changed

- `backend/src/clients/client-billing.service.ts`
- `backend/src/clients/client-calendar.service.ts`
- `backend/src/clients/clients.service.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept calendar project ownership validation inside the new calendar service so the moved methods remain self-contained.
- Preserved billing and calendar activity creation inside the same database transactions as the records they describe.

### How to Test

- Run `npm --prefix backend run build`.
- Run `npm --prefix backend test`.
- Run `git diff --check`.

### Next Steps

- Continue the client backend split with another covered route group, such as projects/updates/resources/assets, before attempting larger report/ticket/workflow extraction.

## 2026-06-07 - Client Content And Resource Service Split

### Completed

- Split client project, update, metric snapshot, and resource-link persistence into `ClientContentService`.
- Kept resource project ownership validation inside the new content service.
- Preserved `ClientsService` as the controller-facing facade for project, update, metric, and resource routes.

### Files Changed

- `backend/src/clients/client-content.service.ts`
- `backend/src/clients/clients.service.ts`
- `docs/dev-notes.md`

### Decisions Made

- Grouped projects, updates, metrics, and resources together because they are simple client workspace content records and share the same project ownership check.
- Left tickets, approvals, reports, roadmap, assets, memberships, and invitations in `ClientsService` for separate focused passes.

### How to Test

- Run `npm --prefix backend run build`.
- Run `npm --prefix backend test`.
- Run `git diff --check`.

### Next Steps

- Continue with another focused client backend split only after checking route coverage and preserving activity/authorization behavior.

## 2026-06-08 - Sidebar Navigation Runtime And Client Mobile Access

### Completed

- Kept sidebar navigation inside the hydrated app runtime by routing normal internal sidebar clicks through `router.push`.
- Preserved native browser behavior for modified clicks, middle clicks, and new-tab gestures.
- Added a client-shell-only mobile button so client portal users can open the side navigation without restoring the removed top nav.
- Updated visual smoke interaction discovery to skip readonly form fields.

### Files Changed

- `frontend/src/components/Sidebar.tsx`
- `frontend/scripts/visual-smoke.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Kept `next/link` in place for semantics and prefetching, then added an explicit guarded client-navigation handler because browser replay showed full document reloads from sidebar clicks.
- Scoped the mobile opener to the client shell only; admin and employee routes continue using the normal header navigation toggle.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Run focused visual smoke for `/dashboard`, `/task-tracking`, `/operations`, `/operations/clients`, `/client`, and `/profile`.
- Run a browser navigation replay for admin, employee, and client sidebar links and verify the runtime token persists.

### Next Steps

- Fix the production auth/backend CORS deployment issue before treating live authenticated production click-through as complete.

## 2026-06-07 - Client Roadmap And Assets Service Split

### Completed

- Split roadmap recommendation create/read/update persistence into `ClientRoadmapAssetsService`.
- Split client asset create/read/update persistence and project ownership validation into the same focused service.
- Kept `ClientsService` as the route-facing facade for roadmap and asset endpoints.

### Files Changed

- `backend/src/clients/client-roadmap-assets.service.ts`
- `backend/src/clients/clients.service.ts`
- `docs/dev-notes.md`

### Decisions Made

- Grouped roadmap recommendations and assets together as operations-managed client collateral rather than mixing them into ticket, approval, or reporting workflows.
- Preserved asset project ownership validation in the extracted service.

### How to Test

- Run `npm --prefix backend run build`.
- Run `npm --prefix backend test`.
- Run `git diff --check`.

### Next Steps

- Leave the remaining ticket, approval, report, membership, and invitation logic for separate extraction passes because they carry more state, activity, and email side effects.

## 2026-06-07 - Operations Navigation Cache And Route Return Performance

### Completed

- Prevented Operations route returns from re-running the automatic org catalog sync during the same user session.
- Kept departments, roles, and members cached longer so sidebar navigation back to Operations does not feel like a full page reload.
- Persisted the last selected Operations tab for route returns and preload member data for full admin users.
- Extended shared React Query defaults so workspace navigation keeps recent route data in memory instead of refetching on every focus or quick section switch.

### Files Changed

- `frontend/src/app/operations/page.tsx`
- `frontend/src/lib/operations-data.ts`
- `frontend/src/lib/operations-session.ts`
- `frontend/src/lib/queryClient.ts`
- `frontend/tests/operations-session.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Used sessionStorage for the Operations tab and auto-sync throttle because it improves same-session navigation without making stale org sync state permanent.
- Kept explicit mutation invalidations and manual Sync Org Chart behavior intact so admins can still refresh organization data when needed.
- Disabled focus-triggered React Query refetch by default because socket and mutation invalidations already refresh important app data with less navigation churn.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Run focused visual smoke for `/operations`, `/operations/onboarding`, `/operations/clients`, `/dashboard`, `/task-tracking`, and `/daily-logs`.

### Next Steps

- Audit other heavy routes for page-local state that should become route/session state only if users report similar route-return churn.

## 2026-06-09 - Dashboard Loading Performance

### Completed

- Stopped the dashboard from holding the full content area behind one all-or-nothing skeleton after auth is ready.
- Switched dashboard data loading to narrower production queries: paginated announcements, current-user daily logs, and today-scoped time entries.
- Added a lightweight active time-entry endpoint for the clock control so it no longer loads historical payroll rows.
- Shared the active clock lookup through React Query so duplicate desktop clock controls reuse one request.

### Files Changed

- `backend/src/payroll/payroll.controller.ts`
- `backend/src/payroll/payroll.service.ts`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/TimeClock.tsx`
- `frontend/src/hooks/useAnnouncementsQuery.ts`
- `frontend/src/hooks/useDailyLogsQuery.ts`
- `frontend/src/hooks/useTimeEntriesQuery.ts`
- `frontend/src/lib/daily-logs.ts`
- `frontend/src/lib/time-entries.ts`
- `docs/dev-notes.md`

### Decisions Made

- Kept existing dashboard cards and API contracts intact, but moved slow areas to widget-level loading.
- Used the existing `/daily-logs/my-logs` ownership boundary for the dashboard daily-log status instead of paginating all users' logs.
- Added `/api/payroll/time-entries/active` as a read-only authenticated endpoint for the current user only.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Run `npm --prefix backend test`.
- Run `npm --prefix backend run build`.
- Log in and open `/dashboard`; verify the command center renders while individual widgets load and the clock calls `/api/payroll/time-entries/active`.

### Next Steps

- Consider a dedicated backend dashboard summary endpoint if production task volume makes `/api/tasks` the next bottleneck.

## 2026-06-09 - Auth Shell Loading State

### Completed

- Kept the workspace sidebar, admin navigation, and top header mounted while a stored authenticated session revalidates.
- Removed the logged-in hard-refresh path that showed the centered "Checking session" blackout card before route content rendered.
- Let route-level skeletons handle slow content loading, including Daily Logs under delayed session and data requests.

### Files Changed

- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/contexts/UserContext.tsx`
- `frontend/src/lib/auth-session.ts`
- `docs/dev-notes.md`

### Decisions Made

- Hydrated `UserContext` from the stored user snapshot on first client render so role-based sidebar sections do not disappear during `/auth/me` revalidation.
- Kept the centered auth loading state only for truly unknown protected sessions before redirect, not for known stored sessions.
- Ignored malformed cached user snapshots when deciding whether a stored session exists.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Log in, hard-refresh `/daily-logs`, and verify the sidebar/header stay visible while the page content uses skeleton loading.

### Next Steps

- Deploy the latest frontend build after committing the current working tree so production receives the shell loading behavior.

## 2026-06-09 - Protected Route Skeleton Fallback

### Completed

- Removed the protected-route centered session-check fallback that could still appear during route remounts or uncached sessions.
- Kept the workspace sidebar and command palette mounted for protected routes even while auth state is resolving.
- Reused the normal header and page skeleton layout as the protected auth fallback so section navigation never drops to a blackout card.

### Files Changed

- `frontend/src/components/AuthLoadingState.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Treated unknown protected-route auth loading as a workspace loading state, not a standalone auth card.
- Left public auth routes without the workspace sidebar because login/signup/reset screens remain intentionally separate.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Log in, navigate between protected sidebar sections, and verify the shell stays visible without "Checking session" copy.

### Next Steps

- Keep future route-level loading states inside the existing shell rather than adding full-screen auth/loading cards.

## 2026-06-09 - Production QA Fixes

### Completed

- Fixed browser-side API/auth URL generation so production uses same-origin `/api` and `/backend-auth` routes instead of accidentally calling a configured cross-origin backend.
- Added focused API URL tests for Vercel-style same-origin routing with a cross-origin `NEXT_PUBLIC_API_URL`.
- Fixed production websocket URL resolution so non-loopback cross-origin realtime config uses the same-origin `/api/socket` route while local loopback development can still target `localhost:4000`.
- Replaced raw fetch network failures with clearer MyDeskii backend connection errors.
- Replaced signup option raw JSON parsing with the shared API helper and inline backend-connection fallback copy.
- Kept expected login/auth failure console logging development-only so production relies on the visible form error.
- Fixed the keyboard skip-link focus state so it becomes visible when focused.

### Files Changed

- `frontend/src/lib/api-url.ts`
- `frontend/src/lib/socket-url.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/next.config.ts`
- `frontend/tests/api-url.test.mjs`
- `frontend/tests/socket-url.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Browser clients should prefer same-origin backend routes so the deployed Next/Vercel proxy owns CORS and cookies.
- Realtime connections should also prefer the app origin in production to avoid direct cross-origin socket requests.
- Server-side URL normalization can still preserve absolute backend URLs for environments that need them.
- Network failures should be presented as backend connection issues, not raw browser fetch errors.

### How to Test

- Run `npm --prefix frontend test`.
- Run `npm --prefix frontend run lint`.
- Run `npm --prefix frontend run build`.
- Verify `/login`, `/signup`, `/forgot-password`, `/dashboard`, `/operations`, and `/task-tracking` do not call `deskibackend-1.onrender.com` from the browser.
- Verify production realtime requests use the app origin with path `/api/socket`.
- Press `Tab` on `/login` and verify "Skip to main content" appears visibly.

### Next Steps

- Deploy the latest build and confirm production login/signup calls use the same-origin Vercel backend routes.
