# Client Operations Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Deskii client/admin operations release from preview-ready to production-ready with polished UX, verified tenant security, deployment readiness, and end-to-end admin/client workflow QA.

**Architecture:** Keep the client portal inside the existing internal portal as role-gated routes. Backend permissions remain authoritative in `backend/src/clients/*`, frontend pages stay split into focused client and operations routes, and shared workflow logic remains in `frontend/src/lib`, `frontend/src/hooks`, and reusable components.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, TypeScript Express, Prisma/PostgreSQL, Socket.io, Node test runner, Playwright/Chrome for browser smoke testing.

---

## Release Position

The latest calendar patch is ready in isolation, but the full client-operations release is still a large worktree with many backend, frontend, migration, role, and documentation changes. Production work should continue in controlled phases with a clean verification trail before merge or deployment.

Do not commit, push, merge, or deploy until the user explicitly approves that release action.

## Production Exit Gates

- Backend test suite passes.
- Backend TypeScript build passes.
- Prisma schema validates and client generation succeeds.
- Frontend test suite passes.
- Frontend lint passes.
- Frontend production build passes.
- `git diff --check` passes.
- `docker compose config` passes with required temporary secrets.
- No committed secrets, debug outputs, local tunnel binaries, or generated temporary screenshots.
- Admin and client browser smoke tests pass on desktop and mobile widths.
- Client users cannot access wrong tenant data, archived clients, internal notes, or management-only routes.
- Admin, operations manager, and web developer roles have the intended Client Side access without gaining unrelated Operations permissions.
- Temporary preview host is treated as review-only; production deploy uses the approved real host and environment.

---

## Phase 0: Scope Lock And Baseline

**Files:**
- Inspect: `backend/package.json`
- Inspect: `frontend/package.json`
- Inspect: `docker-compose.yml`
- Inspect: `docs/architecture.md`
- Inspect: `docs/api.md`
- Inspect: `docs/database.md`
- Inspect: `docs/features.md`
- Modify only if needed: `docs/dev-notes.md`

- [ ] **Step 0.1: Capture the current release diff**

Run:

```powershell
git status --short
git diff --stat
```

Expected:

- A broad client-operations worktree is visible.
- No unrelated local artifacts such as temporary screenshots, debug logs, Cloudflare binaries, or generated build output are listed for commit.

- [ ] **Step 0.2: Run backend baseline checks**

Run:

```powershell
cd backend
npm test
npm run build
npx prisma validate
npx prisma generate
```

Expected:

- Tests pass.
- TypeScript build passes.
- Prisma validates the schema and generates the client without schema drift errors.

- [ ] **Step 0.3: Run frontend baseline checks**

Run:

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Expected:

- Tests pass.
- ESLint passes.
- Next production build passes.

- [ ] **Step 0.4: Run repo-level checks**

Run:

```powershell
$env:JWT_SECRET = "local-release-check-jwt-secret"
$env:REFRESH_TOKEN_SECRET = "local-release-check-refresh-secret"
docker compose config
git diff --check
```

Expected:

- Compose config renders.
- Any obsolete Compose `version` warning is recorded but not treated as a blocker unless config rendering fails.
- No whitespace errors.

- [ ] **Step 0.5: Record baseline status**

Update `docs/dev-notes.md` with a short session entry only if a meaningful blocker or decision is found. Keep it concise and do not create extra status Markdown files.

---

## Phase 1: Tenant Security And Role Hardening

**Files:**
- Modify: `backend/src/clients/clients.access.ts`
- Modify: `backend/src/clients/clients.controller.ts`
- Modify: `backend/src/clients/clients.service.ts`
- Modify: `backend/src/clients/clients.serializers.ts`
- Modify: `backend/src/clients/clients.validation.ts`
- Modify: `backend/tests/clients.access.test.ts`
- Modify: `backend/tests/clients.routes.test.ts`
- Modify: `backend/tests/clients.production-records.test.ts`
- Modify: `frontend/src/lib/role-access.ts`
- Modify: `frontend/tests/role-access.test.mjs`
- Update if behavior changes: `docs/api.md`
- Update if behavior changes: `docs/architecture.md`

- [ ] **Step 1.1: Confirm identity and permission model**

Read:

```powershell
Get-Content backend/src/clients/clients.access.ts
Get-Content backend/src/clients/clients.controller.ts
Get-Content frontend/src/lib/role-access.ts
```

Expected permission model:

- Client users read only active organizations where they have active membership.
- Internal client-management roles manage all client organizations.
- Web developer role variants can access Client Operations only, not broad company Operations administration.
- Archived client organizations remain visible internally and hidden from client users.

- [ ] **Step 1.2: Add or verify wrong-tenant route coverage**

In `backend/tests/clients.routes.test.ts`, ensure coverage exists for:

- Client A cannot read Client B overview.
- Client A cannot list Client B tickets through `organizationId`.
- Client A cannot respond to Client B approval.
- Client users cannot create or update production records.
- Archived client organizations disappear from client-facing list and overview access.

Run:

```powershell
cd backend
npm test
```

Expected:

- Tests fail first if a missing tenant boundary is exposed.
- Tests pass after the boundary is corrected.

- [ ] **Step 1.3: Verify protected fields cannot be set by clients**

In `backend/tests/clients.routes.test.ts` and `backend/tests/clients.production-records.test.ts`, verify client-submitted or management-submitted payloads cannot override:

- `organizationId`
- `createdById`
- `assignedToId`
- `internalNotes`
- creator/requester IDs
- decision timestamps
- publish timestamps
- membership organization through body payloads

Run:

```powershell
cd backend
npm test
```

Expected:

- Server derives ownership and audit fields from route params and authenticated context.
- Protected fields are ignored or rejected consistently.

- [ ] **Step 1.4: Verify frontend route guards match backend intent**

In `frontend/tests/role-access.test.mjs`, ensure:

- `web_developer`, `website_developer`, and `webdev` can see Client Side.
- Ordinary employees cannot see Client Side.
- Client users cannot see Client Side or general Operations admin links.
- Admin and operations manager can see Client Side.

Run:

```powershell
cd frontend
node --test tests/role-access.test.mjs
```

Expected:

- Role access tests pass.
- Frontend role helpers do not grant backend authority; they only shape navigation.

---

## Phase 2: Backend API, Validation, And Database Readiness

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Inspect: `backend/prisma/migrations/202605270001_client_portal_production_records/migration.sql`
- Modify: `backend/src/clients/clients.validation.ts`
- Modify: `backend/src/clients/clients.service.ts`
- Modify: `backend/src/clients/clients.controller.ts`
- Modify: `backend/tests/clients.production-records.test.ts`
- Modify: `backend/tests/clients.routes.test.ts`
- Update if schema or relationship notes change: `docs/database.md`
- Update if route behavior changes: `docs/api.md`

- [ ] **Step 2.1: Validate migration safety**

Run:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

Inspect:

```powershell
Get-Content backend/prisma/migrations/202605270001_client_portal_production_records/migration.sql
```

Expected:

- Migration is additive for client portal production records.
- No destructive drop/rename of existing task, payroll, chat, or user records.
- Foreign keys and unique constraints match `docs/database.md`.

- [ ] **Step 2.2: Review and tighten validation**

In `backend/src/clients/clients.validation.ts`, verify allowed values and required fields for:

- organization status
- membership status and role
- work item status/priority/progress
- approval status and response status
- report periods and numeric metrics
- roadmap priority/status
- asset status/type
- billing status and amount
- calendar status, start date, optional end date

Run:

```powershell
cd backend
npm test
```

Expected:

- Bad statuses return `400`.
- Invalid dates return `400`.
- Out-of-range progress and negative metric values are rejected where applicable.

- [ ] **Step 2.3: Check overview query shape**

Inspect `backend/src/clients/clients.service.ts` for `findOrganizationOverview` or equivalent overview loading.

Expected:

- Queries are tenant-scoped.
- Client-facing responses select only needed relations.
- Internal-only fields are removed by serializers.
- Large lists have a practical cap or are documented as a follow-up if real data volume is still small.

- [ ] **Step 2.4: Verify API error behavior**

Add route assertions where missing:

- unauthenticated returns `401`
- unauthorized returns `403`
- missing record returns `404`
- invalid input returns `400`
- database relation failure returns safe `400` or `404`, not raw Prisma errors

Run:

```powershell
cd backend
npm test
npm run build
```

Expected:

- API behavior is safe and predictable for client/admin workflows.

---

## Phase 3: Frontend UX Polish And Accessibility

**Files:**
- Modify: `frontend/src/app/client/page.tsx`
- Modify: `frontend/src/app/client/work/page.tsx`
- Modify: `frontend/src/app/client/approvals/page.tsx`
- Modify: `frontend/src/app/client/messages/page.tsx`
- Modify: `frontend/src/app/client/reports/page.tsx`
- Modify: `frontend/src/app/client/resources/page.tsx`
- Modify: `frontend/src/app/client/account/page.tsx`
- Modify: `frontend/src/app/client/calendar/page.tsx`
- Modify: `frontend/src/app/client/tickets/page.tsx`
- Modify: `frontend/src/app/operations/clients/page.tsx`
- Modify: `frontend/src/app/operations/clients/accounts/page.tsx`
- Modify: `frontend/src/app/operations/clients/delivery/page.tsx`
- Modify: `frontend/src/app/operations/clients/requests/page.tsx`
- Modify: `frontend/src/app/operations/clients/approvals/page.tsx`
- Modify: `frontend/src/app/operations/clients/reports/page.tsx`
- Modify: `frontend/src/app/operations/clients/assets/page.tsx`
- Modify: `frontend/src/app/operations/clients/billing/page.tsx`
- Modify: `frontend/src/app/operations/clients/roadmap/page.tsx`
- Modify: `frontend/src/app/operations/clients/calendar/page.tsx`
- Modify: `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- Modify: `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- Modify: `frontend/src/components/client-portal/production-records/*.tsx`
- Modify if shared layout needs correction: `frontend/src/components/Modal.tsx`
- Modify if sidebar/header spacing needs correction: `frontend/src/components/Sidebar.tsx`
- Modify if drawer behavior regresses: `frontend/src/components/ProfileSidebar.tsx`
- Modify if drawer behavior regresses: `frontend/src/components/NotificationSidebar.tsx`

- [ ] **Step 3.1: Run browser layout audit for admin Client Side**

Use Playwright/Chrome against local production preview.

Routes:

- `/operations/clients`
- `/operations/clients/accounts`
- `/operations/clients/delivery`
- `/operations/clients/requests`
- `/operations/clients/approvals`
- `/operations/clients/reports`
- `/operations/clients/assets`
- `/operations/clients/billing`
- `/operations/clients/roadmap`
- `/operations/clients/calendar`

Viewports:

- `1366x900`
- `1024x768`
- `390x844`

Expected:

- No horizontal overflow.
- No clipped filters, forms, cards, modals, or sidebars.
- Client picker and summary header remain usable.
- Empty states are readable.
- Buttons fit labels and icons.
- Dialogs align with sidebar/header and stay scrollable.

- [ ] **Step 3.2: Run browser layout audit for client portal**

Routes:

- `/client`
- `/client/work`
- `/client/approvals`
- `/client/messages`
- `/client/reports`
- `/client/resources`
- `/client/account`
- `/client/calendar`
- `/client/tickets`

Viewports:

- `1366x900`
- `1024x768`
- `390x844`

Expected:

- Client users see only client-safe surfaces.
- Progress, requests, approvals, reports, resources, account, and calendar surfaces are readable.
- Client action buttons are obvious and not crammed.
- Sidebar remains the primary navigation; duplicate in-page navigation does not return.

- [ ] **Step 3.3: Fix layout defects incrementally**

For every defect, prefer scoped changes in the affected page or shared panel. Avoid broad redesign.

Check after each focused batch:

```powershell
cd frontend
npm run lint
npm run build
```

Expected:

- No new lint/build failures.
- Visual fix does not break other Client Side pages.

- [ ] **Step 3.4: Accessibility smoke**

Manual/browser checks:

- Tab through sidebar, client picker, action buttons, modals, forms, calendar controls, and ticket reply controls.
- Confirm visible focus states.
- Confirm inputs have labels.
- Confirm icon-only controls have accessible names.
- Confirm destructive actions use confirmation where needed.
- Confirm modals close with Cancel and do not trap scroll incorrectly.

Run:

```powershell
cd frontend
npm run lint
```

Expected:

- Accessibility lint rules pass.
- Manual keyboard flow is usable for primary workflows.

---

## Phase 4: Admin/Client Workflow QA And Communication Polish

**Files:**
- Modify: `frontend/src/components/client-portal/AdminTicketPanel.tsx`
- Modify: `frontend/src/components/client-portal/AdminTicketList.tsx`
- Modify: `frontend/src/components/client-portal/AdminClientRequestsPanel.tsx`
- Modify: `frontend/src/app/client/tickets/page.tsx`
- Modify: `frontend/src/app/client/messages/page.tsx`
- Modify: `frontend/src/app/client/work/page.tsx`
- Modify: `frontend/src/app/client/approvals/page.tsx`
- Modify: `frontend/src/lib/client-communication.ts`
- Modify: `frontend/tests/client-communication.test.mjs`
- Modify: `frontend/tests/client-approval-actions.test.mjs`
- Update if behavior changes: `docs/features.md`

- [ ] **Step 4.1: Verify the client onboarding path**

Manual local flow:

1. Admin creates or selects a client organization.
2. Admin invites an external client contact.
3. Client setup link exists when email delivery is not configured.
4. Client completes setup/reset flow.
5. Client logs in and lands on `/client`.
6. Client sees only assigned organization data.

Expected:

- The flow can be explained and performed without database hand-editing.
- Missing email configuration does not block manual onboarding because setup link is available internally.

- [ ] **Step 4.2: Verify request communication loop**

Manual local flow:

1. Client creates a website change request.
2. Admin sees it under `/operations/clients/requests`.
3. Admin sends a client-visible reply.
4. Admin adds an internal note.
5. Client sees the visible reply and not the internal note.
6. Next-action label changes to the correct owner.

Run:

```powershell
cd frontend
node --test tests/client-communication.test.mjs tests/client-ticket-filters.test.mjs
```

Expected:

- Client/admin communication state is clear.
- Internal notes stay internal.

- [ ] **Step 4.3: Verify approvals loop**

Manual local flow:

1. Admin creates approval request.
2. Client sees approval request.
3. Client approves or requests changes with a response note.
4. Admin sees response and status.

Run:

```powershell
cd frontend
node --test tests/client-approval-actions.test.mjs
```

Expected:

- Approval action errors are clear.
- Closed approvals are not presented as open action items.

- [ ] **Step 4.4: Polish communication copy only where it affects workflow**

Review visible labels for:

- next action
- team response needed
- client response needed
- approval required
- ready for review
- internal note
- client-visible reply

Expected:

- Copy tells the user who needs to act next.
- No instructional text floods the UI.

---

## Phase 5: Performance And Stability

**Files:**
- Inspect/modify: `frontend/src/hooks/useClientOperationsWorkspace.ts`
- Inspect/modify: `frontend/src/hooks/useClientPortalWorkspace.ts`
- Inspect/modify: `frontend/src/components/ui/LazyFullCalendar.tsx`
- Inspect/modify: `frontend/src/lib/client-portal.ts`
- Inspect/modify: `backend/src/clients/clients.service.ts`
- Inspect/modify: `backend/src/notifications/socket.service.ts`
- Update if architecture changes: `docs/architecture.md`

- [ ] **Step 5.1: Review frontend bundle and heavy routes**

Run:

```powershell
cd frontend
npm run build
```

Expected:

- Build output does not show unexpectedly large client chunks for non-calendar pages.
- FullCalendar remains lazy-loaded.
- No client route imports FullCalendar unless calendar UI is needed.

- [ ] **Step 5.2: Review duplicate or heavy API calls**

Inspect:

```powershell
Get-Content frontend/src/hooks/useClientOperationsWorkspace.ts
Get-Content frontend/src/hooks/useClientPortalWorkspace.ts
```

Expected:

- Client Operations does not fetch heavy user lists on every route unless required.
- Overview refreshes after mutations but does not loop.
- Client portal pages avoid duplicated overview calls where shared workspace data already exists.

- [ ] **Step 5.3: Review backend overview payload cost**

Inspect `backend/src/clients/clients.service.ts`.

Expected:

- Overview includes the records needed for the page.
- Obvious unbounded high-volume records are capped or documented as a later pagination task.
- No N+1 query loop is introduced for organization overview.

- [ ] **Step 5.4: Verify socket warnings do not mask real errors**

Inspect `frontend/src/context/SocketContext.tsx` and `backend/src/notifications/socket.service.ts`.

Expected:

- Expected unauthenticated local socket failures do not trigger disruptive UI errors.
- Real authorization failures are still logged clearly enough for debugging.

---

## Phase 6: Deployment, Environment, And Observability

**Files:**
- Modify if needed: `backend/src/config/env.config.ts`
- Modify if needed: `backend/src/config/cors.config.ts`
- Modify if needed: `backend/src/main.ts`
- Modify if needed: `docker-compose.yml`
- Modify if needed: `README.md`
- Update: `docs/dev-notes.md`
- Update if deployment shape changes: `docs/architecture.md`

- [ ] **Step 6.1: Verify required environment configuration**

Inspect:

```powershell
Get-Content backend/src/config/env.config.ts
Get-Content backend/src/config/cors.config.ts
Get-Content backend/src/main.ts
```

Expected:

- Required auth secrets fail fast in production.
- CORS allows only configured origins in production.
- Logs do not print tokens, secrets, full reset links, or sensitive provider payloads.

- [ ] **Step 6.2: Validate health and auth smoke**

Run locally:

```powershell
Invoke-WebRequest http://localhost:4000/health -UseBasicParsing
Invoke-WebRequest http://localhost:3001/login -UseBasicParsing
```

Expected:

- Backend health returns success.
- Frontend login page loads from production preview.

- [ ] **Step 6.3: Validate preview tunnel as review-only**

Run against the current temporary Cloudflare URL only when the tunnel is active:

```powershell
Invoke-WebRequest https://trials-gmc-auburn-adsl.trycloudflare.com/login -UseBasicParsing
```

Expected:

- Temporary host is reachable for review.
- It is not treated as the production host.

- [ ] **Step 6.4: Prepare production deployment checklist**

Document in `docs/dev-notes.md`:

- real hosting target
- frontend build command
- frontend start command or Vercel framework settings
- backend build command
- backend start command
- required backend environment variables
- database migration command
- rollback command or rollback path
- post-deploy smoke URLs

Expected:

- Deployment can be repeated by another engineer without guessing.

---

## Phase 7: End-To-End Browser QA

**Files:**
- Create if useful: `frontend/tests/e2e/client-operations-smoke.mjs`
- Create if useful: `frontend/tests/e2e/client-portal-smoke.mjs`
- Modify if browser defects are found: affected frontend route/component files
- Update: `docs/dev-notes.md`

- [ ] **Step 7.1: Build reusable browser smoke fixtures**

Use Playwright with mocked API data when local seeded data is not enough.

Fixtures should cover:

- approved admin
- web developer
- client user
- active client organization
- archived client organization
- open ticket with visible and internal comments
- approval request
- work item
- report
- asset
- billing status
- calendar item

Expected:

- Browser QA can run without depending on fragile manual database setup.

- [ ] **Step 7.2: Admin smoke**

Check:

- Client Side navigation appears for admin/webdev.
- Overview loads.
- Accounts route can show current and archived clients.
- Requests route shows ticket list/detail/reply controls.
- Approval, report, asset, billing, roadmap, and calendar pages load.
- Modals open and close.
- No horizontal overflow at target viewports.

Expected:

- Admin workflow is usable without visual breakage.

- [ ] **Step 7.3: Client smoke**

Check:

- Client user lands on `/client`.
- Client user cannot access `/dashboard` or Client Side admin routes.
- Work, requests, approvals, messages, reports, resources, account, and calendar routes load.
- Client sees visible records only.
- Internal notes and hidden records are absent from rendered text.

Expected:

- Client workflow is safe and understandable.

- [ ] **Step 7.4: Real local smoke after mocked smoke**

Use the running local backend and frontend preview.

Expected:

- Auth, API proxying, CORS, and route guards work without mocks.
- Any seed-data limitation is documented honestly.

---

## Phase 8: Final Release Review And Merge Preparation

**Files:**
- Update: `docs/dev-notes.md`
- Update if features changed: `docs/features.md`
- Update if API changed: `docs/api.md`
- Update if schema changed: `docs/database.md`
- Update if architecture changed: `docs/architecture.md`

- [ ] **Step 8.1: Run final full check suite**

Run:

```powershell
cd backend
npm test
npm run build
npx prisma validate
npx prisma generate
npm audit
```

Run:

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit
```

Run:

```powershell
$env:JWT_SECRET = "local-release-check-jwt-secret"
$env:REFRESH_TOKEN_SECRET = "local-release-check-refresh-secret"
docker compose config
git diff --check
```

Expected:

- All required checks pass or a clearly documented blocker remains.
- Audits are reviewed for severity and exploitability before deciding release risk.

- [ ] **Step 8.2: Review final diff**

Run:

```powershell
git status --short
git diff --stat
git diff --check
```

Expected:

- Only intentional source, tests, migration, and docs files are changed.
- No temporary preview artifacts or generated local files are included.

- [ ] **Step 8.3: Prepare release summary**

Prepare a concise release summary with:

- client/admin features shipped
- security boundaries verified
- database migration summary
- verification commands and results
- known limitations
- rollback/recovery notes

Expected:

- User can decide whether to merge/deploy from clear evidence.

- [ ] **Step 8.4: Wait for explicit release approval**

Do not run:

```powershell
git commit
git push
git merge
```

until the user explicitly asks for commit, push, merge, or production deployment.

---

## Execution Strategy

Recommended execution order:

1. Phase 0 baseline.
2. Phase 1 security and tenant hardening.
3. Phase 2 backend/database readiness.
4. Phase 3 frontend UX/accessibility polish.
5. Phase 4 admin/client workflow QA.
6. Phase 5 performance and stability.
7. Phase 6 deployment readiness.
8. Phase 7 browser QA.
9. Phase 8 release review.

If any phase exposes a blocker, fix that blocker before moving forward. Keep changes scoped to the phase unless a shared root cause is proven.

## Self-Review

- Spec coverage: The plan covers UI polish, tenant security, database/migration readiness, deployment/env checks, accessibility, performance, admin/client workflow QA, final verification, and release staging.
- Placeholder scan: No `TBD`, `TODO`, or unspecified "handle edge cases" tasks remain.
- Type consistency: File paths and command surfaces match the current documented backend/frontend split.
