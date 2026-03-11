# SAVAGE LLC Internal Company Portal — Full Codebase Audit Report

> **Date:** March 11, 2026  
> **Branch:** `v2-improvements` (no changes made to `main`)  
> **Auditor:** Automated deep analysis + Playwright live testing  
> **Scope:** Backend (Express + Prisma), Frontend (Next.js 16 + React 19), Infrastructure (Docker)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Critical Security Issues](#3-critical-security-issues)
4. [High Severity Issues](#4-high-severity-issues)
5. [Medium Severity Issues](#5-medium-severity-issues)
6. [Low Severity / Code Quality Issues](#6-low-severity--code-quality-issues)
7. [Playwright Live Testing Results](#7-playwright-live-testing-results)
8. [Performance Optimization Opportunities](#8-performance-optimization-opportunities)
9. [Frontend-Specific Improvements](#9-frontend-specific-improvements)
10. [Backend-Specific Improvements](#10-backend-specific-improvements)
11. [Database & Schema Improvements](#11-database--schema-improvements)
12. [Infrastructure & DevOps](#12-infrastructure--devops)
13. [Dead Code & Cleanup Candidates](#13-dead-code--cleanup-candidates)
14. [Missing Features & Incomplete Implementations](#14-missing-features--incomplete-implementations)
15. [Recommended Action Plan](#15-recommended-action-plan)

---

## 1. Executive Summary

### Production Readiness: 🟡 MODERATE — Requires fixes before public deployment

| Category | Status | Details |
|----------|--------|---------|
| **Security** | 🔴 Needs Work | Socket auth bypass, hardcoded secrets, no rate limiting, no security headers |
| **Functionality** | 🟡 Mostly Working | All core pages load; chat, tasks, announcements functional; some features incomplete |
| **Performance** | 🟡 Acceptable | N+1 queries, base64 avatars in DB, no caching layer; works fine at low scale |
| **Code Quality** | 🟡 Mixed | Good structure, typed; but 30+ dead debug files, excessive console.log, no tests |
| **Accessibility** | 🟠 Needs Work | Hydration mismatches, HTML nesting errors, missing ARIA attributes |
| **Testing** | 🔴 Missing | Zero automated tests (no unit, integration, or e2e tests) |

### Tech Stack
- **Backend:** Express.js 4.18 + TypeScript + Prisma 7.4 + PostgreSQL + Socket.io 4.8
- **Frontend:** Next.js 16.1 + React 19 + Tailwind CSS 4.1 + DaisyUI 5.5 + shadcn/ui + React Query 5
- **Infra:** Docker Compose (Postgres + Backend + Frontend), Vercel-ready export

### By the Numbers
- **99 API endpoints** across 12 modules
- **16 database models** with full relationships
- **16 frontend routes** + 62 components + 5 custom hooks + 4 context providers
- **30+ orphaned debug/fix/check scripts** in backend root
- **0 test files** across the entire codebase

---

## 2. Architecture Overview

### Backend Structure
```
backend/
├── src/
│   ├── main.ts              # Express bootstrap, middleware, route registration
│   ├── config/env.config.ts  # Environment variable loading
│   ├── database/prisma.service.ts  # Prisma client singleton
│   ├── auth/                 # JWT + OAuth (Google, Discord) + Passport
│   ├── users/                # CRUD, role management, avatar
│   ├── tasks/                # CRUD, status, timer, assignments
│   ├── announcements/        # CRUD, likes, comments, RSVP
│   ├── chat/                 # Conversations, messages, real-time
│   ├── daily-logs/           # Activity logs, filtering
│   ├── departments/          # Department CRUD
│   ├── roles/                # Role management
│   ├── employees/            # Verification/approval workflow
│   ├── email/                # SendGrid + Nodemailer templates
│   ├── file-directory/       # Google Drive folder links
│   ├── notifications/        # Socket.io real-time notifications
│   ├── payroll/              # Time entries, payslips, periods
│   └── uploads/              # File + avatar uploads
├── prisma/
│   ├── schema.prisma         # 16 models
│   ├── seed.ts               # Default users, departments, roles
│   └── migrations/           # 16 migration files
└── [30+ debug/fix/check scripts]  # ← Should be cleaned up
```

### Frontend Structure
```
frontend/src/
├── app/                      # Next.js App Router (16 routes)
│   ├── layout.tsx            # Root: QueryProvider → UserProvider → ExchangeRate → Socket → Toast
│   ├── dashboard/            # Home with stats, chat widget, announcements
│   ├── task-tracking/        # Kanban + List + Calendar views
│   ├── chat/                 # Unified messaging
│   ├── announcements/        # News, shoutouts, events, birthdays
│   ├── daily-logs/           # Activity tracking
│   ├── payroll-*/            # Payroll dashboard, calendar, payslips
│   ├── file-directory/       # Google Drive folder browser
│   ├── whiteboard/           # Drawing canvas (local only)
│   ├── profile/              # User settings
│   ├── login/, signup/       # Auth pages
│   └── ...
├── components/               # 62 reusable components
├── context/                  # QueryProvider, SocketProvider
├── contexts/                 # UserContext, ExchangeRateContext  ← duplicate naming
├── hooks/                    # useTasks, useDailyLogs, useAnnouncements, etc.
└── lib/                      # API wrapper + feature-specific fetch functions
```

### Data Flow
```
Frontend Component
  → React Query hook (useTasks, etc.)
  → lib/tasks.ts (fetch function)
  → lib/api.ts (apiFetch with JWT injection)
  → Next.js rewrite proxy
  → Express backend API
  → Prisma → PostgreSQL
```

---

## 3. Critical Security Issues

### SEC-01: Socket.io Authentication Bypass 🔴
**Location:** `backend/src/notifications/socket.service.ts`  
**Risk:** Any client can impersonate any user  

The socket authentication accepts a raw `userId` string without JWT verification:
```typescript
socket.on('authenticate', (userId: string) => {
    this.registerUserSocket(userId, socket.id);
});
```
An attacker can send `socket.emit('authenticate', 'victim-user-id')` to receive all real-time notifications and chat messages for that user.

**Fix:** Verify JWT token in socket handshake middleware. Reject connections without valid tokens. Cross-reference the claimed `userId` against the JWT payload.

---

### SEC-02: Hardcoded Default Secrets in Docker Compose 🔴
**Location:** `docker-compose.yml` lines 11, 30, 33  

```yaml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}
JWT_SECRET: ${JWT_SECRET:-supersecretkey}
```

If environment variables aren't explicitly set, the system uses predictable defaults visible in version control.

**Fix:** Remove all fallback defaults for secrets. Make them required — fail fast if missing.

---

### SEC-03: Plaintext Database Credentials in Source 🔴
**Location:** `tmp/list_users.js` line 7  

```javascript
const pool = new Pool({ connectionString: 'postgresql://postgres:admin123@localhost:5432/portal_db' });
```

Hardcoded credentials checked into version control.

**Fix:** Delete all files in `tmp/` directory (they're one-off debug scripts with hardcoded credentials).

---

### SEC-04: No Rate Limiting on Auth Endpoints 🔴
**Location:** All of `backend/src/auth/auth.controller.ts`  

No rate limiting on:
- `POST /auth/login` — brute force password attacks
- `POST /auth/signup` — spam account creation
- `POST /auth/forgot-password` — email abuse
- `POST /auth/refresh` — token brute forcing

**Fix:** Add `express-rate-limit` middleware:
- Login: 5 attempts per 15 minutes per IP
- Signup: 3 per hour per IP
- Forgot password: 3 per hour per email
- Refresh: 30 per minute

---

### SEC-05: Approval Overlay is DOM-Bypassable 🔴
**Location:** `frontend/src/components/AuthGuard.tsx`  

Pending users see a blurred overlay with `pointer-events-none`, but the actual page content is rendered in the DOM. A user can open DevTools, remove the CSS classes, and interact with the full application before approval.

**Fix:** Don't render `{children}` at all when user is not approved. Return only the approval modal.

---

## 4. High Severity Issues

### HIGH-01: No Security Headers
**Location:** `backend/src/main.ts`  

Missing standard security headers:
- `Content-Security-Policy` (CSP)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`

**Fix:** Add `helmet` middleware or manual header middleware.

---

### HIGH-02: File Upload Validates MIME String Only, Not Content
**Location:** `backend/src/uploads/uploads.controller.ts`  

Only checks the MIME type string from the client — easily spoofed. An attacker can upload a renamed executable.

**Fix:** Validate file magic bytes using a library like `file-type`. Check actual binary content, not just the claimed MIME type.

---

### HIGH-03: Avatars Stored as Base64 in Database
**Location:** `backend/src/uploads/uploads.controller.ts`  

Entire base64 avatar strings are stored in the User record and sent with every user fetch. At scale (500+ users with 2MB+ avatars), this bloats the database by gigabytes and slows every query that includes user data.

**Fix:** Save avatar files to disk/CDN, store only the URL path in the database.

---

### HIGH-04: Missing CSRF Protection
No CSRF tokens on state-changing endpoints. The cookie-based session + CORS configuration is not sufficient protection against cross-site request forgery.

**Fix:** Implement CSRF middleware for non-GET methods, or adopt the `SameSite=Strict` cookie pattern.

---

### HIGH-05: Docker Copies .env Files into Production Image
**Location:** `backend/Dockerfile` line 14  

```dockerfile
COPY --from=builder /app/.env* ./
```

Secrets baked into the Docker image are visible via `docker inspect` or if the image is pushed to a registry.

**Fix:** Remove `COPY .env*` line. Inject secrets at runtime via `docker run -e` or Docker Compose environment.

---

### HIGH-06: Missing Input Validation on Backend
Multiple controllers accept request bodies without validation:
- Task creation: no title length limits, no sanitization
- Announcements: minimal checks (text exists, no length/content validation)
- Chat messages: no validation on content
- Daily logs: no input sanitization

**Fix:** Add a validation library (Zod, Joi, or class-validator) at every controller entry point.

---

### HIGH-07: Excessive Console.log in Production Code
**Locations:** `main.ts` (logs every HTTP request), `socket.service.ts` (multiple debug logs), `auth.middleware.ts`, `passport.config.ts`

Logs reveal application architecture, user emails, and user IDs. Wastes CPU and disk I/O.

**Fix:** Use a structured logger (Winston/Pino) with environment-based log levels.

---

### HIGH-08: No Socket Event Authorization
**Location:** `backend/src/notifications/socket.service.ts`  

```typescript
socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
});
```

Any authenticated socket can join any conversation room without verifying membership.

**Fix:** Check conversation membership before allowing `join:conversation`.

---

## 5. Medium Severity Issues

### MED-01: Hydration Mismatch on Every Page Load
**Observed via Playwright:** Every page produces:
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```
Root cause: `data-theme="light"` attribute differs between server and client renders, and dynamic class names from styled-jsx don't match.

**Fix:** Ensure theme state is determined consistently (use cookies instead of localStorage for SSR), or suppress hydration for the theme attribute.

---

### MED-02: HTML Nesting Violation on Chat Page
**Observed via Playwright:** Console error on `/chat`:
```
In HTML, <div> cannot be a descendant of <p>
```
Invalid HTML nesting that affects accessibility and rendering.

**Fix:** Audit chat message rendering — replace `<p>` wrappers with `<div>` where block elements are nested.

---

### MED-03: Context Folder Duplication
Two separate context directories:
- `frontend/src/context/` — QueryProvider, SocketProvider
- `frontend/src/contexts/` — UserContext, ExchangeRateContext

Confusing and inconsistent.

**Fix:** Consolidate into one directory (e.g., `contexts/`).

---

### MED-04: Environment Validation Only Checks Existence
**Location:** `backend/src/config/env.config.ts`  

Checks that `DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET` exist — but doesn't validate:
- JWT secret length (should be 32+ chars)
- DATABASE_URL format
- Token expiry values
- CORS origin in production

**Fix:** Add comprehensive validation with meaningful error messages.

---

### MED-05: Role Naming Inconsistency
Some places use `'operations_manager'` (snake_case), others use `'Operations Manager'` (title case). The employee controller uses `.toLowerCase()` comparisons in some places but not others.

**Fix:** Normalize all role names to lowercase in the database and use a shared enum/constant.

---

### MED-06: Missing Transaction Safety
Multi-step operations lack database transactions:
- Employee approval (updates user + adds to channel — no rollback if channel add fails)
- User creation with role assignment
- Payslip generation with items

**Fix:** Wrap multi-step operations in `prisma.$transaction()`.

---

### MED-07: No Audit Logging
Critical operations (user approval, payroll generation, role changes, account deletion) are not logged anywhere.

**Fix:** Add an audit log table and log all admin/sensitive operations.

---

### MED-08: Missing Route-Level Error Boundaries
Only the root layout has an error boundary. If a page-level component crashes, it takes down the entire app instead of showing a localized error.

**Fix:** Add `error.tsx` to each route folder (`task-tracking/`, `chat/`, `payroll-calendar/`, etc.).

---

### MED-09: Password Reset Flow Incomplete
**Location:** `backend/src/auth/auth.controller.ts`  

The `/forgot-password` endpoint appears to be cut off / partially implemented. No corresponding `/reset-password` endpoint with token validation.

**Fix:** Complete the full password reset flow (token generation → email → validation → password update).

---

### MED-10: Missing DELETE Cascade Handling
Department deletion fails with Prisma P2003 error if tasks, roles, or users reference it. No cleanup or cascade logic.

**Fix:** Add `onDelete: Cascade` in schema where appropriate, or handle cleanup in the service layer.

---

## 6. Low Severity / Code Quality Issues

### LOW-01: 30+ Orphaned Debug Scripts in Backend Root
```
backend/check_db.js, check_db_v2.js, check_pwd.js, check_pwd.ts, check_users.ts,
check-dept.ts, check-logs.ts, check-user.ts, check.ts, cleanup_channels.ts,
cleanup.mjs, cleanup.ts, debug_output.txt, debug_users.ts, final_fix_v2.ts,
fix_final.ts, fix_overlord_role.ts, fix_tasks_time.ts, fix_users_js.js,
fix_users.ts, init_chat.ts, list_clean.ts, list_users.ts, rename_admin_to_overlord.js,
revert_to_admin.js, seed_tasks.ts, seed-manual.js, test_delete.js, test-db.js, etc.
```
Plus `tmp/` directory with more debug scripts containing hardcoded credentials.

**Fix:** Delete all orphaned scripts. Move any still-needed utilities to `backend/scripts/`.

---

### LOW-02: @ts-ignore Comments
**Location:** `backend/src/chat/chat.controller.ts`  

TypeScript safety bypassed in multiple places.

**Fix:** Fix the underlying type issues and remove all `@ts-ignore`.

---

### LOW-03: Dynamic Imports in Middleware
**Location:** `backend/src/auth/auth.middleware.ts`  

```typescript
const { prisma } = await import('../database/prisma.service');
```

Dynamic imports in middleware can cause circular dependency issues and are slower.

**Fix:** Use standard top-level imports.

---

### LOW-04: Unused Dependencies
- `reflect-metadata` — NestJS artifact, not needed in Express
- `rxjs` — NestJS artifact, not used in Express app
- `express-session` — imported but session-based auth not actively used (JWT-only)

**Fix:** Remove unused packages.

---

### LOW-05: Timer Re-render Every Second
**Location:** `frontend/src/hooks/useLiveElapsed.ts`  

The task timer hook updates state every 1000ms, causing re-renders of the entire task row.

**Fix:** Use `requestAnimationFrame` with a ref, or isolate the timer display in a `React.memo` component.

---

### LOW-06: Stub/Placeholder Pages
- `/whiteboard` — Local-only canvas with no persistence or collaboration
- `/discord` — Stub page with no real integration
- `/operations` — Minimal implementation

**Fix:** Either complete these features or remove them from navigation.

---

### LOW-07: Missing Pagination Defaults
Some endpoints lack default limits and could return thousands of records on a single request.

**Fix:** Add `limit` = 50 (default), `max` = 100 to all list endpoints.

---

### LOW-08: No API Versioning
All endpoints are at `/api/` with no version prefix.

**Fix:** Add `/api/v1/` prefix to allow future breaking changes.

---

## 7. Playwright Live Testing Results

### Pages Tested (all on `http://localhost:3000`)

| Page | Loads? | Console Errors | Notes |
|------|--------|---------------|-------|
| `/dashboard` | ✅ Yes | Hydration mismatch | Fully functional — stats, chat widget, announcements, quick actions |
| `/task-tracking` | ✅ Yes | Hydration mismatch | Kanban/List/Calendar views work |
| `/chat` | ✅ Yes | Hydration mismatch + HTML nesting error | Channel messaging works, DM list shows |
| `/announcements` | ✅ Yes | Hydration mismatch | Category filters, create button visible |
| `/daily-logs` | ✅ Yes | Hydration mismatch | Filters, search, add log functional |
| `/payroll-calendar` | ✅ Yes | Hydration mismatch | Calendar renders, time entries load |
| `/file-directory` | ✅ Yes | Hydration mismatch | Shows empty state — needs Google Drive setup |
| `/whiteboard` | ✅ Yes | Hydration mismatch | Drawing tools work, local-only |
| `/login` | ✅ Redirects | Hydration mismatch | Correctly redirects to dashboard when logged in |

### Network Health
All API calls returned **200 OK** during Playwright testing:
- `GET /api/tasks` ✅
- `GET /api/announcements` ✅
- `GET /api/notifications` ✅
- `GET /api/chat/unread-count` ✅
- `GET /api/payroll/time-entries` ✅
- `GET /backend-auth/me` ✅
- Socket.io connection established ✅

### Global Issues Found During Testing
1. **Hydration mismatch on every single page** — `data-theme` attribute and styled-jsx class names differ between server/client
2. **HTML nesting violation** on chat page (`<div>` inside `<p>`)
3. **Repeated `time-entries` queries** — the dashboard fires 7+ identical `GET /api/payroll/time-entries` requests
4. **Slow initial page load** — every page shows "Loading..." for 2-3 seconds before content appears (auth verification blocking render)

---

## 8. Performance Optimization Opportunities

### OPT-01: Eliminate Duplicate API Requests
The dashboard page fires the same `GET /api/payroll/time-entries` request 7+ times simultaneously. React Query should deduplicate these automatically — investigate component tree for unnecessary re-mounts or inconsistent query keys.

### OPT-02: Add Server-Side Caching
Frequently accessed, rarely changing data should be cached:
- Department list (changes quarterly)
- Available roles (changes monthly)
- User list (changes weekly)

Recommended: Redis cache with 5-minute TTL, or in-memory cache with invalidation on write.

### OPT-03: Optimize N+1 Queries
- `announcements.service.ts findAll()` — includes author + likes with nested user selects
- `chat.service.ts getUserConversations()` — loops with `Promise.all` for unread counts instead of batch query
- All list endpoints that include relations — consider using Prisma `select` to fetch only needed fields

### OPT-04: Move Avatars to File Storage
Base64 avatars in the database make every user-related query heavier. Switch to file paths + CDN (or even just `/uploads/avatars/`).

### OPT-05: Add Database Indexes
Review query patterns and add indexes for:
- `Task.assigneeId` + `Task.status` (composite)
- `Message.conversationId` + `Message.createdAt` (composite)
- `TimeEntry.userId` + `TimeEntry.start` (composite)
- `DailyLog.date` + `DailyLog.department` (composite)

### OPT-06: Lazy Load Heavy Components
The FullCalendar library and jsPDF are large dependencies. Load them dynamically:
```typescript
const Calendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
```

### OPT-07: Reduce Auth Check Latency
Every page load shows "Loading..." for 2-3 seconds while verifying auth with the backend. Consider:
- Optimistic rendering based on localStorage token presence
- `staleWhileRevalidate` pattern for auth checks

---

## 9. Frontend-Specific Improvements

### FE-01: Consolidate Context Directories
Merge `src/context/` and `src/contexts/` into a single directory.

### FE-02: Add Error Boundaries to Route Segments
Create `error.tsx` files in: `task-tracking/`, `chat/`, `announcements/`, `daily-logs/`, `payroll-calendar/`, `payroll-dashboard/`, `my-payslips/`, `file-directory/`, `whiteboard/`, `profile/`.

### FE-03: Fix Hydration Mismatch
The `data-theme` attribute and styled-jsx class names differ server vs. client. Solutions:
- Use `next-themes` library (handles SSR theme correctly via cookies)
- Or set `suppressHydrationWarning` on the `<html>` element

### FE-04: Add Client-Side Input Validation
Forms submit directly to the backend without client-side validation. Add validation using Zod + React Hook Form for:
- Login/Signup forms
- Task creation/editing
- Announcement creation
- Daily log creation
- Chat message length limits

### FE-05: Improve Accessibility
- Fix HTML nesting violations (`<div>` inside `<p>`)
- Add proper ARIA labels to all interactive elements
- Ensure focus traps work in modals
- Add keyboard navigation for Kanban board
- Test with screen readers

### FE-06: Fix Repeated API Calls
Dashboard fires 7+ identical `time-entries` requests. Check for:
- Components mounting/unmounting rapidly
- Different query key references for the same data
- Missing `staleTime` configuration

### FE-07: Implement Loading Skeletons
Replace the generic "Loading..." text with content-aware skeleton screens for each page.

---

## 10. Backend-Specific Improvements

### BE-01: Add a Proper Logger
Replace all `console.log` / `console.error` with Winston or Pino:
```typescript
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

### BE-02: Standardize Error Handling
Create a centralized error handler middleware:
```typescript
// Error class
class AppError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

// Middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message });
});
```

### BE-03: Add Input Validation Layer
Use Zod schemas at controller entry:
```typescript
const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'completed']).default('todo'),
  priority: z.enum(['Low', 'Med', 'High']).default('Med'),
  // ...
});
```

### BE-04: Add Rate Limiting
Install `express-rate-limit` for auth and API endpoints.

### BE-05: Add Security Headers
Install `helmet` and apply to all routes:
```typescript
import helmet from 'helmet';
app.use(helmet());
```

### BE-06: Add API Documentation
Generate OpenAPI/Swagger specs from route definitions.

### BE-07: Implement Proper Token Refresh
Verify refresh tokens are stored securely, implement token rotation (invalidate old refresh token on each use).

---

## 11. Database & Schema Improvements

### DB-01: Add Missing Indexes
```prisma
model Task {
  @@index([assigneeId, status])
  @@index([departmentId, status])
  @@index([dueDate])
}

model Message {
  @@index([conversationId, createdAt])
}

model TimeEntry {
  @@index([userId, start])
}

model DailyLog {
  @@index([date, department])
}
```

### DB-02: Add Cascade Deletes
```prisma
model Task {
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  assignee     User?       @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
}
```

### DB-03: Normalize Role Names
Store all roles as lowercase, add a validation constraint or enum.

### DB-04: Add Audit Log Table
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // "user.approved", "task.deleted", "payslip.generated"
  target    String   // Target entity ID
  metadata  Json?    // Additional context
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

### DB-05: Consider Soft Deletes
Add `deletedAt DateTime?` to User, Task, Announcement models to prevent accidental permanent data loss.

---

## 12. Infrastructure & DevOps

### INFRA-01: Fix Docker Secrets Handling
- Remove `.env` file copy from Dockerfile
- Remove default values for secrets in docker-compose.yml
- Use Docker secrets or env injection at runtime

### INFRA-02: Add CI/CD Pipeline
Create GitHub Actions workflow for:
- Lint (ESLint)
- Type check (tsc --noEmit)
- Unit tests (when added)
- Security audit (npm audit)
- Docker build verification

### INFRA-03: Add Health Check Improvements
Current `/health` only pings DB. Add:
- Redis connectivity (when added)
- Email service status
- Socket.io status
- Memory/CPU metrics

### INFRA-04: Socket.io Scaling
For multi-instance deployment, Socket.io needs a Redis adapter:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
```

### INFRA-05: File Upload Storage
Move from local filesystem to S3/GCS for production. `/tmp` on Vercel is ephemeral.

### INFRA-06: Add Database Backup Strategy
No backup mechanism visible. Add automated daily backups with point-in-time recovery.

---

## 13. Dead Code & Cleanup Candidates

### Files to Delete (30+ files)
```
backend/check_db.js
backend/check_db_v2.js
backend/check_logs.ts
backend/check_pwd.js
backend/check_pwd.ts
backend/check_users.ts
backend/check-dept.ts
backend/check-logs.ts
backend/check-user.ts
backend/check.ts
backend/cleanup_channels.ts
backend/cleanup.mjs
backend/cleanup.ts
backend/debug_output.txt
backend/debug_users.ts
backend/final_fix_v2.ts
backend/fix_final.ts
backend/fix_overlord_role.ts
backend/fix_tasks_time.ts
backend/fix_users_js.js
backend/fix_users.ts
backend/init_chat.ts
backend/list_clean.ts
backend/list_users.ts
backend/rename_admin_to_overlord.js
backend/revert_to_admin.js
backend/seed_tasks.ts
backend/seed-manual.js
backend/test_delete.js
backend/test-db.js
backend/final_list.txt
backend/seed_log.txt
backend/backend_dev_log.txt
tmp/check_columns.js
tmp/check_db.js
tmp/check_roles.js
tmp/fix_tasks.js
tmp/list_users.js            ← Contains hardcoded DB credentials!
```

### Unused Dependencies to Remove
```json
"reflect-metadata": "^0.1.13",   // NestJS artifact
"rxjs": "^7.8.1",               // NestJS artifact
"express-session": "^1.19.0"    // Not actively used (JWT-only auth)
```

### Markdown Reports to Archive
```
backend/BACKEND_UPDATE_REPORT.md
backend/ERROR STATUS REPORT.md
backend/DATABASE_SETUP.md
backend/QUICK_REFERENCE.md
SESSION_REPORT.md
V2_IMPROVEMENT_PLAN.md
LAUNCH_CHECKLIST.md
```
Consider moving to a `/docs` directory.

---

## 14. Missing Features & Incomplete Implementations

| Feature | Status | Gap |
|---------|--------|-----|
| **Password Reset** | 🟡 Partial | Forgot-password endpoint incomplete, no reset-with-token endpoint |
| **Whiteboard** | 🟡 Stub | Local-only drawing, no persistence or collaboration |
| **Discord Integration** | 🔴 Missing | Page exists but no real integration |
| **Operations Dashboard** | 🟡 Minimal | Basic page, no operations-specific features |
| **File Directory** | 🟡 Partial | Folder structure works, but file viewer incomplete |
| **Email Notifications** | 🟡 Partial | Template system exists but not all templates complete |
| **Payroll PDF Export** | 🟡 Basic | Generates but may need formatting improvements |
| **User Avatar Upload** | 🟡 Works but suboptimal | Should use file paths instead of base64 |
| **Automated Testing** | 🔴 Missing | Zero tests across the entire codebase |

---

## 15. Recommended Action Plan

### Phase 1: Critical Security Fixes (Do Now)
- [ ] Fix Socket.io authentication — validate JWT in handshake
- [ ] Remove hardcoded secrets from docker-compose.yml
- [ ] Delete `tmp/` directory and all orphaned debug scripts
- [ ] Add rate limiting to auth endpoints
- [ ] Fix AuthGuard — don't render children when unapproved
- [ ] Add security headers (helmet)

### Phase 2: Stability & Quality (This Sprint)
- [ ] Fix hydration mismatch (theme handling)
- [ ] Fix HTML nesting violations
- [ ] Add input validation (Zod) to all backend controllers
- [ ] Replace console.log with structured logger
- [ ] Standardize error handling middleware
- [ ] Fix duplicate API requests on dashboard
- [ ] Complete password reset flow
- [ ] Remove unused dependencies

### Phase 3: Testing Foundation (Next Sprint)
- [ ] Set up Jest/Vitest for backend unit tests
- [ ] Add tests for auth service (login, signup, token refresh)
- [ ] Add tests for task CRUD operations
- [ ] Set up Playwright for frontend e2e tests
- [ ] Add e2e tests for login flow, task creation, chat messaging
- [ ] Integrate tests into CI pipeline

### Phase 4: Performance & Polish (Next Sprint)
- [ ] Add database indexes for common queries
- [ ] Implement Redis caching for frequent reads
- [ ] Move avatars from base64 to file storage
- [ ] Lazy load heavy components (FullCalendar, jsPDF)
- [ ] Add loading skeletons
- [ ] Consolidate context directories
- [ ] Add error boundaries to all route segments

### Phase 5: Production Readiness (Before Launch)
- [ ] Complete file upload security (magic byte validation)
- [ ] CSRF protection
- [ ] Audit logging for admin actions
- [ ] Database backup strategy
- [ ] Docker secrets management
- [ ] API documentation (Swagger)
- [ ] Performance testing under load
- [ ] Accessibility audit (WCAG 2.1 AA)

---

*End of Audit Report — Generated on `v2-improvements` branch. No changes were made to the `main` branch.*
