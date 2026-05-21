# Development Notes

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

## 2026-05-20 - Session Summary

### Completed

- Created `docs/codebase-audit-2026-05-20.md` as the working flaw report and remediation backlog.
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
- `docs/codebase-audit-2026-05-20.md`
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
- Restored unconfirmed root report and `reports/daily` deletions so they are not included in the release.
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
- Rewrote the 2026-05-21 session report so it reflects the pushed release state instead of the earlier uncommitted worktree snapshot.
- Marked the 2026-05-20 codebase audit as a historical backlog and listed the remaining cleanup items after the release.

### Files Changed

- `docs/architecture.md`
- `docs/api.md`
- `docs/database.md`
- `docs/session-report-2026-05-21.md`
- `docs/codebase-audit-2026-05-20.md`
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
