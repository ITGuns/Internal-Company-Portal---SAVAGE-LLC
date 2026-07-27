# Deskii Gap Sweep

Date: 2026-07-19

A four-dimension sweep of the codebase: security/authorization, frontend↔backend contract, test coverage, and docs-vs-code drift. Only verified findings (with file references) are listed.

## Priority Fix List (top of the stack)

1. ~~**[SECURITY-HIGH] Remove hardcoded admin backdoor emails**~~ — **FIXED 2026-07-19** (`env.config.ts` `isAdminEmail` now uses only `ADMIN_EMAILS`; removed the `/me` self-heal auto-provision in `auth.controller.ts`).
2. ~~**[SECURITY-HIGH] Harden the `/auth/sandbox` bypass**~~ — **FIXED 2026-07-19** (now gated on `ENABLE_AUTH_SANDBOX` AND non-production; `auth.controller.ts`).
3. ~~**[SECURITY-HIGH] Scope the daily-logs list query (IDOR)**~~ — **FIXED 2026-07-19** (`daily-logs.controller.ts` now confines non-privileged users to their own department).
4. **[COVERAGE] Add payroll calculation + payslip generation tests** — **PARTIAL 2026-07-19**: calculation math now pinned in `backend/tests/payroll.calculations.test.ts` (rate context for all 4 schemes, billable-cap/overtime split, weekday divisor incl. leap year, end-to-end gross pay). Still needed: DB-backed integration tests for `bulkGeneratePayslips`/payslip email dispatch.
5. **[COVERAGE] Add scheduler money-job tests** — **PARTIAL 2026-07-19**: extracted the semi-monthly period-boundary math into a pure `scheduler.periods.ts` and pinned it in `backend/tests/scheduler.periods.test.ts` (15th/16th split, month-end, leap Feb, year rollover, pay date). Still needed: DB-backed tests for `runAutoPayslip`/`runClientInvoices` job bodies.

> **Action required for #1:** admin access now comes from `ADMIN_EMAILS` and/or real `owner_founder` role assignments. If any admin relied on the old hardcoded emails, set `ADMIN_EMAILS` or provision them via `npm --prefix backend run ceo:setup`, or they will lose bypass access on next deploy.

---

## 1. Security & Authorization

### HIGH

**H1 — Hardcoded default admin backdoor emails.** `backend/src/config/env.config.ts:259-264`
`isAdminEmail()` treats four addresses (`admin@savage.com`, `admin@savage-llc.com`, `owner@savage.com`, `admin@example.test`) as always-privileged, independent of `ADMIN_EMAILS` config. This feeds `requireRole`/`requireDepartment` (`auth.middleware.ts:91,150`) and nearly every controller's `isPrivileged` check. Amplifier: `GET /auth/me` (`auth.controller.ts:481-520`) auto-provisions an `owner_founder` role + department + profile for three of these emails on first call, so merely authenticating self-escalates to owner. Ships with a `.test` address. **Fix:** drop the hardcoded list; rely on `ADMIN_EMAILS`. Remove/role-gate the `/me` self-heal block.

**H2 — `/auth/sandbox` bypass gated only by `NODE_ENV`.** `backend/src/auth/auth.controller.ts:102-139` (mounted at `/auth/sandbox` and `/backend-auth/sandbox`)
Takes an arbitrary `email` and, if the user is absent, creates it `verified/isApproved:true` and issues a full token pair — no password/secret. Guard is a single `NODE_ENV === 'production'` string check, so any staging/preview/test/unset deployment is a complete auth bypass for any email. Combined with H1, an attacker can mint an approved `owner_founder` session. Unauthenticated and unthrottled. **Fix:** require an explicit `ENABLE_AUTH_SANDBOX` flag AND non-production; do not register the route otherwise.

**H3 — Daily-logs list endpoint horizontal IDOR.** `backend/src/daily-logs/daily-logs.controller.ts:69-85` → `daily-logs.service.ts:34-47`
`GET /api/daily-logs` builds `where` only from caller-supplied `department/status/logType`, with no ownership/department scoping. Any authenticated user can read every employee's logs org-wide (content, `hoursLogged`, `shiftNotes`, author email) and target any department via `?department=`. Notably, the create/update/delete paths ARE ownership-checked (`checkOwnership`), making this list the outlier. **Fix:** scope `findAll` to the requester unless they hold override/admin access.

### MEDIUM

- **M1 — Rate limiting only covers 4 auth routes** (`login/signup/forgot/reset`). Not throttled: `POST /auth/refresh`, `/auth/sandbox`, `POST /api/employees` (public, writes a row + emails ops manager each call → spam/email-bomb), and uploads. No global `/api/*` limiter. `backend/src/security/rate-limits.ts`, `main.ts:127-135`.
- **M2 — Unauthenticated employee-application endpoint** `POST /api/employees` (`employees.controller.ts:32-33,136-211`): no rate limit/CAPTCHA, and the `P2002` → "Email already in use" response enables user enumeration.
- **M3 — `authenticateToken` returns 403 (not 401)** for missing/expired tokens (`auth.middleware.ts:35`). Spec/behavior issue that can confuse client refresh logic.

### LOW

- **L1 — Scheduler secret**: when unset, `/cron` is open in non-production; token comparison isn't constant-time (`scheduler.controller.ts:33-48`). Production is correctly gated.
- **L2 — Public org-structure disclosure**: `GET /api/roles` and `/api/departments` leak the full catalog to anonymous users (intentional for signup).
- **L3 — Workspace branding write** uses `fs.writeFileSync` to a repo-relative path (ephemeral on serverless). Authorization is correct.

### Verified SOUND (no action)
JWT config (no weak secret fallback; validateConfig hard-fails), secrets/logging (tokens hashed, never logged), upload security (magic-byte validation, MIME cross-check, path-traversal rejection, authenticated serving with ACL), client-portal serializers (strict client vs management split, payment secrets management-only), tasks/users-PATCH/chat/payroll authorization all enforce ownership + protected-field blocking.

---

## 2. Frontend ↔ Backend Contract

**Good news:** No broken frontend→backend calls. Every `apiFetch` target resolves to a real route (including ~55 client-portal endpoints). Socket events are fully consistent — no orphaned emits/listens (only backend `error` event is unhandled, which is benign).

**Gaps:**

- **Notification read-state is device-local only.** `SocketContext.tsx:237-260` (`markAsRead`/`markAllAsRead`/`clearNotifications`) write only to `localStorage`. `notifications.controller.ts` exposes only `GET /` and always returns items with `read:false`. There is no backend mark-read endpoint, so "mark as read" doesn't persist across devices.
- **Notification preferences are localStorage-only.** `notification-preferences.ts:47,97-105` — no backend route to store/sync them.
- **~9 dead backend endpoints** (no frontend caller): the entire email controller (`POST /api/email/test|send`, `GET /api/email/status`), `GET /api/tasks/search`, `GET /api/tasks/status/:status`, `GET /api/users/:id/roles`, `GET /api/users/:id/tasks`, `POST /api/employees/` root alias, `POST /api/uploads/avatar`, `GET /auth/sandbox`, `GET /auth/failure`. (Task search/filtering is done client-side instead.)

Payload/field checks on tasks, payroll, clients, and chat all aligned — no verified mismatches.

---

## 3. Test Coverage

**Backend:** 41 test files. Refresh-session rotation, uploads authorization, chat permissions, and OAuth/auth flows are well covered (real integration tests). **Untested critical flows:**
- **Payroll calculation math** — `payroll.service.ts` gross/net/deductions (lines 650/719/701). The only payroll test covers permission helpers, not math. **Money risk.**
- **Payslip generation + bulk + email** — `payroll.service.ts:672-857`. Zero behavioral tests.
- **Scheduler money jobs** — `runAutoPayslip`, `runClientInvoices`, `runPeriodAdvance` (`scheduler.service.ts`). Only route wiring is tested, not execution.
- **Client billing service** — `client-billing.service.ts`, plus `client-calendar/content/provider-workflows/roadmap-assets/organizations` services. Zero references.
- **Modules with no coverage:** announcements, roles, departments.

**Frontend:** 62 test files, **all pure-logic** (compile one `.ts` into a `vm`). Zero component/page/hook/context rendering tests across 183 `.tsx` files — including payroll, payslip display, login, and client-portal screens. Untested risk-bearing lib files: ~~`payroll-calendar/payslip-utils.ts`, `time-utils.ts`~~ (**covered 2026-07-19**: `tests/payslip-utils.test.mjs` pins gross/net/deductions/YTD; `tests/time-utils.test.mjs` pins work-days/entry-hours/monthly-hours), `exchange-rate.ts` (fetch/localStorage-bound — needs a stubbed integration test), `task-access.ts`, `validation.ts`.

**Load tests:** k6 `smoke` + `commercial1000` profiles exercise only read-only GET paths (tasks, logs, chat, notifications). No write/mutation load, no payslip/upload/billing endpoints, no socket load.

**Highest-risk untested areas:** (1) payroll calc math, (2) payslip generation + email, (3) scheduler money jobs, (4) client billing, (5) currency/exchange-rate conversion, (6) frontend payroll display math, (7) roles service (drives all authorization).

---

## 4. Docs vs Code Drift

- **`architecture.md:19-34` "Mounted routes" list is stale** — omits 5 live mounts: `/backend-auth`, `/api/clients`, `/api/search`, `/api/workspace`, `/api/scheduler`.
- **`architecture.md:91` lists a "notifications" Prisma model that does not exist** — contradicts `features.md:237` and `api.md:407` (which correctly say there's no durable Notification table) and the schema.
- **Payroll-management role set is narrower in docs than code** — `api.md:290-298` lists 6 roles; `org-access-policy.ts:86-95` grants more (`bookkeeper`, `financial_controller`, `payroll_assistant`, `payroll_finance`, plus `owner/founder/overlord` aliases).
- **Client-operations role set narrower in docs than code** — code includes several developer/designer roles not documented (`org-access-policy.ts:97-110`).
- **`overlord` full-access role is undocumented** (`org-access-policy.ts:75`, `role-access.ts:13`).
- **Entire `/api/workspace` module is undocumented** (branding get/put; `workspace.controller.ts`, mounted `main.ts:184`).
- **Undocumented frontend pages:** `developer/bugs`, `discord`, `auth/sandbox`, `my-payslips` (API documented, page not), plus redirect aliases.

---

## Suggested Sequencing

1. **Security first** — H1, H2, H3 are the only findings that are exploitable as shipped. Small, self-contained fixes.
2. **Money-flow tests** — payroll calc, payslip generation, scheduler jobs, client billing. These protect the highest-value logic and enable safe refactoring later.
3. **Notification persistence** — add a durable `Notification` table + mark-read/preferences endpoints (also resolves a docs contradiction and a "pretends to persist" UX gap).
4. **Docs reconciliation** — fix the architecture route/model lists and role sets; cheap and prevents future confusion.
5. **Dead-code cleanup** — remove or wire up the ~9 unused endpoints (decide email controller's fate deliberately — it may be intended for future use).
