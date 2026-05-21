# Codebase Audit Report - 2026-05-20

Project: Internal Company Portal - SAVAGE LLC

Branch reviewed: `v2-improvements`

Scope: Read-only review of architecture, backend API/auth/database surfaces, frontend integration, CI/deployment configuration, and verification commands. This report is the working backlog for the first hardening pass.

## Executive Summary

The portal has moved beyond the scaffold described in the README. It now contains real authentication, employee approval, payroll, chat, file-directory, uploads, notifications, and Next.js frontend flows. The main risk is not missing features; it is that sensitive internal-tool behavior is live without enough server-side access control, serialization, migration discipline, and CI alignment.

The first priority should be to restore build reliability, then close auth and authorization bypasses before adding more product surface. In particular, account approval can currently be bypassed through self-profile updates, sockets trust client-supplied user IDs, and broad user endpoints can expose sensitive employee/payroll data.

## Current Status Update - 2026-05-21

This audit is now a historical backlog and evidence record. The release pushed on 2026-05-21 resolved the original critical build, approval, signup role, socket-auth, user serialization, task ownership, and dependency-audit blockers.

Current release status:

- Backend build, backend tests, frontend tests, frontend lint, frontend build, backend audit, and frontend audit pass.
- Pending users are blocked from normal login.
- Signup stores requested role/department separately from active authorization.
- User directory responses are sanitized before returning to the frontend.
- Socket.io verifies JWTs and checks conversation-room participation.
- Task read visibility is scoped by assignment or requester ownership for non-privileged users.
- Prisma migration SQL is tracked for the task-session, signup-request, and task-creator changes.
- CI and Docker runtime versions are aligned to Node 22.

Additional local hardening is currently uncommitted in the worktree:

- Auth token issuance and refresh now use a shared approval check and safe auth serializer.
- Google and Discord OAuth-created users default to pending approval.
- Employee pending/deployed lists now use employee-management access and serialized responses.
- Chat conversation creation now validates direct conversations, participant counts, and management-only channels.
- Uploaded files are served through authenticated `/api/uploads/files/:filename` routes.

Remaining cleanup items from the audit:

- Remove any already tracked root `node_modules/` files through a separate index-only cleanup if they are still present.
- Remove the obsolete top-level `version` field from `docker-compose.yml`.
- Continue splitting large feature files progressively when those areas are touched.
- Add durable audit-history storage if payroll corrections need immutable review trails.
- Keep expanding docs as features change.

## Verification Snapshot

Commands run locally:

```powershell
cd backend
npm run build
```

Result: Failed.

Primary error:

```text
src/file-directory/file-directory.controller.ts(42,105): error TS2339: Property 'toLowerCase' does not exist on type 'unknown'.
src/file-directory/file-directory.controller.ts(61,105): error TS2339: Property 'toLowerCase' does not exist on type 'unknown'.
src/file-directory/file-directory.controller.ts(113,105): error TS2339: Property 'toLowerCase' does not exist on type 'unknown'.
```

```powershell
cd frontend
npm run lint
```

Result: Failed with 3 errors and 76 warnings.

Blocking lint errors:

- `frontend/src/components/payroll/ReportsTab.tsx:116` - React compiler immutability error from mutating `cum` during render.
- `frontend/src/components/tasks/LogReportModal.tsx:35` - `let startDate` should be `const`.
- `frontend/test-fetch.ts:5` - forbidden `require()` import in a throwaway test file.

```powershell
cd frontend
npm run build
```

Result: Passed locally on Node `v22.14.0`.

## Critical Findings

### 1. Backend Build Is Broken

Severity: Critical

Files:

- `backend/src/file-directory/file-directory.controller.ts`

The backend TypeScript build fails because the local `AuthRequest` type has an index signature but does not explicitly define `email`. Accessing `user?.email?.toLowerCase()` therefore treats `email` as `unknown`.

Impact:

- Backend CI/deploy cannot be trusted.
- Any real backend change is harder to validate until this is fixed.

Recommended fix:

- Use the shared `AuthRequest`/`JwtPayload` type from auth middleware, or update the local type to include `email?: string`.
- Replace hardcoded email bypass checks with centralized `isAdminEmail()` so access policy is not duplicated.

### 2. Pending Account Approval Can Be Bypassed

Severity: Critical

Files:

- `backend/src/auth/auth.controller.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`

The login endpoint returns valid JWTs for any user with correct credentials, regardless of `status` or `isApproved`. The frontend overlays pending users, but server-side APIs still accept their token. Worse, `PATCH /api/users/:id` allows a user to update their own `status`, and `UsersService.update()` automatically sets `isApproved = true` when status is anything other than `pending`.

Impact:

- A pending user can authenticate and potentially approve themselves by changing their status.
- Client-side route guards do not protect backend APIs.

Recommended fix:

- Block login for unapproved/pending users or return a restricted pending-session response without normal API access.
- Prevent non-privileged users from sending `status`, `appliedDate`, `salary`, `role`, `department`, or `departmentId`.
- Only privileged roles should approve or modify employee lifecycle fields.

### 3. Public Signup Trusts Client-Supplied Role and Department

Severity: Critical

Files:

- `backend/src/auth/auth.controller.ts`
- `frontend/src/app/signup/page.tsx`

Public signup accepts `departmentId` and `role` from the request body and writes them directly to `UserRole`. Even though the user is pending, this seeds protected authorization data from untrusted input.

Impact:

- A malicious signup can request elevated roles or sensitive departments.
- If approval or status checks are weak, this becomes privilege escalation.

Recommended fix:

- Store requested role/department as application metadata only, not as active authorization roles.
- Assign real `UserRole` records only during approval by an authorized user.
- Validate selected roles against department availability.

### 4. Sensitive User and Payroll Data Are Exposed Too Broadly

Severity: Critical

Files:

- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/payroll/payroll.controller.ts`

Any authenticated user can list users or fetch a user by ID. The service includes `employeeProfile`, `tasks`, and roles. Depending on Prisma response shape, this can expose password hashes, salaries, bank accounts, tax IDs, phone/address/citizenship, and internal role information.

Impact:

- Employees can potentially view private payroll/profile data for other employees.
- Raw database objects leak internal fields and make future schema changes risky.

Recommended fix:

- Add explicit serializers for public user, self profile, and admin/HR profile shapes.
- Restrict broad user list/detail endpoints to privileged roles or return a minimal directory shape.
- Restrict payroll profile updates so only privileged users can update compensation, bank, tax, and employment fields.

### 5. Socket Authentication Is Client-Claimed

Severity: Critical

Files:

- `backend/src/notifications/socket.service.ts`
- `frontend/src/context/SocketContext.tsx`

The frontend sends an access token in socket auth, but the backend does not verify it. The backend accepts any `authenticate` event with any `userId` and lets any socket join any `conversation:{id}` room.

Impact:

- A client can impersonate another user for notifications/presence.
- A client can join a conversation room without participant verification.

Recommended fix:

- Verify the JWT during the Socket.io handshake.
- Register the socket under the verified token subject, not a client-supplied user ID.
- On `join:conversation`, check database participation before joining the room.

## Major Findings

### 6. Frontend Signup Posts to the Wrong Backend Route

Severity: High

Files:

- `frontend/src/app/signup/page.tsx`
- `frontend/next.config.ts`
- `backend/src/main.ts`

Frontend signup posts to `/api/auth/signup`, but backend auth is mounted at `/auth` and frontend rewrites `/backend-auth/:path*` to backend `/auth/:path*`.

Impact:

- Signup flow likely fails unless a separate proxy exists outside this repo.

Recommended fix:

- Change signup to call `/backend-auth/signup`, preferably through a centralized auth API helper.

### 7. Refresh Token Lifecycle Is Broken

Severity: High

Files:

- `frontend/src/lib/api.ts`
- `frontend/src/contexts/UserContext.tsx`

`loginWithEmail()` stores only the access token and user object. It does not store `data.tokens.refreshToken`, but refresh logic expects `refreshToken` in localStorage. `logout()` in `api.ts` removes access token and user data but leaves refresh token behind.

Impact:

- Sessions cannot refresh reliably.
- Logout can leave long-lived credentials in browser storage.

Recommended fix:

- Store refresh token after login.
- Clear refresh token on logout.
- Consider moving tokens to httpOnly cookies later.

### 8. Docker and Environment Config Are Inconsistent

Severity: High

Files:

- `backend/src/config/env.config.ts`
- `backend/.env.example`
- `docker-compose.yml`
- `backend/Dockerfile`

Backend requires `REFRESH_TOKEN_SECRET`, but `.env.example` and `docker-compose.yml` do not provide it. Compose falls back to `JWT_SECRET=supersecretkey`. Backend Dockerfile copies `.env*` into the image.

Impact:

- Docker backend startup can fail.
- Default secrets are unsafe.
- Secrets can be baked into images.

Recommended fix:

- Add all required env vars to `.env.example` with placeholders.
- Remove insecure secret fallbacks.
- Do not copy `.env*` into production images.

### 9. CI Node Versions Do Not Match Package Requirements

Severity: High

Files:

- `.github/workflows/ci.yml`
- `.github/workflows/backend-ci.yml`
- `frontend/package.json`
- `backend/package.json`

CI uses Node 18. Next 16 requires Node `>=20.9.0`. Prisma 7.4 requires Node `^20.19 || ^22.12 || >=24.0`.

Impact:

- CI can fail for environment reasons unrelated to code.
- A passing local build on Node 22 does not imply CI can pass.

Recommended fix:

- Move CI and Docker images to a supported Node version, preferably Node 22 LTS/current supported by both packages.

### 10. Database Migrations Are Not Reproducible

Severity: High

Files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/`

The migrations folder contains only `migration_lock.toml`; no SQL migrations are versioned.

Impact:

- A clean database cannot be reliably recreated from git history.
- Production and local schemas can drift.

Recommended fix:

- Decide whether the current schema is the baseline.
- Generate and commit an initial baseline migration for the current schema.
- Stop ignoring migration SQL unless there is a deliberate alternative migration workflow.

## Medium Findings

### 11. Root `node_modules` Is Tracked

Severity: Medium

Files:

- `.gitignore`
- root `node_modules/`

`git ls-files node_modules` reports 655 tracked files. Root `.gitignore` does not ignore `node_modules`.

Impact:

- Repository noise and larger diffs.
- Dependency code can accidentally be modified or reviewed as project code.

Recommended fix:

- Add root `node_modules/` to `.gitignore`.
- Remove tracked dependency files from git index with `git rm --cached -r node_modules`.

### 12. Project Documentation Is Missing

Severity: Medium

Files:

- `docs/`
- `backend/README.md`
- `frontend/README.md`

There is no `docs/` folder even though the project now has multiple real modules. Backend README still describes the backend as a minimal scaffold and says NestJS will replace it later.

Impact:

- The next developer will rediscover architecture and risks repeatedly.
- Docs no longer match implementation.

Recommended fix:

- Add `docs/architecture.md`, `docs/api.md`, `docs/database.md`, and `docs/dev-notes.md` progressively.
- Keep this audit report as the remediation tracker.

### 13. Large Files Need Progressive Refactoring

Severity: Medium

Examples:

- `frontend/src/app/task-tracking/page.tsx` - 786 lines
- `frontend/src/app/chat/page.tsx` - 674 lines
- `frontend/src/app/daily-logs/page.tsx` - 593 lines
- `backend/src/payroll/payroll.service.ts` - 544 lines
- `backend/src/email/email.service.ts` - 417 lines

Impact:

- Harder to test and reason about.
- Higher risk when fixing small issues.

Recommended fix:

- Refactor only when touching a feature.
- Extract serializers, validators, hooks, and service helpers based on real duplication.

## Initial Remediation Plan

### Phase 1 - Restore Verification

1. Fix backend build blocker.
2. Fix frontend lint blockers.
3. Align CI/Docker Node versions.
4. Add missing env documentation.

### Phase 2 - Auth and Access Control Hardening

1. Fix signup route mismatch.
2. Store and clear refresh tokens consistently.
3. Block pending/unapproved normal login or restrict pending sessions.
4. Stop self-update of protected fields.
5. Add explicit user response serializers.

### Phase 3 - Sensitive Domain Boundaries

1. Restrict broad users endpoints or return a minimal directory response.
2. Restrict payroll profile mutation by field sensitivity.
3. Lock down employee approval/rejection routes with explicit role middleware.
4. Replace hardcoded privileged email checks with centralized config.

### Phase 4 - Real-Time and Data Safety

1. Verify socket JWTs on handshake.
2. Authorize room joins against conversation participants.
3. Create baseline Prisma migration.
4. Add bounded list queries and pagination defaults.

## Original Working Priority

The first code changes should be:

1. Fix `file-directory.controller.ts` typing and centralize admin email bypass. Status: completed.
2. Fix signup route and refresh-token storage/cleanup. Status: completed.
3. Prevent self-approval/status mutation through `PATCH /api/users/:id`. Status: completed.
4. Re-run backend build, frontend lint, and frontend build. Status: completed.

## Remediation Progress - 2026-05-20

Completed in the first hardening pass:

- Added this audit report under `docs/`.
- Fixed the backend TypeScript build blocker in `backend/src/file-directory/file-directory.controller.ts`.
- Replaced hardcoded file-directory privileged email checks with centralized `isAdminEmail()`.
- Fixed frontend signup to use `/backend-auth/signup`, matching the existing Next.js rewrite to backend `/auth/signup`.
- Stored refresh tokens on login and cleared them on logout in `frontend/src/lib/api.ts`.
- Blocked non-privileged users from updating protected user fields: `status`, `appliedDate`, `salary`, `role`, `department`, `departmentId`, and `isApproved`.
- Removed automatic `isApproved = true` side effects from generic user profile updates; approval state now has to be passed explicitly by privileged flows.
- Fixed frontend lint blockers in `ReportsTab`, `LogReportModal`, and `test-fetch.ts`.
- Added root `node_modules/` to `.gitignore`. Tracked dependency files still need to be removed from the git index separately.
- Added missing auth/env placeholders in `backend/.env.example`.
- Updated Docker/CI Node version from Node 18 to Node 22.
- Removed `.env*` copying from the backend Docker image.
- Replaced the insecure `JWT_SECRET=supersecretkey` compose fallback with required explicit secrets.
- Fixed compose frontend websocket env name from `NEXT_PUBLIC_SOCKET_URL` to `NEXT_PUBLIC_WS_URL`.
- Added server-side Socket.io JWT verification and authorized conversation-room joins against the `Participant` table.
- Stopped Socket.io typing events from trusting a client-supplied `userId`.

Fresh verification after the first hardening pass:

```powershell
cd backend
npm run build
```

Result: passed.

```powershell
cd frontend
npm run lint
```

Result: passed with 71 warnings and 0 errors.

```powershell
cd frontend
npm run build
```

Result: passed.

```powershell
$env:JWT_SECRET='local-compose-check-jwt'
$env:REFRESH_TOKEN_SECRET='local-compose-check-refresh'
docker compose config
```

Result: passed. Docker Compose reported that the top-level `version` attribute is obsolete; this remains a cleanup item.

Remaining work after the 2026-05-21 release:

- Remove root `node_modules/` from git tracking with a non-destructive index-only cleanup after approval if tracked dependency files remain.
- Remove the obsolete top-level Docker Compose `version` field.
- Continue progressive refactors for large feature files.
- Add durable audit-history storage if payroll corrections need immutable tracking.
