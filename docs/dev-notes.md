# Development Notes

## 2026-06-01 - Main CI And Avatar Bypass Fix

### Completed

- Updated backend GitHub Actions jobs to provision the disposable CI PostgreSQL database from the Prisma schema with `prisma db push`, because the current migration history is not an empty-database baseline.
- Updated the repository whitespace workflow so push and pull-request events check the actual changed commit/range instead of an empty clean-checkout diff.
- Added a reusable stored-avatar validator so user creation, direct avatar upload, and profile updates all reject invalid or mismatched image data URIs.
- Expanded upload validation tests to cover stored avatar values, including valid PNG data URIs, mismatched signatures, unsupported SVG data URIs, URL strings, empty values, and non-string input.

### Files Changed

- `.github/workflows/backend-ci.yml`
- `.github/workflows/ci.yml`
- `backend/src/uploads/upload.validation.ts`
- `backend/src/users/users.controller.ts`
- `backend/tests/upload.validation.test.ts`
- `docs/api.md`
- `docs/architecture.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept CI schema provisioning separate from production migration deployment until a true baseline migration strategy is planned.
- Preserved existing URL and empty-avatar workflows while enforcing content validation for base64 image data URIs.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- From repo root with temporary local secrets: `docker compose config`
- From repo root: `git diff --check`

### Next Steps

- Plan a dedicated Prisma migration baseline cleanup before making CI rely on `prisma migrate deploy` against an empty database.

## 2026-05-31 - Main Workflow And Upload Hardening

### Completed

- Expanded GitHub Actions coverage on `main` so backend CI has a disposable PostgreSQL service and runs Prisma validation, backend tests, build, and dependency audit.
- Expanded the full CI pipeline to run backend tests/build/audit, frontend tests/lint/build/audit, Prisma validation, schema provisioning for CI, `git diff --check`, and Docker Compose config validation.
- Hardened generic upload and avatar validation so decoded content signatures must match declared file/image types.
- Updated the standalone frontend start script to run the generated standalone server.
- Removed the root package dependency sink and added a root lockfile so root-level audits have a deterministic package surface.

### Files Changed

- `.github/workflows/backend-ci.yml`
- `.github/workflows/ci.yml`
- `backend/src/uploads/upload.validation.ts`
- `backend/src/uploads/uploads.controller.ts`
- `backend/src/users/users.controller.ts`
- `backend/tests/run-tests.ts`
- `backend/tests/upload.validation.test.ts`
- `frontend/next.config.ts`
- `frontend/package.json`
- `package.json`
- `package-lock.json`
- `docs/api.md`
- `docs/architecture.md`
- `docs/dev-notes.md`

### Decisions Made

- Kept upload signature checks dependency-free and focused on the file types already accepted by the API.
- Used a disposable PostgreSQL service in CI because the backend route tests exercise real Prisma writes.
- Kept package dependencies owned by `backend/` and `frontend/`; root scripts only orchestrate verification.
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

- Replace production `console.log` calls with a structured logger in a later backend observability pass.

## 2026-05-31 - Client Service Tier Management

### Completed

- Added manager-only API routes to list, create, and update client service tiers.
- Added a manager-only client organization route to assign or clear a service tier.
- Added Client Operations account controls for assigning tiers during client creation, changing a selected client's tier, and adding/editing tier records.
- Preserved client-safe serialization so client users can see tier name/description but not internal monthly price or priority rank.
- Replaced the Billing screen's free-text plan field with service tier assignment so billing reflects the same tier used elsewhere.
- Updated account, billing, operations overview, and client account displays to prefer the assigned service tier over legacy billing plan text.
- Added internal activity/audit records when a manager assigns or clears a client's service tier.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.activity.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.activity.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/src/app/client/account/page.tsx`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/app/operations/clients/billing/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/client-portal/AdminClientAccountProfilePanel.tsx`
- `frontend/src/components/client-portal/AdminClientServiceTiersPanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/production-records/BillingPanel.tsx`
- `frontend/src/lib/client-operations-navigation.ts`
- `frontend/src/lib/client-portal-navigation.ts`
- `frontend/src/lib/client-portal-display.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-production-record-forms.ts`
- `frontend/src/lib/client-service-tiers.ts`
- `frontend/tests/client-activity.test.mjs`
- `frontend/tests/client-portal-display.test.mjs`
- `frontend/tests/client-production-record-forms.test.mjs`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Reused the existing `ClientServiceTier` and `ClientOrganization.tierId` schema instead of adding a migration.
- Kept service tier management restricted to existing client-management access.
- Made service tier the billing tier source of truth; billing status now stays focused on payment status, amount, renewal date, and client visibility.
- Kept backend `billingStatus.planName` as a legacy-compatible field for existing records, but the billing UI no longer edits or submits it.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Next Steps

- Consider a later migration or cleanup path for legacy billing `planName` values after production data is reviewed.

## 2026-05-30 - Internal Route Visual Smoke and Touch Target Pass

### Completed

- Increased shared button, card, icon-button, pagination, sidebar, and time-clock touch targets used across internal routes.
- Fixed Daily Logs mobile layout overflow by switching the filter/content layout to a responsive grid and wrapping log metadata/actions.
- Tightened compact controls in Chat, File Directory, Operations, and Task Tracking so desktop and mobile controls meet the visual-smoke target baseline.
- Added a reusable Playwright-powered visual smoke script covering client, client-operations, and core internal routes at desktop and mobile viewports.

### Files Changed

- `frontend/package.json`
- `frontend/scripts/visual-smoke.mjs`
- `frontend/src/app/chat/page.tsx`
- `frontend/src/app/daily-logs/page.tsx`
- `frontend/src/app/file-directory/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/app/task-tracking/page.tsx`
- `frontend/src/components/Button.tsx`
- `frontend/src/components/Card.tsx`
- `frontend/src/components/IconButton.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/TimeClock.tsx`
- `frontend/src/components/chat/ChatSidebar.tsx`
- `frontend/src/components/chat/MessageInput.tsx`
- `frontend/src/components/file-directory/DriveFileViewer.tsx`
- `frontend/src/components/file-directory/FolderCard.tsx`
- `frontend/src/components/ui/Pagination.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the broader internal polish pass frontend-only; no backend routes, database schema, permission rules, or API contracts changed.
- Use one mocked visual-smoke script for the route matrix so future touch-target, redirect, page-error, and horizontal-overflow regressions are repeatable.
- Patch shared controls where possible, then only patch route-specific controls when the visual smoke identified a concrete issue.

### How to Test

- `cd frontend && npm run test:visual`
- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `cd backend && npm test`
- `cd backend && npm run build`
- `git diff --check`

### Next Steps

- Run `npm run test:visual` before future release pushes that touch route layouts or shared controls.

## 2026-05-30 - Client Portal Touch Target Polish

### Completed

- Increased tap targets for client/admin portal preset buttons, status controls, calendar controls, and visibility checkboxes.
- Increased shared client portal pill choice controls so request type and priority selections meet the same touch-target baseline.
- Added shared checkbox classes for Client Operations forms so client-visible toggles have consistent spacing and focusable hit areas.
- Tightened client-operations grid overflow handling so the account picker and route content do not force horizontal layout spillover.

### Files Changed

- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/client-portal/AdminClientMetricsPanel.tsx`
- `frontend/src/components/client-portal/AdminClientResourcesPanel.tsx`
- `frontend/src/components/client-portal/AdminClientUpdatesPanel.tsx`
- `frontend/src/components/client-portal/AdminTicketList.tsx`
- `frontend/src/components/client-portal/ChoiceGroup.tsx`
- `frontend/src/components/client-portal/ClientOperationsPanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/TicketDetailPresets.tsx`
- `frontend/src/components/client-portal/production-records/shared.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the pass frontend-only; no API contracts, backend permissions, database behavior, or client visibility rules changed.
- Prefer shared form-control classes inside the client-portal component layer instead of repeating checkbox styling in each admin panel.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm test`
- Browser smoke on `/client/tickets` and `/operations/clients` with mobile and desktop viewport checks for control sizing and overflow.

### Next Steps

- If time allows, browser-check the broader client/admin route set for any remaining tight controls after this tap-target pass.

## 2026-05-29 - Admin Client Operations Route Remodel Pass

### Completed

- Added route-specific production control summaries to `ClientOperationsShell` so every Client Operations admin route shows the right operational metrics for its workflow.
- Applied the shared production panel shell to production-record mini panels used by work items, approvals, reports, assets, billing, roadmap, and calendar.
- Preserved existing admin route behavior, client selection, role checks, mutation refresh flow, and API contracts.

### Files Changed

- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/production-records/shared.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Upgrade all admin client routes through shared shell composition instead of copying summary widgets into each route page.
- Keep admin routes denser than the client portal while making the control state more obvious: open work, requests, approvals, reports, assets, billing, roadmap, and calendar.
- Keep this pass frontend-only; no backend routes, schema, permission helpers, or client visibility rules changed.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm test`
- Playwright/Chrome smoke on `/operations/clients` and all focused Client Operations routes with mocked client API data.

### Next Steps

- Run the final review and git sequence after all verification gates pass.
- In a later pass, bring the same production density to broader internal routes: dashboard, task tracking, daily logs, payroll, chat, file directory, and operations.

## 2026-05-29 - Client Route Production Remodel Pass

### Completed

- Added a shared production route summary to `ClientPortalWorkspaceFrame` so work, approvals, messages, reports, resources, account, and calendar inherit the same live client status band.
- Upgraded `/client/tickets` with the production metric strip and reusable production panel system while preserving request creation, filtering, editing, deletion, comments, quick replies, and next-action signals.
- Kept this pass frontend-only; no API contracts, backend permissions, ownership gates, or database behavior changed.

### Files Changed

- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Prefer the shared frame for client route consistency instead of duplicating a hero/header implementation in every client page.
- Keep client-owned edit/delete rules and existing request-center state management intact.
- Treat the command center remodel as the design source for the remaining client route polish.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm test`
- Playwright/Chrome smoke on `/client/work`, `/client/approvals`, `/client/messages`, `/client/reports`, `/client/resources`, `/client/account`, `/client/calendar`, and `/client/tickets` with mocked client API data.

### Next Steps

- Start the admin Client Operations route pass for accounts, delivery, requests, approvals, reports, assets, billing, roadmap, and calendar.
- After admin routes, run a broader app-shell/dashboard/task/log/payroll polish pass.

## 2026-05-29 - Client And Admin UI Remodel Slice

### Completed

- Added shared production workspace components for hero summaries, metric strips, stat grids, and reusable panels.
- Remodeled the client command center around live workspace status, next client action, visible delivery progress, updates, communication, request submission, metrics, and resources.
- Remodeled the admin client-operations overview with the same production structure while preserving client scoping, role access, and existing API contracts.
- Polished the global header/sidebar shell for a more coherent production app frame.
- Updated the product/design direction docs to capture the client/admin command-center remodel principles.

### Files Changed

- `PRODUCT.md`
- `DESIGN.md`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/globals.css`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/client-portal/ClientOperationsPanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/ClientPortalPanel.tsx`
- `frontend/src/components/workspace/ProductionWorkspace.tsx`
- `reports/client-portal-ui-remodel.html`
- `docs/dev-notes.md`

### Decisions Made

- Keep this as a frontend-only remodel slice; no backend routes, database schema, auth behavior, or client organization scoping changed.
- Use the reference website patterns as production app architecture, not a 1:1 marketing clone.
- Use existing Tailwind, shadcn setup, lucide icons, and local data builders instead of adding a new animation or component dependency.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm test`
- Playwright/Chrome smoke on `/client` and `/operations/clients` at desktop and mobile widths with mocked client API data.

### Next Steps

- Carry the same shared production component system into the remaining client routes: work, approvals, messages, reports, resources, account, and calendar.
- Then apply the admin-side pattern across accounts, delivery, requests, approvals, reports, assets, billing, roadmap, and calendar.
- Add focused visual regression coverage once the remaining remodel slices settle.

## 2026-05-28 - P3 Socket Event Authorization

### Completed

- Added reusable Socket.IO conversation authorization helpers for safe conversation id parsing, participant checks, and server-derived typing payloads.
- Hardened `join:conversation` so invalid conversation ids are rejected before database lookup and room names use normalized ids.
- Hardened `typing:start` and `typing:stop` so typing relays require conversation membership and no longer trust client-provided `userId` or `userName`.
- Updated the chat frontend to emit only the conversation id for typing events.
- Added focused backend tests for spoofed typing identity, invalid conversation ids, participant authorization, and missing participant denial.

### Files Changed

- `backend/src/notifications/socket.authorization.ts`
- `backend/src/notifications/socket.service.ts`
- `backend/tests/socket.authorization.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/src/app/chat/page.tsx`
- `.github/copilot-instructions.md`
- `docs/dev-notes.md`

### Decisions Made

- Treat the JWT payload as the identity source for socket events.
- Keep authorization close to each conversation-scoped socket action instead of relying on prior room joins.
- Ignore invalid/unauthorized typing events without broadcasting them to other clients.

### How to Test

- `cd backend && npx ts-node tests/socket.authorization.test.ts`
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Next Steps

- Add upload magic-byte validation and avatar storage hardening.
- Add a structured logger to replace production `console.log` usage.

## 2026-05-28 - P2 Auth Rate Limiting And Security Headers

### Completed

- Added Helmet-based backend security headers with strict API-safe CSP, frame blocking, no-sniff, referrer policy, and production-only HSTS.
- Added auth route rate limiting for login, signup, forgot-password, and reset-password flows.
- Added Redis-backed auth rate-limit storage for production/distributed deployments, with memory mode for local development and tests.
- Added a Redis service to Docker Compose and wired the backend to use it for distributed auth limits.
- Added focused backend middleware tests for 429 throttling, endpoint isolation, rate-limit headers, store-mode resolution, and security headers.

### Files Changed

- `backend/src/security/rate-limit-config.ts`
- `backend/src/security/rate-limits.ts`
- `backend/src/security/redis-rate-limit.store.ts`
- `backend/src/security/security-headers.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/config/env.config.ts`
- `backend/src/main.ts`
- `backend/tests/security.middleware.test.ts`
- `backend/tests/run-tests.ts`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/.env.example`
- `docker-compose.yml`
- `.github/copilot-instructions.md`
- `docs/architecture.md`
- `docs/dev-notes.md`

### Decisions Made

- Use Redis for production auth limiter state so multiple backend instances share the same counters.
- Keep local/test default storage in memory to avoid requiring Redis for fast developer checks.
- Apply rate limits at the auth route boundary before controller logic runs.
- Keep HSTS production-only so local HTTP development is not affected.

### How to Test

- `cd backend && npx ts-node tests/security.middleware.test.ts`
- `cd backend && npm test`
- `cd backend && npm run build`
- `docker compose config` with local `POSTGRES_PASSWORD`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET`

### Next Steps

- Add upload magic-byte validation.
- Evaluate CSRF strategy for any browser-cookie-authenticated flows.
- Continue controller input validation work with a dedicated validation library.

## 2026-05-28 - P1 Repository Hardening Cleanup

### Completed

- Added backend and frontend Docker ignore files so local env files, build output, uploads, debug outputs, logs, backups, and caches are not sent into image build contexts.
- Switched the backend Docker build from `npm install` to lockfile-based `npm ci`.
- Removed tracked one-off backend check/fix/list/debug/cleanup/test scripts, old manual seed scripts, seed logs, frontend throwaway test helpers, and `.bak` page files.
- Replaced the Prisma seed data with synthetic demo accounts and required `SEED_DEFAULT_PASSWORD` instead of a checked-in shared password.
- Replaced the chat avatar fallback with local initials so missing avatars do not send names to a third-party image service.
- Removed the Docker Compose `POSTGRES_PASSWORD` fallback so Compose requires an explicit local database password, matching the existing JWT secret behavior.

### Files Changed

- `backend/.dockerignore`
- `frontend/.dockerignore`
- `backend/Dockerfile`
- `docker-compose.yml`
- `backend/package.json`
- `backend/.env.example`
- `backend/prisma/seed.ts`
- `frontend/src/app/chat/page.tsx`
- `frontend/next.config.ts`
- `.github/copilot-instructions.md`
- `docs/architecture.md`
- Removed obsolete tracked scripts and throwaway files from `backend/`, `backend/src/final_sync.ts`, and root-level frontend helper/backup files.

### Decisions Made

- Keep durable seed behavior in `backend/prisma/seed.ts`, but make it synthetic and local-password driven.
- Do not preserve one-off database mutation/debug scripts in tracked source; recreate deliberate admin tooling later under a documented tools area if needed.
- Treat Docker build context contents as part of security posture, not just deployment convenience.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npx prisma generate`
- `cd backend && npm ci --dry-run`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd frontend && npm ci --dry-run`
- `docker compose config` with local `POSTGRES_PASSWORD`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET`
- `git diff --check`
- Search tracked files for removed sensitive fixture strings and password-hash logging.

### Next Steps

- Auth rate limiting and security headers were completed in the 2026-05-28 P2 hardening pass.
- Consider creating a small, documented `backend/tools/` area only for reusable operator tooling with no real user data.

## 2026-05-27 - Client Portal Request Copy And Public Socket Preview

### Completed

- Removed the extra command-center organization selector and top `Ticket center` shortcut from the client command center.
- Aligned client-facing request copy so the portal says `Requests` instead of exposing internal ticket terminology.
- Fixed mobile overflow on the client Work and Requests pages by allowing grid panels to shrink inside the viewport.
- Moved the Socket.IO client path behind the existing `/api` proxy so the Cloudflare preview no longer calls loopback backend URLs.

### Files Changed

- `backend/src/notifications/socket.service.ts`
- `frontend/next.config.ts`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/client/work/page.tsx`
- `frontend/src/components/client-portal/ClientPortalPanel.tsx`
- `frontend/src/components/client-portal/ClientTicketFilterControls.tsx`
- `frontend/src/context/SocketContext.tsx`
- `frontend/src/lib/client-ticket-filters.ts`
- `frontend/tests/client-ticket-filters.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Keep internal route names and `ClientTicket` types unchanged; only client-visible copy was adjusted.
- Use `/api/socket` for browser Socket.IO traffic so local and temporary public previews share the same Next proxy pattern as REST API calls.

### How to Test

- `cd frontend && npm run lint`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- `cd backend && npm run build`
- `cd backend && npm test`
- Browser smoke: login as the Gem Field demo client and check `/client`, `/client/work`, `/client/messages`, `/client/reports`, `/client/resources`, `/client/tickets`, `/client/calendar`, `/client/approvals`, and `/client/account` on desktop and mobile.
- Public preview smoke: open `/client` and `/client/tickets` through the Cloudflare URL and confirm no `Ticket center`, no client organization selector on Command Center, no horizontal overflow, and no failed socket/API requests.

### Next Steps

- Commit the verified portal cleanup, then push only when the preview is ready to share externally.

## 2026-05-27 - Verification Pass And Calendar Patch Guard

### Completed

- Ran the backend/frontend readiness checks, Prisma validation/generation, dependency audit checks, Compose config validation, and git diff hygiene checks against the current client portal worktree.
- Smoke-tested the local app through a temporary current-source stack on backend `4100` and frontend `3001`, including login, client organization reads, overview reads, ticket reads, action queue reads, and key client/admin pages at desktop and mobile widths.
- Added a backend regression guard so calendar PATCH requests cannot move `endAt` before the existing `startAt` when only `endAt` is submitted.

### Files Changed

- `backend/src/clients/clients.service.ts`
- `backend/tests/clients.routes.test.ts`
- `docs/dev-notes.md`

### Decisions Made

- Keep the date-order guard in the service update path so admin and client calendar updates share the same server-side rule.
- Preserve the existing date-only frontend payload behavior; the fix protects direct API callers and future partial-update clients.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npm run prisma:generate`
- `cd backend && npx prisma migrate status`
- `cd backend && npm audit --audit-level=high`
- `cd frontend && npm audit --audit-level=high`
- `cd backend && npm ci --dry-run`
- `cd frontend && npm ci --dry-run`
- `docker compose config` with local `JWT_SECRET` and `REFRESH_TOKEN_SECRET`
- `git diff --check`
- Browser smoke: login and open `/operations/clients`, `/operations/clients/reports`, `/operations/clients/calendar`, `/client`, `/client/calendar`, `/client/resources`, `/client/tickets`, and `/client/messages` at desktop and mobile widths.

### Next Steps

- Run the same verification suite once more immediately before commit, push, or deployment.

## 2026-05-27 - Client Report Draft Builder

### Completed

- Added an internal-only report draft endpoint that generates `ClientReport` drafts from visible client operations records for a selected period.
- Derived draft summaries from completed work, resolved requests, published updates, approvals, roadmap items, calendar activity, and metric snapshots.
- Added admin `/operations/clients/reports` support for generating an editable draft before publishing.
- Kept client `/client/reports` visibility unchanged: clients only receive reports that are both published and client-visible.

### Files Changed

- `backend/src/clients/clients.report-builder.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.production-records.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/components/client-portal/production-records/ReportsPanel.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-production-record-forms.ts`
- `frontend/tests/client-production-record-forms.test.mjs`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Use draft `ClientReport` records instead of adding a new report-builder table.
- Keep generated drafts editable through the existing report edit/publish controls.
- Derive leads, missed opportunities, reputation, and local visibility from client-visible metric snapshots only.

### How to Test

- `cd backend && npx ts-node tests/clients.production-records.test.ts`
- `cd backend && npx ts-node tests/clients.routes.test.ts`
- `cd frontend && npm test -- client-production-record-forms.test.mjs`
- Browser smoke: open `/operations/clients/reports`, select a client, enter a period, click `Generate Draft`, edit the generated draft, publish it, then confirm it appears on `/client/reports`.

### Next Steps

- Add richer source-specific report sections if operations wants separate editable narrative blocks instead of one generated summary.

## 2026-05-27 - Client Calendar Owned CRUD

### Completed

- Added client-safe calendar create, edit, and delete access for assigned client users.
- Scoped client calendar mutations to records created by the same client user, while internal management keeps full calendar access.
- Forced client-created and client-edited calendar items to stay `planned`, client-visible, organization-scoped, and creator-owned from server context.
- Added `/client/calendar` add/edit/delete controls and date-click creation against the same FullCalendar surface as admin Client Operations.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/client/calendar/page.tsx`
- `frontend/src/lib/client-portal.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Use existing `ClientCalendarItem.createdById` ownership instead of adding a new table or route family.
- Keep admin-created schedule items read-only for clients so clients cannot accidentally change the team's production calendar.
- Keep client calendar items simple and visible by default instead of exposing admin workflow status or visibility controls.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: sign in as a client, open `/client/calendar`, add an item, edit it, delete it, and confirm admin-created calendar items do not show client edit/delete controls.

## 2026-05-27 - Client Workspace Safe CRUD

### Completed

- Added client-owned resource ownership with an additive `ClientResourceLink.createdById` field and migration.
- Added client-safe update/delete API routes for resources, scoped so clients can only edit or delete links they personally shared.
- Added client-safe ticket update/delete API routes. Clients can edit request details for tickets in their assigned organization, and delete requests only before conversation history exists.
- Added edit/delete controls on `/client/resources` and `/client/tickets` with server-side authorization as the source of truth.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605270003_client_resource_ownership/migration.sql`
- `backend/src/clients/clients.activity.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/client/resources/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/lib/client-portal.ts`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Do not give clients admin-style CRUD over reports, billing, delivery tasks, approvals, roadmap, or published calendar records.
- Make client resource mutation ownership explicit with `createdById` instead of relying on frontend filtering or resource type alone.
- Keep destructive ticket deletion limited to requests with no comments so conversation history stays intact.

### How to Test

- `cd backend && npm run prisma:deploy`
- `cd backend && npm run prisma:generate`
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: `/client/resources` and `/client/tickets`.

### Next Steps

- Add optional activity/notification rules for client-shared resource edits if operations wants them in the action queue.

## 2026-05-27 - Client Portal Calendar, Resources, And Messages Polish

### Completed

- Reworked `/client/calendar` to use the same FullCalendar month/week/day schedule surface as admin Client Operations, with client-readable detail and item list panels.
- Added a client-safe resource sharing form on `/client/resources` for title and link submission.
- Allowed assigned client users to create resource links for their own active organization while forcing client-safe `client_link` type, visible resource status, and http/https URLs.
- Updated `/client/messages` so ticket request details appear in conversation history even before replies exist.
- Suppressed the employee time clock on client portal routes to keep client pages focused and avoid payroll fetch noise for external client users.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/client/calendar/page.tsx`
- `frontend/src/app/client/resources/page.tsx`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/lib/client-portal.ts`
- `docs/api.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Keep client calendar read-only, but visually aligned with the admin planning calendar.
- Reuse the existing resource endpoint with stricter client-side authorization and server-derived client-visible fields instead of adding a duplicate route.
- Treat the original ticket description as the first client-visible conversation entry.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: `/client/calendar`, `/client/resources`, and `/client/messages`.

### Next Steps

- Consider adding activity events for client-shared resources if the team wants resource uploads to appear in the action queue.

## 2026-05-27 - Client Activity And Action Queue Foundation

### Completed

- Added an additive `ClientActivity` audit table with scoped visibility for internal and client-visible client-operations events.
- Added activity and action-queue API endpoints with tenant checks, bounded filters, explicit serialization, and route-level tests.
- Recorded audit-significant activity in the same transaction as request replies, approval decisions, billing updates, calendar scheduling/deletion, account archive/restore, work updates, and report publishing.
- Added shared frontend activity and queue helpers, reusable timeline/queue components, and dashboard integrations for admin Client Operations, the client command center, and client Messages.
- Preserved client privacy by forcing client activity reads to `client` visibility and omitting internal metadata from client responses.
- Browser-smoked admin Client Operations, client command center, and mobile client Messages against the local production build with no horizontal overflow.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605270002_client_activity/migration.sql`
- `backend/src/clients/clients.activity.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.activity.test.ts`
- `backend/tests/clients.routes.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/src/lib/client-activity.ts`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `frontend/src/hooks/useClientPortalWorkspace.ts`
- `frontend/src/components/client-portal/ClientActionQueue.tsx`
- `frontend/src/components/client-portal/ClientActivityTimeline.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/tests/client-activity.test.mjs`
- `docs/api.md`
- `docs/database.md`
- `docs/features.md`
- `docs/dev-notes.md`

### Decisions Made

- Keep the action queue derived from existing operational records instead of creating another persistent queue table.
- Store activity events as append-only records and enforce visibility at both query and serializer layers.
- Put the shared queue/timeline UI into reusable client-portal components so admin and client pages can stay visually consistent.

### How to Test

- `cd backend && npm run prisma:deploy`
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run build`
- Browser smoke: `/operations/clients`, `/client`, and `/client/messages` at desktop/mobile widths.

### Next Steps

- Consider adding notification rules on top of `ClientActivity` once the queue behavior is validated with real client workflows.

## 2026-05-27 - Client Operations Production Readiness

### Completed

- Added a phased production-readiness plan for Client Operations security, backend validation, frontend polish, browser QA, deployment smoke checks, and final release review.
- Added route-level tenant isolation tests so client users cannot read another organization, list another organization's tickets, create internal work items, or respond to another organization's approvals.
- Hardened production-record validation for priority values, non-negative report and billing numbers, and calendar date ordering.
- Reduced unnecessary Client Operations data fetching by loading approved users only on the Accounts route where user assignment controls need them.
- Cleaned production startup output by making request logging quiet in normal production mode and replacing emoji startup logs with ASCII text.
- Verified local and Cloudflare preview health, CORS origin handling, protected auth behavior, admin/client communication flows, layout responsiveness, and critical workspace accessibility.

### Files Changed

- `backend/src/clients/clients.validation.ts`
- `backend/src/config/env.config.ts`
- `backend/src/main.ts`
- `backend/tests/clients.production-records.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/next.config.ts`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `docs/dev-notes.md`
- `docs/superpowers/plans/2026-05-27-client-operations-production-readiness.md`

### Decisions Made

- Keep full-production readiness as the priority instead of trimming scope to an MVP pass.
- Preserve client history through scoped visibility, archives, and role checks while using targeted validation to block bad production records before they hit the database.
- Keep broad browser QA based on mocked tenant data for repeatability, and use live local/Cloudflare smoke checks for deployment reachability.
- Treat high or critical dependency audit findings as release blockers before any push or production handoff.

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
- `docker compose config` with local `JWT_SECRET` and `REFRESH_TOKEN_SECRET`
- `git diff --check`
- Browser smoke: verify `/operations/clients/*` and `/client/*` pages at desktop and mobile widths, plus local `/login`, `/health`, and the Cloudflare preview URL.

### Next Steps

- Before production launch, set real production `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `CORS_ORIGIN`, `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_WS_URL` in the hosting environment.
- Replace the temporary Cloudflare preview with the final Vercel/production URL once billing and deployment configuration are complete.
- Run this same release check suite immediately before committing, pushing, or deploying.

## 2026-05-27 - Calendar Date-Only And Hard Delete

### Completed

- Changed Client Calendar form inputs, list labels, and FullCalendar events to use date-only scheduling instead of showing start/end times.
- Added a management-only hard-delete API route for calendar items while keeping archive/restore available for history-preserving cases.
- Added a destructive Delete action to calendar item cards with a confirmation prompt before permanent removal.
- Added backend route coverage for unauthorized calendar deletes, successful deletes, missing-item deletes, and overview removal.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/components/client-portal/production-records/CalendarPanel.tsx`
- `frontend/src/lib/client-planning-records.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/tests/client-planning-records.test.mjs`
- `frontend/tests/client-production-record-forms.test.mjs`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the existing `ClientCalendarItem.startAt`/`endAt` DateTime fields, but submit date-only values from the UI.
- Limit hard delete to calendar items for now because the user explicitly asked for this calendar behavior.
- Keep archive/restore for reversible history and add Delete for records that should be removed entirely.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke: open `/operations/clients/calendar`, create a date-only item, confirm the event/list show only dates, then delete a test item and verify it disappears instead of moving to history.

## 2026-05-27 - Profile Drawer Layout Fix

### Completed

- Fixed the profile drawer so its background and content fill the viewport instead of inheriting the fixed header height.
- Moved profile footer metadata into normal drawer flow so it no longer jumps near the top or overlays page content.
- Applied the same viewport-height drawer foundation to notifications because it used the same sidebar pattern.

### Files Changed

- `frontend/src/components/ProfileSidebar.tsx`
- `frontend/src/components/NotificationSidebar.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the existing slideout interaction, but portal drawer roots to `document.body` with `inset-y-0`, internal scrolling, and lower z-index than shared modals.
- Keep the profile avatar inside the drawer flow with responsive dimensions instead of allowing it to overflow over the workspace.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke: open the profile and notification drawers at desktop and narrow widths, confirm drawer backgrounds cover their content and the page behind remains visually separated.

## 2026-05-27 - Requests Workspace Layout Polish

### Completed

- Reworked the Requests workspace split so the ticket list and detail panel keep useful widths on desktop.
- Changed ticket filters to a wrapping grid so search, status, priority, and type controls do not clip in the left column.
- Replaced the detail panel's desktop top divider with a left divider and converted long reply presets into two-column wrapped buttons.

### Files Changed

- `frontend/src/components/client-portal/AdminClientRequestsPanel.tsx`
- `frontend/src/components/client-portal/AdminTicketPanel.tsx`
- `frontend/src/components/client-portal/ClientTicketFilterControls.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the side-by-side admin workflow on desktop, but make filter controls container-safe.
- Use wrapped quick-reply buttons so canned replies remain readable in dark mode and narrow panes.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke: open `/operations/clients/requests`, verify filters, selected ticket detail, reply visibility, and quick replies in desktop and mobile widths.

## 2026-05-27 - Client Operations Layout Polish

### Completed

- Fixed the shared modal overlay offset so desktop dialogs align with the 288px sidebar instead of starting 32px too far left.
- Reworked the Roadmap board and Client Operations work-area grids to use responsive minimum column widths instead of forcing cramped five-column layouts.
- Delayed the Calendar page two-column split until wider screens so the calendar grid no longer collapses beside the scheduled-work list on standard desktop widths.
- Moved app toast notifications below the fixed header and downgraded expected socket auth failures from console errors to warnings to avoid the local Next.js issue badge covering the UI during development.

### Files Changed

- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/Modal.tsx`
- `frontend/src/components/ToastProvider.tsx`
- `frontend/src/components/client-portal/production-records/CalendarPanel.tsx`
- `frontend/src/components/client-portal/production-records/RoadmapPanel.tsx`
- `frontend/src/context/SocketContext.tsx`
- `docs/dev-notes.md`

### Decisions Made

- Keep the existing client-operations shell and sidebar structure, but make dense internal panels wrap based on available content width.
- Treat invalid local socket tokens as recoverable connection warnings, not page-blocking development errors.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke: verify `/operations/clients/calendar` and `/operations/clients/roadmap` at desktop and mobile widths, open a calendar modal, and confirm no horizontal overflow or Next.js issue badge appears.

## 2026-05-27 - Roadmap And Calendar Planning UI

### Completed

- Replaced always-visible Roadmap form inputs with modal-based create/edit controls and a board layout on the dedicated Roadmap page.
- Added modal create/edit/archive/restore actions for roadmap recommendations while keeping compact cards in shared production-record views.
- Replaced the dedicated Client Calendar page with an actual month/week/day calendar powered by the existing calendar records.
- Added date-click scheduling, event-click editing, side-list CRUD controls, archive/restore behavior, and compact modal-based calendar controls.
- Added focused frontend helper coverage for roadmap grouping, calendar event mapping, date sorting, and date-click draft times.

### Files Changed

- `frontend/src/app/operations/clients/calendar/page.tsx`
- `frontend/src/app/operations/clients/roadmap/page.tsx`
- `frontend/src/components/client-portal/production-records/CalendarPanel.tsx`
- `frontend/src/components/client-portal/production-records/RoadmapPanel.tsx`
- `frontend/src/components/client-portal/production-records/types.ts`
- `frontend/src/lib/client-planning-records.ts`
- `frontend/tests/client-planning-records.test.mjs`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the current backend API and soft-delete archive pattern; CRUD delete behavior remains archive/restore.
- Use the full calendar only on the dedicated Calendar page while keeping shared production-record panels compact.
- Use modals for create/edit so the working surfaces stay scannable and client planning records remain editable.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- Browser smoke: open `/operations/clients/roadmap` and `/operations/clients/calendar`, create/edit through modals, archive/restore an item, and confirm the calendar event reflects the saved schedule.

## 2026-05-27 - Client Account Archive Controls

### Completed

- Added a management-only client organization status endpoint for archiving and restoring client accounts.
- Scoped client-user organization visibility to active organizations with active memberships, so archived clients no longer appear in the client portal.
- Added typed-confirmation archive controls and restore action on Client Operations Accounts.
- Split the Client Operations picker into current clients and an archived history section so removed clients are still recoverable without crowding daily workflow.
- Added route-level coverage for unauthorized archive attempts, invalid statuses, client visibility after archive, and restore behavior.

### Files Changed

- `backend/src/clients/clients.access.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `backend/tests/clients.routes.test.ts`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/components/client-portal/AdminClientArchivePanel.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `frontend/src/lib/client-organization-history.ts`
- `frontend/src/lib/client-portal-options.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/tests/client-organization-history.test.mjs`
- `docs/api.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Treat removing a client as `status: archived`, not a hard delete, so historical records, files, billing notes, and conversations remain available.
- Keep restore available to internal client-management roles from the Accounts page.
- Keep archived organizations visible to internal managers/admins/web developers but hidden from client users.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: open `/operations/clients/accounts`, archive a test client by typing its exact name, confirm it shows as archived internally, then restore it.

## 2026-05-27 - Sidebar-First Workspace Navigation

### Completed

- Removed duplicate in-page Client Operations section navigation now that the **Client Side** sidebar exposes all focused Client Operations routes.
- Removed duplicate client portal section navigation from the client command center, ticket center, and shared client workspace frame.
- Deleted the unused `ClientPortalSectionNav` component to avoid maintaining two route-navigation systems.

### Files Changed

- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/components/client-portal/ClientPortalSectionNav.tsx`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the sidebar as the primary workspace navigation source.
- Keep client selectors and page-specific actions inside the workspace because those are context controls, not duplicate navigation.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: client workspace pages and Client Operations pages still load, sidebar route links remain available, and no duplicate section nav appears above content.

## 2026-05-27 - Client Operations Route Split

### Completed

- Split the crowded Client Operations workspace into focused routes for overview, accounts, delivery, requests, approvals, reports, assets, billing, roadmap, and calendar.
- Added shared Client Operations navigation, route metadata, selected-client query links, role-guarded shell, client picker, summary header, and workspace loading hook.
- Reused existing backend APIs and production-record panels instead of changing schema or duplicating server routes.
- Updated the **Client Side** sidebar to expose focused Client Operations pages while keeping Web Developer access limited to client operations.

### Files Changed

- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/app/operations/clients/accounts/page.tsx`
- `frontend/src/app/operations/clients/delivery/page.tsx`
- `frontend/src/app/operations/clients/requests/page.tsx`
- `frontend/src/app/operations/clients/approvals/page.tsx`
- `frontend/src/app/operations/clients/reports/page.tsx`
- `frontend/src/app/operations/clients/assets/page.tsx`
- `frontend/src/app/operations/clients/billing/page.tsx`
- `frontend/src/app/operations/clients/roadmap/page.tsx`
- `frontend/src/app/operations/clients/calendar/page.tsx`
- `frontend/src/components/client-portal/ClientOperationsShell.tsx`
- `frontend/src/hooks/useClientOperationsWorkspace.ts`
- `frontend/src/lib/client-operations-navigation.ts`
- `frontend/tests/client-operations-navigation.test.mjs`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep existing backend endpoints and use route-level frontend separation first.
- Preserve selected client context with `?client=:id` so admins can move between pages without losing the active account.
- Keep `/operations/clients` as the command center instead of another dense editing surface.

### How to Test

- `cd frontend && node --test tests/client-operations-navigation.test.mjs tests/role-access.test.mjs`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: admin and web developer can navigate every **Client Side** route; ordinary client users do not see Client Side.

### Next Steps

- Consider smaller route-specific backend endpoints later if the overview payload becomes too heavy with real production data.

## 2026-05-27 - Client Side Sidebar Separation

### Completed

- Added a dedicated **Client Side** sidebar section that links directly to Client Operations.
- Allowed Web Developer/webdev role variants to use Client Operations without adding them to the broader management/admin role set.
- Kept the base Operations page focused on departments and roles by removing the Client Operations shortcut card.
- Updated Client Operations header copy to frame the area as client workspaces, requests, approvals, reports, and delivery progress.

### Files Changed

- `backend/src/clients/clients.access.ts`
- `backend/tests/clients.access.test.ts`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/role-access.ts`
- `frontend/tests/role-access.test.mjs`
- `docs/api.md`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the existing `/operations/clients` route to avoid breaking current links.
- Use sidebar grouping to separate client work from company Operations before doing a larger Client Operations page split.
- Treat Web Developer as client-operations-capable only, not as a general management role.

### How to Test

- `cd backend && npx ts-node tests/run-tests.ts`
- `cd frontend && node --test tests/role-access.test.mjs`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: Web Developer and Operations Manager see **Client Side > Client Operations**; ordinary employees and client users do not.

### Next Steps

- Split the Client Operations page into clearer tabs or routes for Accounts, Delivery, Requests, Reporting, Assets, Billing, and Calendar.

## 2026-05-27 - Client Invite Onboarding And Route Coverage

### Completed

- Added a management-only client invitation endpoint that creates or updates a client user, assigns the global `client` role, upserts organization membership, and creates a setup token for first-time users.
- Added route-level integration coverage for unauthenticated invites, unauthorized client invites, protected-field handling, reset-password onboarding, login, and client organization scoping.
- Added an external-client invite form to Client Operations with role/status controls and a copyable setup link when email delivery is disabled.
- Added frontend invite helpers and tests for sanitized invite payloads and delivery-state labels.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.routes.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/src/components/client-portal/AdminClientMembersPanel.tsx`
- `frontend/src/lib/client-invitations.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/tests/client-invitations.test.mjs`
- `docs/api.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep invites inside Client Operations instead of adding a separate onboarding route.
- Reuse the existing password reset flow for setup links so first-time client onboarding does not require a new credential system.
- Return a setup link only when email delivery is not configured or fails, so local/manual workflows remain usable without exposing tokens in normal email-sent responses.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: invite a temporary client from `/operations/clients`, copy the setup link if shown, complete `/reset-password`, then confirm the new client can log in and only sees assigned client organizations.

### Next Steps

- Decide whether production email should use the current password-reset template or a dedicated client-invite template before public launch.

## 2026-05-27 - Client Team CRUD And Communication Next Actions

### Completed

- Added safe client membership update support for role/status changes and deactivation without destructive deletion.
- Exposed active client-safe membership details in client overview responses so `/client/account` can show team access.
- Replaced the inline Client Operations member form with a focused admin member panel for adding users, editing roles/status, deactivating, and reactivating access.
- Added shared client ticket next-action helpers so admin ticket panels, client tickets, and client messages show whether the team or client is expected to respond.
- Added regression tests for membership payloads and communication next-action behavior.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `frontend/src/app/client/account/page.tsx`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/client-portal/AdminClientMembersPanel.tsx`
- `frontend/src/components/client-portal/AdminTicketList.tsx`
- `frontend/src/components/client-portal/AdminTicketPanel.tsx`
- `frontend/src/lib/client-communication.ts`
- `frontend/src/lib/client-memberships.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/tests/client-communication.test.mjs`
- `frontend/tests/client-memberships.test.mjs`
- `docs/api.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Treat membership deletion as status deactivation so tenant history and access audit context remain intact.
- Canonicalize legacy membership roles like `owner`, `admin`, and `member` into `client_owner`, `client_admin`, and `client_member`.
- Derive communication next actions from existing ticket status, client-visible comments, and ticket ownership rather than adding another schema field.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: `/operations/clients` member add/edit/deactivate controls, `/client/account` team access list, `/client/tickets` next-action panel, and `/client/messages` next-action labels.

### Next Steps

- Expand route-level coverage around membership update permissions if management role rules change.

## 2026-05-27 - Production Record Panel Refactor And Edit Forms

### Completed

- Split the oversized Client Operations production-record component into focused panels under `frontend/src/components/client-portal/production-records`.
- Added reusable production-record form helpers for date formatting, numeric coercion, trimming, and update payload creation.
- Added richer edit forms for existing work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar records.
- Preserved quick status/visibility controls and archive behavior while adding detail edits.
- Added frontend tests for production-record edit payload behavior.

### Files Changed

- `frontend/src/components/client-portal/AdminClientProductionRecords.tsx`
- `frontend/src/components/client-portal/production-records/ApprovalsPanel.tsx`
- `frontend/src/components/client-portal/production-records/AssetsPanel.tsx`
- `frontend/src/components/client-portal/production-records/BillingPanel.tsx`
- `frontend/src/components/client-portal/production-records/CalendarPanel.tsx`
- `frontend/src/components/client-portal/production-records/ReportsPanel.tsx`
- `frontend/src/components/client-portal/production-records/RoadmapPanel.tsx`
- `frontend/src/components/client-portal/production-records/WorkItemsPanel.tsx`
- `frontend/src/components/client-portal/production-records/shared.tsx`
- `frontend/src/components/client-portal/production-records/types.ts`
- `frontend/src/lib/client-production-record-forms.ts`
- `frontend/tests/client-production-record-forms.test.mjs`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep one production-record panel per domain so the admin workflow can keep expanding without rebuilding a large shared component.
- Keep rich edits inline inside each record card to avoid routing admins away from Client Operations during active client-management work.
- Keep deletion as archive/status changes rather than destructive deletes.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: open `/operations/clients`, expand Edit on records, confirm fields render without layout overlap, and save a harmless temporary record edit.

### Next Steps

- Add client team/user CRUD controls after confirming invite/deactivation permissions.
- Add stronger support-request/message workflow polish so production records and conversations feel connected.

## 2026-05-27 - Client Approval Response And Record Polish

### Completed

- Added a client approval response endpoint so visible approvals can be approved or returned with requested changes.
- Exposed approval response notes in client-visible approval data.
- Added client-side approval buttons with response-note validation and workspace refresh after submission.
- Added inline status and visibility controls for existing admin production records.
- Added multi-origin local CORS handling so `localhost:3001` can connect to Socket.io during development without broadening production origins.
- Browser-smoked the admin production-record panel and client approval response loop against the local app.

### Files Changed

- `backend/src/config/cors.config.ts`
- `backend/src/config/env.config.ts`
- `backend/src/main.ts`
- `backend/src/notifications/socket.service.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.production-records.test.ts`
- `backend/tests/cors.config.test.ts`
- `backend/tests/run-tests.ts`
- `frontend/src/app/client/approvals/page.tsx`
- `frontend/src/components/client-portal/AdminClientProductionRecords.tsx`
- `frontend/src/lib/client-approval-actions.ts`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-portal-options.ts`
- `frontend/tests/client-approval-actions.test.mjs`
- `docs/api.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep client approval responses separate from the admin approval update route.
- Require a response note when a client requests changes, but keep it optional for approval.
- Keep destructive delete out of the UI and continue using archive/status transitions.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: log in, create a temporary approval from Client Operations/API, answer it from `/client/approvals`, and confirm no Socket.io CORS console errors on `localhost:3001`.

### Next Steps

- Add richer edit forms for title/body/date fields on existing production records.
- Add client team/user self-service controls after confirming who may invite or deactivate users.

## 2026-05-27 - Client Portal Frontend Wiring And Admin Records

### Completed

- Extended frontend client portal types and API helpers for work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items.
- Updated the client command-center helper to prefer production records over temporary ticket/update fallbacks.
- Wired client Work, Approvals, Reports, Resources, Account, and Calendar pages to the new backend overview records.
- Added the Client Operations production-records panel for creating and archiving work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items.
- Applied the additive local Prisma migration for the production client records.
- Browser-smoked Client Operations and client portal sections against the local app.

### Files Changed

- `frontend/src/app/client/work/page.tsx`
- `frontend/src/app/client/approvals/page.tsx`
- `frontend/src/app/client/reports/page.tsx`
- `frontend/src/app/client/resources/page.tsx`
- `frontend/src/app/client/account/page.tsx`
- `frontend/src/app/client/calendar/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/client-portal/AdminClientProductionRecords.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-portal-command.ts`
- `frontend/src/lib/client-portal-options.ts`
- `frontend/tests/client-portal-command.test.mjs`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep delete behavior as archive/status transitions for production client records.
- Keep the admin CRUD panel inside Client Operations rather than creating a separate management route.
- Preserve ticket/update fallbacks in command-center data so older client workspaces still render useful content before production records are populated.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma migrate status`
- Browser smoke: `/operations/clients`, `/client/work`, `/client/approvals`, `/client/reports`, `/client/resources`, `/client/account`, and `/client/calendar`.

### Next Steps

- Add richer edit forms for existing production records beyond status/visibility changes.
- Add client team/user management controls after defining permissions.

## 2026-05-27 - Client Portal Production Backend Records

### Completed

- Added additive Prisma models and migration SQL for client work items, approvals, reports, roadmap recommendations, assets, billing status, and calendar items.
- Added validation and serializer coverage for the new production client records.
- Added backend service methods and management API routes for creating, updating, and archiving production client records.
- Extended client overview serialization so the frontend can consume the new production sections without separate list calls.
- Preserved tenant boundaries through organization-scoped relations and existing client-management authorization checks.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605270001_client_portal_production_records/migration.sql`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.production-records.test.ts`
- `backend/tests/run-tests.ts`
- `docs/api.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep Phase 2A backend-first so the frontend can wire against real production records next.
- Use additive tables instead of overloading tickets or project notes for approvals, reports, roadmap, assets, billing, and calendar data.
- Treat archive as a status transition for production records instead of destructive delete.
- Keep client-facing visibility server-filtered through `visibleToClient` and status checks.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npx prisma generate`
- `git diff --check`

### Next Steps

- Wire the new backend records into the client pages from Phase 1.
- Add admin CRUD controls in Client Operations for the new production records.
- Add client-side approval response handling once the approval UX is designed.

## 2026-05-27 - Client Portal Production Frontend Shell

### Completed

- Added shared client portal navigation metadata for the production client-side route structure.
- Added command-center derivation helpers for review requests, open requests, latest updates, latest messages, completed work, and report metrics.
- Added reusable client portal shell and panel components.
- Added client-facing pages for Work, Approvals, Messages, Reports, Resources, Account, and Calendar using the existing overview API.
- Added client command center and ticket center support for the production route structure.
- Expanded the client sidebar and header route metadata to recognize the new client portal sections.
- Browser-smoked the new client portal sections and Client Operations at desktop and mobile widths against the current local server.

### Files Changed

- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/client/work/page.tsx`
- `frontend/src/app/client/approvals/page.tsx`
- `frontend/src/app/client/messages/page.tsx`
- `frontend/src/app/client/reports/page.tsx`
- `frontend/src/app/client/resources/page.tsx`
- `frontend/src/app/client/account/page.tsx`
- `frontend/src/app/client/calendar/page.tsx`
- `frontend/src/components/client-portal/ClientPortalPanel.tsx`
- `frontend/src/components/client-portal/ClientPortalWorkspaceFrame.tsx`
- `frontend/src/hooks/useClientPortalWorkspace.ts`
- `frontend/src/lib/client-portal-command.ts`
- `frontend/src/lib/client-portal-navigation.ts`
- `frontend/tests/client-portal-command.test.mjs`
- `frontend/tests/client-portal-navigation.test.mjs`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/Header.tsx`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the first production portal phase frontend-only and powered by the existing client overview API.
- Use review-stage tickets as the current approval queue until dedicated approval records exist.
- Use ticket comments as the current client-visible message source until dedicated client conversations exist.
- Keep calendar and client-safe team directory as real route surfaces with empty states, while backend models remain a later phase.

### How to Test

- `cd frontend && node --test tests/client-portal-navigation.test.mjs tests/client-portal-command.test.mjs tests/client-ticket-filters.test.mjs`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`

### Next Steps

- Add backend approval, work item, report period, roadmap, and conversation models.
- Wire admin CRUD/archive controls for the new production client portal records.
- Clean up local Socket.io CORS configuration for alternate frontend dev ports when using ports other than `3000`.

## 2026-05-26 - Client Portal Ticket Filtering Polish

### Completed

- Added shared client-ticket filtering logic for search, status, priority, and request type.
- Added reusable ticket filter controls for both admin Client Operations and the client-facing ticket center.
- Added an extracted admin ticket list component so `/operations/clients` is less dense around ticket handling.
- Wired admin and client ticket views to show matching ticket counts, empty states, and clear-filter behavior.
- Added regression coverage for ticket filtering and compact filter summary copy.

### Files Changed

- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/client-portal/AdminTicketList.tsx`
- `frontend/src/components/client-portal/ClientTicketFilterControls.tsx`
- `frontend/src/lib/client-ticket-filters.ts`
- `frontend/tests/client-ticket-filters.test.mjs`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Use shared frontend filtering so admin and client ticket lists behave consistently.
- Keep ticket filtering local for now because the backend list is already capped and scoped by organization/access rules.
- Defer destructive delete controls until product rules are clear for archive, recovery, audit history, and client visibility.
- Keep Vercel preview and Square purchase automation listed as external/future work because they depend on billing/provider setup.

### How to Test

- `cd frontend && node --test tests/client-ticket-filters.test.mjs tests/client-portal-options.test.mjs tests/client-portal-summary.test.mjs`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`

### Next Steps

- Add hosted preview QA after Vercel billing/payment is complete.
- Define Square purchase automation requirements: source event, customer matching, client organization defaults, membership owner, and idempotency key.
- Add non-destructive archive controls for client records after lifecycle and audit expectations are confirmed.

## 2026-05-25 - Client Portal Communication Flow Polish

### Completed

- Routed client-role users to `/client` after login instead of sending them to the internal dashboard.
- Redirected authenticated client users away from `/dashboard` and into the client portal shell.
- Added an admin ticket conversation panel to `/operations/clients` so internal users can review ticket context and reply from the client operations workflow.
- Added explicit reply visibility controls for client-visible replies versus internal notes.
- Added regression coverage for authenticated landing paths, admin ticket visibility options, and mixed string/number comment author IDs.

### Files Changed

- `frontend/src/app/login/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/components/AuthGuard.tsx`
- `frontend/src/components/client-portal/AdminTicketPanel.tsx`
- `frontend/src/lib/client-portal-display.ts`
- `frontend/src/lib/client-portal-options.ts`
- `frontend/src/lib/role-access.ts`
- `frontend/tests/client-portal-display.test.mjs`
- `frontend/tests/client-portal-options.test.mjs`
- `frontend/tests/role-access.test.mjs`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep clients out of employee dashboard views and send them directly to the dedicated portal.
- Keep admin ticket replies inside Client Operations so managers can act without switching to the client-facing ticket route.
- Make reply visibility a deliberate admin choice while preserving the existing server-owned permission and serialization rules.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke: admin `/operations/clients` shows ticket reply visibility controls; client login lands on `/client`; client `/dashboard` redirects to `/client`.

### Next Steps

- Split `frontend/src/app/operations/clients/page.tsx` into smaller client-management sections as the admin workflow grows.
- Add stronger ticket filters or a dedicated management ticket route if the Operations ticket list becomes too dense.

## 2026-05-24 - Client Portal Access And Ticket Polish

### Completed

- Split frontend client portal navigation from internal client operations navigation.
- Restricted client-user sidebars to Client Portal, Tickets, and Profile only.
- Added client operations gating for the Operations sidebar entry, Operations client card, and `/operations/clients` page.
- Added a ticket detail panel on `/client/tickets` with visible conversation history and client comment submission.
- Replaced client ticket title/category/priority typing with request-type buttons, priority buttons, generated ticket titles, and one required details box.
- Added quick reply buttons for client ticket comments.
- Reduced internal client setup typing by auto-generating slugs and replacing client role, status, project status, and project progress fields with constrained controls.
- Added internal ticket status controls for New, Review, In Progress, and Done.
- Added automatic client-visible updates when internal users move ticket status.
- Refined automatic ticket-update language so client-facing status updates read naturally.
- Added internal project progress/status editing controls.
- Added project pills to update publishing so updates can target a specific project or general account work.
- Made client ticket forms more compact with pill-style request and priority choices.
- Added one-click request detail starters so clients can submit common requests with less typing.
- Improved the Operations member assignment form so the user selector does not collapse in two-column admin layouts.
- Browser-smoked admin and client sessions across desktop and mobile viewports, including adding a client ticket reply.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `docs/api.md`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/client-portal/ChoiceGroup.tsx`
- `frontend/src/components/client-portal/TicketDetailPresets.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-portal-options.ts`
- `frontend/src/lib/client-portal-summary.ts`
- `frontend/src/lib/role-access.ts`
- `frontend/tests/client-portal-summary.test.mjs`
- `frontend/tests/client-portal-options.test.mjs`
- `frontend/tests/role-access.test.mjs`
- `docs/dev-notes.md`

### Decisions Made

- Keep internal multi-client administration under Operations and keep client users scoped to `/client` and `/client/tickets`.
- Use backend membership lookup as the sidebar signal for client workspaces when the auth role remains a generic member.
- Do not show employee/company/admin navigation while a non-management user's client workspace membership is still being checked.
- Keep management/admin users out of the client-facing sidebar path; they can manage clients from Operations.
- Generate client ticket titles from request type plus details so clients do not need to invent ticket names.
- Treat `done` tickets as closed for portal summary counts.
- Keep ticket status changes server-owned and publish status movement as visible client updates.

### How to Test

- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend && npm test`
- `cd backend && npm run build`
- `cd backend && npx prisma validate`
- `cd backend && npx prisma generate`
- Browser smoke: admin `/operations` and `/operations/clients`; client `/client`, restricted sidebar, `/operations/clients` access denial, and `/client/tickets` comment workflow at desktop and mobile sizes.
- Browser smoke: client request type/priority buttons, quick replies, admin constrained setup controls, project update pills, project progress edits, and ticket status updates.
- Browser smoke: compact client ticket forms, request detail starters, and visible Operations user selector.

### Next Steps

- Add management-side ticket detail replies when the client operations workflow needs full ticket handling.
- Decide whether management users need an explicit client-preview mode instead of manually opening `/client`.

## 2026-05-24 - Client Portal UI Slice

### Completed

- Expanded the client portal backend API with internal management routes for memberships, projects, updates, metrics, resources, and ticket comments.
- Added a frontend client portal API layer and summary helper with focused test coverage.
- Added `/operations/clients` as the internal multi-client management surface under Operations.
- Added `/client` as the client-facing overview for progress, tickets, updates, metrics, resources, and ticket submission.
- Added `/client/tickets` as the focused client request center.
- Added Client Portal navigation and route titles.
- Browser-smoked `/operations/clients`, `/client`, and `/client/tickets` with temporary local data and role-scoped JWT sessions.

### Files Changed

- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/tests/clients.access.test.ts`
- `docs/api.md`
- `docs/architecture.md`
- `docs/dev-notes.md`
- `docs/features.md`
- `frontend/src/app/client/page.tsx`
- `frontend/src/app/client/tickets/page.tsx`
- `frontend/src/app/operations/clients/page.tsx`
- `frontend/src/app/operations/page.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/lib/client-portal.ts`
- `frontend/src/lib/client-portal-summary.ts`
- `frontend/tests/client-portal-summary.test.mjs`

### Decisions Made

- Keep Client Operations as a separate route under Operations so the existing department/role admin page does not become a large mixed-responsibility file.
- Keep the first client-facing portal practical and data-driven: overview, ticket intake, visible progress, published updates, metrics, and resource links.
- Use existing app components and visual tokens instead of introducing a new UI kit.

### How to Test

- `cd backend && npm test`
- `cd backend && npm run build`
- `cd frontend && npm test`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- Browser smoke with local backend/frontend: `/operations/clients`, `/client`, and `/client/tickets`.

### Next Steps

- Add edit/delete controls for client projects, updates, metrics, resources, memberships, and tickets.
- Add richer ticket detail views with threaded comments and internal/client visibility controls.
- Decide how Square purchase automation will create the initial client organization and membership after payment.

## 2026-05-24 - Client Portal Backend Foundation

### Completed

- Added the additive Prisma data model for Deskii client organizations, memberships, service tiers, projects, tickets, ticket comments, updates, metric snapshots, and resource links.
- Added client portal access helpers that scope client users to active memberships while allowing internal manager/admin access across clients.
- Added client-safe serializers so internal notes, assignment fields, internal comments, and protected tier details are not returned to client users.
- Added `/api/clients` backend routes for listing organizations, creating organizations, reading an organization overview, creating client tickets, and listing visible tickets.
- Added backend regression coverage for client organization visibility, ticket creation access, protected-field parsing, and client-safe serialization.

### Files Changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/202605240001_client_portal_foundation/migration.sql`
- `backend/src/clients/clients.access.ts`
- `backend/src/clients/clients.controller.ts`
- `backend/src/clients/clients.serializers.ts`
- `backend/src/clients/clients.service.ts`
- `backend/src/clients/clients.validation.ts`
- `backend/src/main.ts`
- `backend/tests/clients.access.test.ts`
- `backend/tests/run-tests.ts`
- `docs/api.md`
- `docs/architecture.md`
- `docs/database.md`
- `docs/dev-notes.md`
- `docs/features.md`

### Decisions Made

- Keep the client portal inside the existing Deskii/internal portal backend instead of creating a separate app surface.
- Use `ClientOrganization` as the tenant boundary and require active `ClientMembership` records for client users.
- Keep the first checkpoint backend-only so the UI can be built against explicit API contracts.
- Reuse existing Express/Prisma patterns and helper-level tests instead of adding a new backend test framework.

### How to Test

- `cd backend && npm test`
- `cd backend && npx prisma validate`
- `cd backend && npm run prisma:generate`
- `cd backend && npm run build`
- From repo root: `git diff --check`

### Next Steps

- Build the internal Operations client management screens under the existing Operations area.
- Build the client-facing `/client` portal screens using the new scoped `/api/clients` endpoints.
- Add create/update routes for projects, updates, metrics, resources, memberships, and ticket comments as the UI requires them.

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
