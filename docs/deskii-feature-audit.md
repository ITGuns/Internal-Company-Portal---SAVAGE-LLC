# Deskii Feature Audit & Recommendations

Date: 2026-07-19

Deskii (MyDeskii) is an internal operations portal + client delivery portal for Savage LLC, built with a TypeScript Express + Prisma/PostgreSQL backend, Socket.io real-time layer, and a Next.js 16 frontend.

## Current Feature List

### Authentication & Access Control

- Email/password signup with pending-approval workflow (pending accounts cannot log in until an admin approves and assigns a role)
- Google, Discord, and Apple OAuth sign-in
- JWT access tokens + rotating refresh sessions (httpOnly cookies, revocation, device/IP tracking)
- Password reset and forgot-password email flows; admin onboarding with one-time setup links
- Five-tier role system (full-access admin, management, payroll management, client operations, client portal) enforced on both backend routes and frontend navigation
- Rate limiting on auth endpoints (Redis-backed in production), Helmet security headers, CORS allow-list, bcrypt hashing

### Dashboard & Navigation

- Role-aware dashboard with today's metrics, "Needs Attention" panel, and customizable pinned quick actions
- Global command palette (Ctrl-K) + permission-scoped global search across tasks, logs, announcements, chat, files, people, client records, and payroll
- Dark/light theming, collapsible/mobile sidebar, keyboard accessibility (focus traps, skip links, ARIA), workspace branding customization

### Task Tracking

- Board, list, and calendar views with deep-linkable filters and task detail modals
- Projects with members, per-project analytics (completion, overdue, tracked time, target-date risk)
- Multi-assignee collaborators, role/department-derived assignment, built-in task timers with work-session history
- Estimates (HH:MM), progress, priorities, and "Generate EOD Report" that posts straight into Daily Logs

### Daily Logs

- EOD/weekly/monthly work logs with task import from Task Tracking, HH:MM hours, shift notes
- Manager review with team totals; inline comment threads and likes

### Payroll & Time Tracking

- Clock in/out time clock, manual entries with correction notes, day-review panel
- QA warnings (missing clock-outs, overlaps, long shifts, zero-duration entries)
- Employee payroll profiles (salary, currency, schemes, billable-hour caps), payslip generation with PDF export, personal payslip history
- Payroll periods, department cost reports, CSV/ZIP exports, and scheduled jobs (period advance, auto-payslips, department reports) run via cron or a manual Scheduler tab

### Client Portal (largest module — ~52 API routes, ~25 database models)

- External client shell with 9 screens: command center, work progress, requests/tickets, approvals, messages, reports, resources, account, calendar
- Internal mirror under `/operations/clients`: accounts, delivery, request triage with SLA labels, approvals, monthly reports, assets, billing, roadmap, calendar
- Service tier presets, memberships/invitations, append-only activity audit trail, strict client-visible vs. internal data separation
- Billing scaffolding: manual invoices, auto-generation of due invoices, payment-connection records (Stripe/Square-ready fields but no live provider yet)

### Communication

- Company chat: DMs + group channels, reactions, edit/delete, attachments/GIFs, archiving, unread badges, online presence, typing indicators — all real-time over Socket.io with Redis scaling support
- Announcements: company news, shoutouts, events with RSVP, birthdays, custom categories, likes/comments
- Real-time notifications with browser alerts and per-category mute preferences
- Transactional email (SendGrid or SMTP): welcome, task assigned/status, payslip, daily digest, verification

### Files & Misc

- File directory with department-scoped folders, authenticated uploads (local or S3/R2 storage, magic-byte file validation), breadcrumbs, search
- Admin-only whiteboard (drawing tools, undo, PNG export, local autosave)
- Operations area: departments, role catalogs, org chart with manager/report hierarchy, typed-confirmation deletes
- Health/readiness endpoints, structured JSON logging, k6 load-test profiles, "commercial readiness mode" boot guard

## Half-Built Items

Several "features" exist only as scaffolding:

- **Payment providers** — invoice/payment models have Stripe-style fields, but everything runs in manual mode; no payment SDK is integrated.
- **Notifications** — derived on the fly from tasks/chat/announcements; there is no durable Notification table, and read-state lives in the browser's localStorage (lost on device switch).
- **Google Drive sync and Discord webhooks** — env variables exist but nothing calls them; `/discord` is a placeholder page.
- **Error reporting** — an explicit `TODO: Send error to Sentry` in the frontend ErrorBoundary; nothing is wired.
- **Developer bug console** (`/developer/bugs`) — stores bugs and feature flags in localStorage only, so reports never reach the team.
- **No 2FA/MFA anywhere**, and a dev `/auth/sandbox` fake-login route ships in the production controller (a security risk worth removing or env-gating — see the gap sweep, now fixed).

## Recommendations for Additional Features

See [deskii-feature-roadmap.md](deskii-feature-roadmap.md) for the full roadmap with effort estimates. Summary tiers:

### Tier 1 — Finish what's scaffolded (highest ROI)

1. **Stripe (or Square) integration** for client invoices — the schema and workflows are already provider-ready.
2. **Durable notifications** — a Prisma `Notification` table with server-side read state.
3. **Error monitoring** (Sentry or similar) on both frontend and backend — the hook point already exists.
4. **Two-factor authentication (TOTP)** — biggest security gap for a portal holding payroll/banking/billing data.
5. **Backend-persisted bug reports** — connect the developer bug console to the database or a Discord webhook.

### Tier 2 — Natural product extensions

6. **Leave/PTO management** — requests, approval flow, balances, calendar visibility.
7. **Recurring tasks and task dependencies/subtasks.**
8. **Client-side payments page** — once Stripe lands.
9. **Analytics dashboards** — leverage existing work-session, payroll, and client-metric data.
10. **File versioning + client file uploads** — using the existing S3 driver.
11. **Calendar integrations** (Google/Outlook sync or ICS export).

### Tier 3 — Commercial readiness (if selling Deskii to other companies)

12. **Multi-tenancy/workspaces** — the app is currently single-company.
13. **SSO (SAML/OIDC) and SCIM provisioning.**
14. **Internal audit log** — extend the client-portal activity pattern to internal actions.
15. **Data export/retention tooling** (GDPR-style) and **E2E test coverage.**

## Related Docs

- [deskii-gap-sweep.md](deskii-gap-sweep.md) — security / coverage / contract / docs gap findings (with fix status).
- [deskii-feature-roadmap.md](deskii-feature-roadmap.md) — recommended features with effort estimates.
