# Commercial Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security and scalability blockers identified in the 2026-06-23 pre-commit review.

**Architecture:** Persist upload ownership and linkage in PostgreSQL, authorize downloads through existing client and department policies, use adapter-aware Socket.io rooms for presence, and make commercial startup/readiness fail closed. Keep local development compatibility and preserve existing authenticated URL shapes.

**Tech Stack:** TypeScript, Express, Prisma/PostgreSQL, Socket.io Redis adapter, S3-compatible storage, k6, Next.js.

---

### Task 1: Tenant-safe uploads

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/202606230001_stored_uploads/migration.sql`
- Modify: `backend/src/uploads/upload.validation.ts`
- Modify: `backend/src/uploads/upload.storage.ts`
- Modify: `backend/src/uploads/uploads.controller.ts`
- Modify: `backend/src/file-directory/file-directory.controller.ts`
- Modify: `backend/src/file-directory/file-directory.service.ts`
- Modify: `backend/src/clients/clients.validation.ts`
- Modify: `backend/src/clients/client-roadmap-assets.service.ts`
- Modify: `backend/src/clients/clients.controller.ts`
- Modify: `frontend/src/app/file-directory/page.tsx`
- Modify: `frontend/src/components/client-portal/production-records/AssetsPanel.tsx`
- Test: `backend/tests/upload.storage.test.ts`
- Test: `backend/tests/uploads.routes.test.ts`
- Test: `backend/tests/file-directory.routes.test.ts`
- Test: `backend/tests/clients.routes.test.ts`

- [ ] Write failing tests proving randomized upload keys and rejection of wrong-owner, wrong-department, and wrong-client access.
- [ ] Run the focused backend tests and confirm failures come from missing metadata authorization.
- [ ] Add the additive `StoredUpload` model, indexed ownership fields, and optional one-to-one links from `ClientAsset` and `FileFolder`.
- [ ] Implement metadata creation, authorization, object cleanup, and client/file-directory linkage.
- [ ] Update both frontend upload callers to submit the returned `uploadId` when registering the final record.
- [ ] Run the focused upload, file-directory, and client route tests until green.

### Task 2: Fail-closed sessions and readiness

**Files:**
- Modify: `backend/src/auth/refresh-session.service.ts`
- Modify: `backend/src/config/production-readiness.config.ts`
- Modify: `backend/src/config/env.config.ts`
- Modify: `backend/src/main.ts`
- Test: `backend/tests/auth.routes.test.ts`
- Test: `backend/tests/production-readiness.config.test.ts`
- Create: `backend/tests/health.routes.test.ts`

- [ ] Write failing tests for commercial-mode schema failure, unsupported email providers, unhealthy HTTP status, and readiness failure.
- [ ] Run those tests and verify the expected failures.
- [ ] Preserve non-commercial compatibility while throwing schema errors in commercial mode.
- [ ] Allowlist email providers and expose dependency-aware `/health` and `/ready` handlers.
- [ ] Run focused auth/config/health tests until green.

### Task 3: Distributed presence

**Files:**
- Modify: `backend/src/notifications/socket.service.ts`
- Modify: `backend/src/notifications/socket.adapter.ts`
- Test: `backend/tests/socket.adapter.test.ts`

- [ ] Write failing tests for unique user IDs from adapter-visible sockets and last-socket disconnect behavior.
- [ ] Run the focused test and verify failure against the node-local implementation.
- [ ] Replace the user map with authenticated user rooms plus adapter-aware socket queries.
- [ ] Run the focused socket tests until green.

### Task 4: Commercial load profile

**Files:**
- Modify: `tests/load/deskii-commercial.js`
- Create: `tests/load/users.example.csv`
- Create: `tests/load/validate-load-script.mjs`
- Modify: `package.json`

- [ ] Write a Node validation script that fails when the commercial profile accepts one shared account or logs in every iteration.
- [ ] Run it and verify failure against the current k6 script.
- [ ] Load unique credentials from a CSV, log in once per VU, and separate auth-capacity from workspace-capacity scenarios.
- [ ] Run syntax and structural validation; run k6 smoke through Docker when a safe local target and credentials are available.

### Task 5: Production defaults and documentation

**Files:**
- Modify: `.env.production.example`
- Modify: `docker-compose.production.yml`
- Modify: `render.yaml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/architecture.md`
- Modify: `docs/api.md`
- Modify: `docs/database.md`
- Modify: `docs/deployment.md`
- Modify: `docs/commercial-readiness.md`
- Modify: `docs/dev-notes.md`
- Modify: `backend/src/auth/oauth.helpers.ts`
- Modify: `backend/src/auth/oauth.state.ts`
- Modify: `backend/tests/oauth.state.test.ts`

- [ ] Enable commercial guardrails in paid deployment templates and keep preview exceptions explicit.
- [ ] Remove superseded Apple OAuth state helpers and the unused provider predicate.
- [ ] Document upload ownership, migration/rollback, readiness, load-test data, monitoring, backup, and staging gates.
- [ ] Parse YAML, validate Compose, and run `git diff --check`.

### Task 6: Release verification

**Files:**
- Review: all changed files

- [ ] Run `npm --prefix backend test` and `npm --prefix backend run build`.
- [ ] Run Prisma validate/generate and apply the migration to a disposable database.
- [ ] Run `npm --prefix frontend test`, lint, and build.
- [ ] Run root/backend/frontend dependency audits and `npm run check:skills`.
- [ ] Run production Compose and YAML validation.
- [ ] Review the final diff for authorization bypasses, accidental scope, dead code, and secrets.
- [ ] Report external launch blockers without claiming staging capacity that was not measured.
