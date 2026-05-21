# Architecture

## System Overview

The portal is a full-stack internal company application with a TypeScript Express backend, Prisma/PostgreSQL data layer, Socket.io real-time notifications, and a Next.js frontend.

- `backend/` owns API routes, authentication, authorization, Prisma access, payroll logic, email, uploads, file directory, chat, and notifications.
- `frontend/` owns authenticated portal pages, workflow UI, shared React helpers, route-level deep links, and focused utility tests.
- `docs/` is the project memory for architecture, API behavior, database notes, feature behavior, audits, and session notes.
- `docker-compose.yml` provides local service wiring for the app stack and requires explicit auth secrets.

The backend and frontend are developed and verified separately. The root `package.json` currently only contains a few shared dependencies and should not be treated as the main app command surface.

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

The portal uses JWT authentication plus feature-level role checks.

- `admin`, `administrator`, `manager`, and `operations_manager` are privileged in several management flows.
- Some features also recognize display-style roles such as `Operations Manager` or `Chief Operations Officer`.
- Configured admin bypass emails receive selected privileged access through centralized helpers.
- Employee self-service routes should only expose or mutate the authenticated user's own data unless a feature-specific permission check allows broader access.
- Chat channels and privileged conversation names such as `General` are restricted to management access.

When adding sensitive behavior, update the relevant permission helper or create a small feature-local helper instead of scattering role string checks across UI and API files.

## Verification Commands

Backend:

```powershell
cd backend
npm test
npm run build
npm audit
npx prisma validate
npx prisma generate
```

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit
```

Repository-level checks:

```powershell
docker compose config
git diff --check
```

`docker compose config` currently reports that the top-level Compose `version` field is obsolete. That warning does not block config validation, but it should be cleaned in a future deployment polish pass.
