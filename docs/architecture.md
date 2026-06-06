# Architecture

## System Overview

The portal is a full-stack internal company application with a TypeScript Express backend, Prisma/PostgreSQL data layer, Socket.io real-time notifications, and a Next.js frontend.

- `backend/` owns API routes, authentication, authorization, Prisma access, payroll logic, email, uploads, file directory, chat, and notifications.
- `frontend/` owns authenticated portal pages, workflow UI, shared React helpers, route-level deep links, and focused utility tests.
- `docs/` is the project memory for architecture, API behavior, database notes, feature behavior, project decisions, and session notes.
- `docker-compose.yml` provides local service wiring for the app stack, service health checks, and explicit database/auth secrets.

The backend and frontend are developed and verified separately. The root `package.json` is a no-dependency command helper for cross-package checks; app dependencies stay in `backend/` and `frontend/`.

## Backend Structure

Backend entry point: `backend/src/main.ts`.

Mounted routes:

- `/health`
- `/auth`
- `/api/users`
- `/api/tasks`
- `/api/departments`
- `/api/roles`
- `/api/email`
- `/api/announcements`
- `/api/daily-logs`
- `/api/payroll`
- `/api/chat`
- `/api/uploads`
- `/api/employees`
- `/api/file-directory`
- `/api/notifications`

Backend responsibilities are split by feature folder:

- Controllers define HTTP routes, authentication gates, and request/response handling.
- Services hold business logic and Prisma operations.
- Permission helpers centralize role and admin-email checks where the feature has sensitive access rules.
- Serializers/security helpers should be used before returning user, employee, or profile data to the frontend.

Important backend conventions:

- Normal API routes require `authenticateToken` unless the route is intentionally public, such as signup or employee verification request creation.
- Privileged flows are checked server-side. Frontend controls are only convenience, not access control.
- Pending or unapproved users cannot receive normal login or refresh tokens.
- OAuth-created users are created as pending accounts and still require approval before normal access.
- User and employee responses must stay sanitized and must not return password, reset-token, bank, or tax fields.
- Socket.io connections verify JWTs and authorize conversation room joins server-side.
- Uploaded files are served through authenticated `/api/uploads/files/:filename` routes, not unauthenticated static `/uploads` serving.

## Frontend Structure

Frontend app entry point: `frontend/src/app`.

Important page areas:

- `dashboard`
- `task-tracking`
- `daily-logs`
- `payroll-calendar`
- `operations`
- `profile`
- `chat`
- `signup`

Frontend shared code lives mainly in:

- `frontend/src/components` for reusable UI.
- `frontend/src/hooks` for reusable view behavior.
- `frontend/src/lib` for API helpers, workflow helpers, constants, type helpers, and pure utility logic.
- `frontend/src/contexts` for authenticated user and app-wide state.
- `frontend/tests` for focused Node-based utility and behavior tests.

Important frontend conventions:

- Pages should stay readable; repeated UI should move into components.
- Reusable workflow rules should live in `src/lib` and be covered by focused tests.
- URL query params drive deep-linked workflow states, such as dashboard quick actions, task filters, task details, daily-log creation, payroll tabs, and payroll audit filters.
- Management-only UI should share role helper logic, but backend permissions remain authoritative.

## Data Model

Core domain groups:

- Identity: `User`, `UserRole`, `Department`, `AvailableRole`, and `EmployeeProfile`.
- Task tracking: `Task` and `TaskWorkSession`.
- Daily logs: `DailyLog` with structured JSON task entries.
- Payroll: `TimeEntry`, `PayrollEvent`, `PayrollPeriod`, `Payslip`, and `PayrollItem`.
- Collaboration: chat conversations, participants, messages, announcements, comments, reactions, notifications, uploads, and file-directory folders.

See `docs/database.md` for current schema notes and migration behavior.

## Access Control Model

The portal uses short-lived JWT access tokens, an httpOnly SameSite refresh-token cookie, and feature-level role checks.

- Canonical role normalization lives in `backend/src/org/org-access-policy.ts`; frontend navigation mirrors the same groups in `frontend/src/lib/role-access.ts`.
- Full access is reserved for owner/founder and admin-style roles.
- Management access includes full-access roles plus manager, project-manager, operations-manager, and chief-operations-officer roles.
- Payroll management includes full-access roles, operations-manager, bookkeeping, and contractor/salary-payment roles.
- Client operations includes full-access, management, and website-delivery roles such as frontend-developer and backend-technical-developer.
- Configured admin bypass emails receive selected privileged access through centralized helpers.
- Employee self-service routes should only expose or mutate the authenticated user's own data unless a feature-specific permission check allows broader access.
- Chat channels and privileged conversation names such as `General` are restricted to management access.
- Browser refresh tokens should stay out of JavaScript-readable storage. New login/OAuth responses set the `portal_refresh_token` httpOnly cookie and return only an access token; `/auth/refresh` keeps a temporary body-token fallback for legacy sessions.

When adding sensitive behavior, update the relevant permission helper or create a small feature-local helper instead of scattering role string checks across UI and API files.

## Verification Commands

Backend:

```powershell
cd backend
npm test
npm run build
npm audit --audit-level=high
npx prisma validate
npx prisma generate
```

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit --audit-level=high
```

Repository-level checks:

```powershell
npm run check:skills
npm run check
$env:POSTGRES_PASSWORD = "local-compose-check-password"
$env:JWT_SECRET = "local-compose-check-jwt-secret"
$env:REFRESH_TOKEN_SECRET = "local-compose-check-refresh-secret"
docker compose config
git diff --check
npm audit --audit-level=high
```

`docker compose config` requires explicit local values for `POSTGRES_PASSWORD`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET`. Use temporary local placeholders for config validation only; production must use real deployment secrets.

GitHub Actions backend jobs provision their disposable test PostgreSQL schema with `npx prisma db push` after Prisma validation and generation. The current migration directory is not an empty-database baseline, so migration deployment should be handled as a separate production release concern until a baseline migration cleanup is planned.

See `docs/deployment.md` for CI/CD workflow ownership, production deployment secrets, release gates, post-deploy smoke checks, and rollback notes.

Security-related runtime notes:

- Production auth rate limiting defaults to Redis-backed storage via `REDIS_URL`; local development and tests default to in-memory storage unless `AUTH_RATE_LIMIT_STORE=redis` is set.
- Docker Compose includes Redis for distributed auth limits. Keep `TRUST_PROXY_HOPS=0` unless the backend is behind a trusted reverse proxy, then set the exact number of trusted hops.
