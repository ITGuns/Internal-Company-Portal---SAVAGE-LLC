# Deskii Feedback Skill-Routed Master Plan

> **For agentic workers:** REQUIRED ENTRY SKILL: Use `vibe-auto-research` before implementation. REQUIRED EXECUTION SUB-SKILL: Use `superpowers:executing-plans` for inline execution or `superpowers:subagent-driven-development` for task-by-task delegation. This is a master plan. Split broad phases into smaller implementation plans before large code changes.

**Goal:** Apply the initial deployment feedback and meeting notes to Deskii through safe, evidence-backed, role-aware, accessible, and visually polished implementation phases.

**Architecture:** Deskii remains a Next.js frontend, Express backend, Prisma/Postgres data layer, Socket.io collaboration surface, and role-gated internal/client portal. Internal employee/admin work stays separate from client-facing portal routes. UI changes follow the Deskii product visual system and the visual frontend skill stack before browser verification.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Socket.io client, Prisma, Express, PostgreSQL, Playwright/visual-smoke, axe-core, Browser/in-app browser.

---

## Operating Contract

Every meaningful task uses this loop:

1. `vibe-auto-research`: inspect current repo evidence before editing.
2. Skill routing: choose the phase-specific skills listed below.
3. Repo applicability check: identify files, contracts, personas, routes, and verification.
4. Plan quality gate: reject broad or weak plans before editing.
5. Implementation: make small, scoped changes.
6. Reviewer pass: inspect diff, contracts, role boundaries, UI flow, and accessibility.
7. Verification: automated checks plus Browser/manual click-through when UI is reachable.
8. Fix cycle: fix material findings before reporting completion.

## Universal Product Lens

Each phase must answer these questions before completion:

- CEO: Can I manage the business clearly from here?
- Admin/manager: Can I control people, clients, tasks, payroll, reports, and permissions without hunting?
- Employee: Can I do my work fast without guessing, duplicate entry, or unnecessary calculation?
- Client: Do I only see client-safe portal content, and does it feel professional?
- Accessibility: Does keyboard, focus, label, contrast, touch target, close/back, and reduced-motion behavior work?
- Security: Does the backend enforce access, not just hidden frontend controls?
- Performance: Does the daily workflow feel fast enough for repeated work?
- Maintainability: Are UI, hooks, API calls, business logic, validation, and database access separated?

## Required Visual Frontend Stack

Use this stack for all Deskii UI, workflow, form, navigation, dashboard, modal, calendar, chat, reporting, and client portal work:

| Skill | Required Use |
| --- | --- |
| `impeccable` | Product UI taste, premium but practical layout, anti-generic screens, product register decisions |
| `frontend-visual-quality` | Alignment, hierarchy, responsive behavior, forms, tables, empty/loading/error states |
| `design-taste-frontend` | Density, spacing, typography, anti-card-spam, dashboard taste, anti-AI-looking layout checks |
| `emil-design-eng` | Component feel, micro-interactions, button press states, popover/dropdown/modal motion details |
| `web-design-guidelines` | Semantic HTML, accessible web interface review, web interaction standards |
| `accessibility-review` | WCAG 2.1 AA checks for keyboard, focus, labels, contrast, touch target size, screen reader basics |
| `motion-web-design` | Purposeful motion, reduced motion, performance-safe transitions, no decorative motion that slows work |
| `react-best-practices` | React/Next component boundaries, client/server boundaries, effects, render performance |
| Browser/in-app browser | Rendered desktop/mobile review, click-through, console errors, overflow, clipping, state checks |
| `gpt-taste` | Public SaaS landing/funnel/marketing pages only, not normal internal dashboards |
| GSAP skills | Only when GSAP is intentionally chosen for marketing/scroll-driven/public pages |

Default UI routing:

```text
vibe-auto-research
-> product-requirements-quality
-> impeccable
-> frontend-visual-quality
-> design-taste-frontend
-> emil-design-eng
-> web-design-guidelines
-> accessibility-review
-> motion-web-design when motion is touched
-> Browser/manual verification
```

## Global Skill Routing

| Work Type | Skills And Tools |
| --- | --- |
| Every meaningful repo task | `vibe-auto-research` |
| Requirements and scoping | `product-requirements-quality`, `brainstorming`, `writing-plans` |
| Missing skill or weak capability | `find-skills`, `npx skills find`, then install only trusted matches |
| Bug or regression | `systematic-debugging`, `test-driven-development` |
| Frontend UI | Required visual frontend stack above |
| API/backend | `api-service-quality`, `testing-quality` |
| Auth, role, client/internal boundary | `auth-access-control`, `security-production-readiness` |
| Database/schema/migrations | `database-safety`, `supabase-postgres-best-practices` as general Postgres guidance |
| Payroll/time clock | `api-service-quality`, `database-safety`, `auth-access-control`, `testing-quality`, `performance-quality` |
| Performance and slow routes | `performance-quality`, `deployment-observability`, Browser network/render checks |
| Release, commit, push | `verification-before-completion`, repo validation gate, Browser/manual audit |

## Phase 0: Stabilize Current Local Work

**Goal:** Prove the current uncommitted Deskii slice is coherent before adding more feedback.

**Skills:** `vibe-auto-research`, `testing-quality`, `database-safety`, `frontend-visual-quality`, `accessibility-review`, Browser/in-app browser.

**Current known local scope:**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606100001_task_projects_org_reporting/migration.sql`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.security.ts`
- `backend/src/users/users.service.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/login.module.css`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/ProfilePhoneInput.tsx`
- `frontend/src/components/forms/SegmentedDateInput.tsx`
- `frontend/src/components/operations/OperationsOrgChartPanel.tsx`
- `frontend/src/components/tasks/*`
- `frontend/src/hooks/useTasksQuery.ts`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/users.ts`
- `frontend/src/lib/member-role-management.ts`
- `frontend/src/lib/operations-session.ts`
- `frontend/src/lib/types/api.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

**Implementation approach:**
- Review the current diff as a single existing slice.
- Fix only defects that block this slice from being safe to build on.
- Review and plan all feedback phases in parallel, but do not merge or release dependent implementation until the current local slice is coherent.

**Verification:**
- `git diff --check`
- `npm run check:skills`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- Browser affected-flow audit for `/login`, `/signup`, `/profile`, `/task-tracking`, `/operations`, `/client`

**Exit criteria:**
- Current local changes compile and match documented behavior.
- Browser review records `done`, `blocked`, or `not applicable`.
- Any remaining blockers are documented before merging dependent implementation.

## Phase 1: P0 Client/Internal Boundary And Navigation

**Goal:** Keep client portal work separate from internal employee/admin work.

**Skills:** `auth-access-control`, `security-production-readiness`, visual frontend stack, Browser/in-app browser.

**Files to inspect first:**
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/components/LayoutWrapper.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/lib/role-access.ts`
- `frontend/src/lib/client-portal-navigation.ts`
- `backend/src/clients/clients.access.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.serializers.ts`
- `docs/features.md`
- `docs/api.md`

**Apply:**
- Client users only use `/client/*`.
- Admin users manage clients only in `/operations/clients/*`.
- Remove client portal entries from normal employee Work navigation.
- Command palette, sidebar, quick actions, notifications, and search must not expose internal destinations to client users.
- Backend client serializers and route permissions remain authoritative.

**Acceptance criteria:**
- Client login lands on `/client`.
- Client cannot use `/dashboard`, `/task-tracking`, `/operations`, `/payroll-calendar`, internal `/chat`, or internal `/file-directory`.
- Admin sees client management under `/operations/clients/*`.
- Internal staff do not get a duplicate client portal link inside normal Work navigation.
- Browser audit covers admin, employee, and client shells.

## Phase 2: Login, Branding, Account Settings

**Goal:** Make the first impression and account basics trustworthy.

**Skills:** `impeccable`, `frontend-visual-quality`, `design-taste-frontend`, `emil-design-eng`, `web-design-guidelines`, `accessibility-review`, `auth-access-control`, Browser.

**Files to inspect first:**
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/login/login.module.css`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/public/deskii-logo.svg`
- `frontend/public/favicon.svg`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/components/ProfileEditForm.tsx`
- `frontend/src/components/ProfilePhoneInput.tsx`
- `frontend/src/lib/users.ts`
- `frontend/src/lib/phone-number.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.security.ts`
- `backend/src/users/users.service.ts`
- `docs/api.md`

**Apply:**
- Visible product brand says Deskii.
- Login supports workspace/business/person-in-charge naming.
- Dynamic auth surface stays product-grade and readable.
- Google login remains visible.
- Apple login remains disabled or hidden until real Apple credentials/backend strategy exist.
- Profile can save name, photo, phone, and simple contact fields.
- Phone defaults to `+1` and supports other country codes.
- Profile/account flows include visible close/back affordances where they pop out.

**Visual frontend gates:**
- `impeccable`: product register, not generic landing-page composition for internal flows.
- `emil-design-eng`: button press states, auth surface motion, profile drawer/modal details.
- `accessibility-review`: labels, focus, contrast, touch targets, error messages.

**Acceptance criteria:**
- User can edit profile fields without broken state.
- Auth pages do not mount internal shell while public/auth-only.
- Login communicates correct workspace.
- Mobile and desktop first viewport remain usable.

## Phase 3: Universal UX, Accessibility, And Duplicate-Submit Hardening

**Goal:** Remove the daily-use friction that makes the app feel unfinished.

**Skills:** visual frontend stack, `systematic-debugging`, `test-driven-development`, `testing-quality`, Browser.

**Files to inspect first:**
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/ProfileSidebar.tsx`
- `frontend/src/components/NotificationSidebar.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/app/file-directory/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/ui/*`

**Apply:**
- Every modal, drawer, popout, and menu has visible close, Esc support where appropriate, and focus restore.
- Dropdowns do not get cut off near the viewport bottom.
- Submit buttons disable during pending mutations and prevent duplicate creation.
- Loading, empty, error, disabled, and success states are consistent.
- Touch targets meet the 44 CSS pixel expectation where practical.
- Motion respects `prefers-reduced-motion`.

**Acceptance criteria:**
- Double-clicking create task or create asset cannot create duplicate records.
- Keyboard-only flow can open, use, and close changed dialogs.
- No changed dropdown clips at bottom of viewport.
- Browser audit checks desktop and mobile widths.

## Phase 4: Task Tracker Daily-Use Core

**Goal:** Make task creation, timing, and progress usable for employees and managers.

**Skills:** visual frontend stack, `api-service-quality`, `database-safety` if schema changes, `testing-quality`, Browser.

**Files to inspect first:**
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/components/tasks/BoardCard.tsx`
- `frontend/src/components/tasks/TaskListRow.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/components/forms/SegmentedDateInput.tsx`
- `frontend/src/lib/tasks.ts`
- `frontend/src/hooks/useTasksQuery.ts`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `docs/features.md`
- `docs/api.md`

**Apply:**
- Same-day due dates are valid.
- Due date is optional where sensible.
- Date fields auto-advance across day, month, and year segments.
- Manual Role field is removed where org chart can infer it.
- Department creation is available where authorized.
- ETOC supports minutes, hours, days, and hours/minutes entry without manual math.
- Completed tasks have obvious location/filter.
- Timer active, paused, and stopped states are visible.
- Work Focus can be selected or pinned by the user.

**Visual frontend gates:**
- `design-taste-frontend`: avoid one huge task list; optimize scanning and density.
- `emil-design-eng`: timer controls, focus task, active/paused micro-states.
- `accessibility-review`: date inputs, selects, task action buttons.

**Acceptance criteria:**
- Employee can create a due-today task.
- Employee never has to calculate minutes for four hours and fifteen minutes.
- Manager can quickly filter open, due today, overdue, completed, project, and department work.
- Browser audit clicks create/edit/details/timer/filter/grouping paths.

## Phase 5: Projects And Asana-Style Organization

**Goal:** Prevent Task Tracking from becoming a flat list.

**Skills:** `product-requirements-quality`, visual frontend stack, `database-safety`, `api-service-quality`, `find-skills` for trusted competitor/work-management skills if needed, Browser.

**Files to inspect first:**
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202606100001_task_projects_org_reporting/migration.sql`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/tests/*task*`
- `docs/database.md`
- `docs/features.md`

**Apply:**
- Organize tasks by department, project, and task.
- Projects appear in Task Tracking.
- Project dropdown filters tasks.
- Project progress is based on completed tasks under the project.
- Project members/collaborators display as avatars.
- Competitor research on Asana/work-management patterns informs layout, not bloat.

**Acceptance criteria:**
- CEO/admin can understand work by department and project.
- Employee can find project tasks without scanning the whole company task list.
- Project status reflects actual task completion.
- Project UI remains responsive and keyboard accessible.

## Phase 6: Task Invitations And Collaborative Tasks

**Goal:** Support multi-person task work without duplicating tasks.

**Skills:** `product-requirements-quality`, `database-safety`, `api-service-quality`, `auth-access-control`, `testing-quality`, visual frontend stack, Browser.

**Files to inspect first:**
- `backend/prisma/schema.prisma`
- `backend/src/tasks/tasks.controller.ts`
- `backend/src/tasks/tasks.service.ts`
- `backend/src/notifications/*`
- `backend/src/chat/*`
- `frontend/src/components/tasks/TaskModal.tsx`
- `frontend/src/components/tasks/TaskDetailModal.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/types/api.ts`
- `frontend/src/lib/users.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`

**Apply:**
- Add additive task collaborator/participant model.
- Add task invitation state if needed: pending, accepted, declined.
- Invite one employee, multiple employees, team, or department.
- People picker pulls from org chart.
- Task share/invite can connect to messages/chat as an internal handoff.
- Notifications go to invited users and collaborators.
- Reports show collaborators and who worked on what.

**Acceptance criteria:**
- Multiple employees can view and work on one task.
- Duplicate invites do not duplicate the task.
- Owner, assignee, collaborators, and invited users have correct permissions.
- Client users cannot see internal task invitations.
- EOD/PDF reports include collaborators.

## Phase 7: Org Chart As HR Backbone

**Goal:** Make company hierarchy power assignments, search, permissions, and payroll review.

**Skills:** `product-requirements-quality`, `database-safety`, `auth-access-control`, `frontend-visual-quality`, `design-taste-frontend`, `accessibility-review`, Browser.

**Files to inspect first:**
- `backend/prisma/schema.prisma`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/users.security.ts`
- `backend/src/org/org-access-policy.ts`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/operations/OperationsOrgChartPanel.tsx`
- `frontend/src/lib/member-role-management.ts`
- `frontend/src/lib/departments.ts`
- `frontend/src/lib/users.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`

**Apply:**
- Visual hierarchy: owner/CEO, managers, direct reports.
- Manager/direct-report relationships stay flexible.
- Task assignment auto-fills department and role from selected employee.
- Org chart drives task invite search, chat people search, payroll review scope, and admin visibility.
- Keep the UI simple for non-corporate SMB owners.

**Acceptance criteria:**
- Admin can assign or change manager relationships.
- User cannot be their own manager.
- Manager cycles are blocked server-side.
- Org chart remains readable on desktop and mobile.

## Phase 8: Search Everywhere, Safely

**Goal:** Make search find real permitted records, not only pages.

**Skills:** `api-service-quality`, `auth-access-control`, `security-production-readiness`, `performance-quality`, visual frontend stack, Browser.

**Files to inspect first:**
- `frontend/src/components/CommandPalette.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/lib/tasks.ts`
- `frontend/src/lib/client-portal.ts`
- `backend/src/tasks/*`
- `backend/src/chat/*`
- `backend/src/clients/*`
- `docs/api.md`
- `docs/features.md`

**Apply:**
- Expand task search across title, description, project, assignee, department, creator, and notes.
- Add role-aware global search for allowed pages and records.
- Include tasks, projects, clients, files, reports, and chat only when the user has permission.
- Client search returns client-safe results only.

**Acceptance criteria:**
- Searching a newly created task finds it.
- Client search cannot expose internal task/payroll/admin records.
- Global search remains fast and debounced.
- Browser audit checks client, employee, and admin results.

## Phase 9: Reports, PDF, And EOD

**Goal:** Make reports useful for accountability and business review.

**Skills:** `product-requirements-quality`, visual frontend stack, `api-service-quality`, `testing-quality`, Browser.

**Files to inspect first:**
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/tasks/LogReportModal.tsx`
- `frontend/src/lib/tasks.ts`
- `backend/src/tasks/*`
- `backend/src/daily-logs/*`
- `docs/api.md`
- `docs/features.md`

**Apply:**
- Checkbox-select tasks for PDF export.
- Keep filters, but do not force filters for small exports.
- PDF includes Deskii Report, generated by, generated time, selected filters/project.
- EOD report has per-task sections: status, work done, who did it, time spent, open/done.
- Replace decimal hours with hours/minutes.

**Acceptance criteria:**
- Manager can export only selected tasks.
- Report is readable and professional.
- Collaborator/task work sessions appear where available.
- Generated report metadata is correct.

## Phase 10: Payroll And Time Clock

**Goal:** Make hours, corrections, payroll schemes, and overtime manageable.

**Skills:** `product-requirements-quality`, `api-service-quality`, `database-safety`, `auth-access-control`, `testing-quality`, `performance-quality`, visual frontend stack, Browser.

**Files to inspect first:**
- `backend/src/payroll/payroll.controller.ts`
- `backend/src/payroll/payroll.service.ts`
- `backend/src/payroll/payroll.permissions.ts`
- `frontend/src/app/payroll-calendar/page.tsx`
- `frontend/src/components/payroll/*`
- `frontend/src/components/TimeClock.tsx`
- `frontend/src/hooks/useTimeEntriesQuery.ts`
- `frontend/src/lib/payroll-calendar/*`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`

**Apply:**
- Clock in/out is easier to access.
- Employee sees their hours clearly.
- Admin can review employee hours.
- Forgotten clock-in/out correction flow includes notes and manager/admin review.
- Max billable hours per day per employee.
- Overtime beyond max is not billable until filed/approved.
- Payroll schemes include weekdays, flat 30, flat 20, flat 160 hours, and editable schemes.
- Currencies, payslip filters, payout date automation, and analytics are planned as separate slices.

**Acceptance criteria:**
- Payroll reviewer can audit hours without guessing.
- Employee corrections are traceable.
- Overtime does not silently become billable.
- Sensitive payroll fields stay protected server-side.

## Phase 11: Chat And Internal Communication

**Goal:** Make chat usable and governable.

**Skills:** `api-service-quality`, `auth-access-control`, `security-production-readiness`, visual frontend stack, `testing-quality`, Browser.

**Files to inspect first:**
- `backend/src/chat/chat.controller.ts`
- `backend/src/chat/chat.service.ts`
- `backend/src/chat/chat.permissions.ts`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/components/chat/*`
- `frontend/src/lib/chat.ts`
- `frontend/src/context/SocketContext.tsx`
- `docs/api.md`
- `docs/features.md`

**Apply:**
- Edit/delete messages.
- Emoji picker/reactions and GIF support after dependency/source review.
- Group chat and archive.
- Notifications.
- Add/search users from org chart.
- Admin export/download history.
- Admin clear/refresh/modify controls with permissions.

**Acceptance criteria:**
- Users can correct mistakes.
- Admins can preserve or clean chat history according to permission rules.
- Client chat stays separate from internal chat where required.
- Realtime behavior works or degrades cleanly to REST fallback.

## Phase 12: Later Business Modules

**Goal:** Finish broader SaaS surfaces after the core operating system is stable.

**Skills:** choose per feature using this plan. Use `find-skills` before adding new domain-specific skills.

**Modules:**
- Custom quick actions per user/company.
- Announcements customization.
- File directory tier restrictions and Drive-like UI.
- Remove Google Drive option from admin.
- Add folders, department filters, hover states.
- Client account tab, ticketing, client chat, connect to service staff, book a call.
- Billing provider setup: Stripe, Square, bank details.
- Calendar task creation, scrolling, more months, client progress.
- Roadmap organization, simpler view, hover polish.
- Whiteboard engagement improvements.

**Acceptance criteria:**
- Each module gets its own focused implementation plan.
- Payments/billing work uses current provider docs and security review.
- File/client/billing access remains role and tenant scoped.

## Final Release Gate

Run this only after the targeted implementation phases are complete:

- `git status --short --branch`
- `git diff --check`
- `npm run check:skills`
- `npx prisma validate --schema backend/prisma/schema.prisma`
- `npm --prefix backend test`
- `npm --prefix backend run build`
- `npm --prefix backend audit --audit-level=high`
- `npm --prefix frontend test`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix frontend audit --audit-level=high`
- `npm audit --audit-level=high`
- `docker compose config` when deployment config is in scope
- Browser full-feature audit when cross-cutting shell/auth/client/internal/task/payroll work is included
- Accessibility pass on changed flows
- Docs updated: `docs/dev-notes.md`, plus `docs/api.md`, `docs/database.md`, `docs/features.md`, or `docs/architecture.md` when their source-of-truth content changes

## Full-Program Execution Mode

The user approved going through the full feedback plan instead of stopping at Phase 0 and Phase 1 first.

Work mode:

1. Review every phase against the current repo and product goals.
2. Keep all phases in the active implementation map.
3. Execute in safe vertical slices, but do not ignore later phases while early phases are being stabilized.
4. Use the phase-specific skill stack before each slice.
5. Keep cross-phase dependencies visible, especially client/internal access boundaries, org chart ownership, collaborative tasks, global search, reports, payroll, and chat governance.
6. Run focused verification after each slice and the final release gate before commit/push.

High-level execution order for the full pass:

1. Current local work stabilization and verification.
2. Client/internal boundary hardening.
3. Login, branding, profile, close/back, duplicate-submit, dropdown, and accessibility fixes.
4. Task Tracker daily-use improvements.
5. Projects and Asana-style organization.
6. Task invitations and collaborative tasks.
7. Org chart as HR backbone.
8. Role-aware global search.
9. PDF/EOD report upgrade.
10. Payroll/time clock expansion.
11. Chat/messages governance.
12. Later business modules.

This order can be adjusted when repo evidence shows a dependency is stronger than expected, but every phase remains in scope for the full Deskii feedback program.
