# Copilot Instructions — Internal Company Portal (SAVAGE LLC / MyDeskii)

## ⚠️ CRITICAL: Branch Rule
- **ALL work happens on `v2-improvements` branch ONLY.**
- **NEVER commit to or modify `main`.**
- `main` = production (mydeskii.com). It is read-only until a formal merge is approved.
- Before every session, confirm: `git branch` shows `* v2-improvements`.

---

## Project Overview

**Product:** MyDeskii — Internal Company Portal for SAVAGE LLC  
**Repo:** `ITGuns/Internal-Company-Portal---SAVAGE-LLC`  
**Branch strategy:** `v2-improvements` → merge to `main` when stable

### Tech Stack

| Layer | Tech |
|-------|------|
| **Backend** | Express.js 4.18 + TypeScript + Prisma 7.4 + PostgreSQL 15 + Socket.io 4.8 |
| **Frontend** | Next.js 16.1 + React 19 + Tailwind CSS 4.1 + DaisyUI 5.5 + shadcn/ui + React Query 5 |
| **Auth** | JWT + Refresh tokens + Google OAuth + Discord OAuth (Passport.js) |
| **Infra** | Docker Compose (Postgres + Backend + Frontend), Vercel-ready |
| **Dev ports** | Backend: 4000, Frontend: 3000 |

---

## Architecture

### Backend (`backend/src/`)
```
app.module.ts       # Express bootstrap
main.ts             # Entry: middleware, routes, Socket.io
config/             # env.config.ts — EnvConfig singleton + isAdminEmail()
database/           # prisma.service.ts — Prisma singleton
auth/               # JWT + OAuth + Passport
users/              # User CRUD + role + avatar
tasks/              # Kanban tasks + timer
announcements/      # Announcements + likes + comments + RSVP
chat/               # Conversations + messages + real-time
daily-logs/         # Activity logs
departments/        # Department CRUD
roles/              # Role management
employees/          # Approval workflow
email/              # SendGrid templates
file-directory/     # Google Drive folder links
notifications/      # Socket.io service (socket.service.ts)
payroll/            # Time entries + payslips + periods
uploads/            # File + avatar uploads
```

### Frontend (`frontend/src/`)
```
app/                # Next.js App Router (16 routes)
  layout.tsx        # Root: QueryProvider → UserProvider → ExchangeRate → Socket → Toast
  dashboard/        # Stats + chat widget + announcements
  task-tracking/    # Kanban + List + Calendar views
  chat/             # Unified messaging (DMs + channels)
  announcements/    # News + shoutouts + events + birthdays
  daily-logs/       # Activity tracking
  payroll-*/        # Dashboard + calendar + payslips
  file-directory/   # Google Drive browser
  whiteboard/       # Local-only canvas
  profile/          # User settings
  login/, signup/   # Auth pages
  forgot-password/  # Password reset request
  reset-password/   # Password reset with token
components/         # 62+ reusable components
  ui/               # Skeleton, Pagination, Button, Card, Modal, LazyFullCalendar
  tasks/            # BoardCard, TaskModal, TaskCalendarView
  announcements/    # AnnouncementCard, AnnouncementFormModal
  chat/             # ChatSidebar, MessageInput, NewChatModal, CreateChannelModal
context/            # QueryProvider, SocketProvider
contexts/           # UserContext, ExchangeRateContext
hooks/              # useTasks, useDailyLogs, useAnnouncements, etc.
lib/                # api.ts + feature fetch functions + types
  types/api.ts      # Shared typed interfaces for all API responses
  types/pagination.ts # PaginatedResponse<T>
```

### Data Flow
```
React component → React Query hook → lib/feature.ts → lib/api.ts (JWT) → Next.js proxy → Express → Prisma → PostgreSQL
Real-time:        SocketContext → socket.service.ts → Socket.io rooms
```

---

## Key Patterns & Conventions

### State Management
- **Server state:** React Query v5 (`@tanstack/react-query`) — never local state for API data
- **Auth/user:** `UserContext` (`contexts/UserContext.tsx`)
- **Real-time:** `SocketContext` (`context/SocketContext.tsx`) — listens for `data:changed` events, auto-invalidates React Query cache
- **Exchange rates:** `ExchangeRateContext`

### API Layer
- All API calls go through `lib/api.ts` (`apiFetch`) — injects JWT automatically
- Feature-specific functions in `lib/announcements.ts`, `lib/tasks.ts`, `lib/chat.ts`, etc.
- Paginated variants exist: `fetchXxxPaginated()` → returns `PaginatedResponse<T>`

### Real-Time (Socket.io)
- Backend emits `data:changed` with resource name after every mutation
- Frontend `SocketContext` catches `data:changed`, calls `queryClient.invalidateQueries()`
- Chat: uses dedicated rooms (`conversation:{id}`)
- Notifications: user-specific rooms (`user:{id}`)

### Security (already fixed on v2-improvements)
- `isAdminEmail()` helper in `env.config.ts` — replaces all hardcoded bypass arrays
- Admin emails in `ADMIN_EMAILS` env var (comma-separated)
- Ops manager email in `OPS_MANAGER_EMAIL` env var
- Socket.io CORS locked to `config.corsOrigin`
- Input validation on auth endpoints (email regex, password strength)

### TypeScript
- No `any` types — use `unknown` with narrowing or proper interfaces
- Shared API response types in `lib/types/api.ts`
- `catch (err)` + `instanceof Error` guards (NOT `catch (err: any)`)
- Prisma namespace types: `Prisma.XxxWhereInput`, `Prisma.XxxUpdateInput`

### Components
- Always use `cn()` utility for conditional class merging
- Use project design tokens (CSS vars: `--primary`, `--border`, `--muted`, etc.)
- Prefer `next/image` over `<img>` for user-uploaded/remote images
- Prefer early returns over nested conditionals

---

## Historical Audit Notes (March 11, 2026)

Current status as of May 28, 2026: later hardening passes resolved the Socket.io JWT gap, Docker Compose auth/database secret fallbacks, tracked one-off debug scripts, pending-user access issue, Docker build-context env leakage, auth rate limiting, baseline Helmet security headers, and conversation-scoped Socket.IO event authorization. The remaining high-priority security work starts with upload magic-byte validation, CSRF evaluation, controller input validation, and production logging.

### Historical Critical Findings
1. **SEC-01** — Resolved: Socket.io now verifies JWTs before accepting connections.
2. **SEC-02** — Resolved: Docker Compose requires explicit auth/database secrets.
3. **SEC-03** — Resolved: tracked one-off credential/debug scripts were removed.
4. **SEC-04** — Resolved: auth route rate limiting covers login, signup, forgot-password, and reset-password.
5. **SEC-05** — Resolved: pending users are blocked from authenticated UI access.

### High (Unresolved)
- Baseline Helmet security headers are in place; future passes should tune CSP if backend HTML/browser-rendered responses are added.
- File upload validates MIME string only, not magic bytes
- Avatars stored as base64 in DB (performance)
- No CSRF protection
- Docker build contexts must keep `.env*`, uploads, debug outputs, and generated artifacts excluded through `.dockerignore`
- Missing input validation library (Zod/class-validator) on controllers
- Excessive `console.log` in production (should use Winston/Pino)
- Conversation-scoped Socket.IO events require participant authorization; keep this pattern for future socket events.

### Medium (Unresolved)
- Hydration mismatch on every page (theme `data-theme` attribute)
- HTML nesting violation on chat page (`<div>` inside `<p>`)
- `context/` and `contexts/` duplicate folders
- No audit logging for admin operations
- Missing page-level `error.tsx` boundaries (only root has one)
- Missing DELETE cascade on departments

---

## Commit Rules (Conventional Commits)
- Work only on `v2-improvements`
- `feat(scope): description` — new features
- `fix(scope): description` — bug fixes
- `chore(scope): description` — tooling, cleanup
- `refactor(scope): description` — restructuring without behavior change
- `security: description` — security fixes
- Keep commits atomic and focused
- Verify build passes before committing: `npm run build` (both frontend and backend)

---

## Dev Commands

```bash
# Backend
cd backend && npm run dev          # Start backend (port 4000)
cd backend && npm run build        # TypeScript compile check
cd backend && npx prisma migrate dev  # Apply schema migrations
cd backend && npx prisma generate   # Regenerate Prisma client

# Frontend
cd frontend && npm run dev         # Start frontend (port 3000)
cd frontend && npm run build       # Production build check (run before commit)
cd frontend && npm run lint        # ESLint

# Both
docker-compose up                  # Full stack with PostgreSQL
```

---

## Files to NEVER Touch
- `main` branch — anything
- `tmp/` — these are dead debug scripts; if cleaned, delete them
- `.env` files — never commit secrets
- `backend/Dockerfile` `COPY .env*` line — known security issue, fix = remove it

## Important Environment Variables
- `ADMIN_EMAILS` — comma-separated admin emails
- `OPS_MANAGER_EMAIL` — operations manager email  
- `JWT_SECRET` — must be set, no fallback (security)
- `REFRESH_TOKEN_SECRET` — must be set
- `FRONTEND_URL` — used in password reset emails
- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_EMAILS` + `OPS_MANAGER_EMAIL` replace all old hardcoded bypass arrays
