# Deskii Feature Roadmap

Date: 2026-07-19

Recommended features to add, grounded in the current codebase. Items are ordered by return on investment — the top items are cheap because the infrastructure already exists. Effort estimates are rough (S = days, M = 1–2 weeks, L = multi-week/multi-sprint).

## Suggested Sequencing (TL;DR)

1. **2FA + security fixes** — exposure, not features. Do first.
2. **Live payments + durable notifications** — convert existing scaffolding into money and polish.
3. **PTO / leave management** — clearest net-new value for daily users.
4. Everything below is roadmap.

---

## Tier 1 — Finish what's already scaffolded (highest ROI)

These complete half-built features the codebase is already shaped for.

### 1. Live payments (Stripe or Square) — `M`
The client portal already has `ClientInvoice`, `ClientPaymentConnection`, and provider-shaped fields (`externalCustomerId`, `hostedInvoiceUrl`, `webhookStatus`) plus an auto-invoice scheduler job (`scheduler.service.ts runClientInvoices`). Everything runs in "manual mode" today. Wiring one real provider turns client billing from an in-app spreadsheet into actual revenue collection and unlocks recurring billing per service tier.
- **Leverages:** `client-billing.service.ts`, `client-provider-workflows.service.ts`, existing invoice models.
- **New work:** provider SDK, webhook endpoint, payment-status reconciliation.

### 2. Durable notifications — `S`/`M`
Notification read-state and preferences currently live in `localStorage` (`SocketContext.tsx:237-260`, `notification-preferences.ts`) — they don't survive a device switch and there's no backend table. Add a `Notification` Prisma model with server-side read state.
- **Leverages:** existing Socket.io delivery, existing email templates (for digests).
- **New work:** `Notification` model + migration, mark-read/preferences endpoints, backfill the synthesized feed.
- **Bonus:** resolves a docs contradiction (architecture.md lists a notifications model that doesn't exist) and a "pretends to persist" UX gap.

### 3. Two-factor authentication (TOTP) — `M`
For a portal holding payroll, banking, and client billing data, this is the single biggest security-feature gap. Start with admin/payroll roles, then optional for everyone.
- **New work:** TOTP enrollment/verify flow, recovery codes, per-role enforcement policy.
- **Do alongside:** remove or env-gate `/auth/sandbox` and the hardcoded admin emails (see the gap sweep security findings).

### 4. Client-facing payments/invoice view — `S`
Once #1 lands, let clients view and pay invoices from `/client/account` instead of only seeing status.
- **Leverages:** existing `/client` portal shell and serializers.

---

## Tier 2 — Natural product extensions (fit the existing model)

### 5. Leave / PTO management — `M`/`L`
The most conspicuously missing HR feature. Sits beside payroll and daily logs — requests, approval flow, balances, and calendar visibility. Payroll already knows working days, so accrual math has a home.
- **Leverages:** existing approvals pattern, payroll schemes, calendar UI.
- **New work:** leave models, accrual rules, approval workflow, calendar integration.

### 6. Recurring tasks + subtasks / dependencies — `M`
Task tracking is mature but flat. Recurring maintenance work and "blocked-by" relationships are the standard next asks.
- **Leverages:** `Task`, `TaskProject`, timer/work-session model.
- **New work:** recurrence rules + generator job, parent/child + dependency fields, UI for both.

### 7. Manager analytics dashboard — `M`
Rich untapped data exists — `TaskWorkSession` time tracking, payroll costs, client metrics — but there's no cross-cutting reporting. Build a utilization / throughput / overdue-trend / cost-per-client view.
- **Leverages:** existing data; no new collection needed.
- **New work:** aggregation queries/endpoints, dashboard page + charts.

### 8. Client file uploads (two-way asset exchange) — `S`/`M`
Clients currently only consume resources. The S3/R2 upload driver already exists and is well-secured (magic-byte validation, ACL checks). Letting clients upload back closes the loop on collecting logos, content, and approvals.
- **Leverages:** `upload.storage.ts` (s3 driver), `ClientAsset`, `canReadStoredUpload`.
- **New work:** client-scoped upload endpoint + UI, optional file versioning.

### 9. Calendar sync / ICS export — `S`
For payroll events, client calendar items, and task due dates. Even a read-only ICS feed is low effort and high perceived value; two-way Google/Outlook sync is a larger follow-up.

---

## Tier 3 — Commercial readiness (only if selling Deskii to other companies)

The `commercial-readiness.md` doc already tracks infrastructure; these are the *product* prerequisites.

### 10. Multi-tenancy / workspaces — `L`
The app is single-company today — Savage LLC is baked into admin-email defaults and org catalogs. True tenant isolation is the hard prerequisite before selling it. Scope early; it touches every model.

### 11. SSO (SAML/OIDC) + SCIM provisioning — `L`
Enterprise buyers ask for these before 2FA. Large but well-understood.

### 12. Internal audit log — `M`
The client portal already has an append-only `ClientActivity` feed. Extend that pattern to internal actions (role changes, payroll edits, deletions) for a compliance-grade audit trail — cheap relative to its value.

### 13. Data export / retention tooling + E2E tests — `M`/`L`
GDPR-style account export and deletion, plus Playwright/Cypress flow coverage (current tests are strong on pure logic but there is no rendering/E2E coverage). Required for enterprise trust and safe refactoring.

---

## Effort-vs-Value Snapshot

| # | Feature | Effort | Value | Notes |
|---|---------|--------|-------|-------|
| 1 | Live payments | M | High | Unlocks revenue collection |
| 2 | Durable notifications | S/M | Medium | Fixes existing UX gap |
| 3 | 2FA (TOTP) | M | High | Biggest security-feature gap |
| 4 | Client payments view | S | Medium | Depends on #1 |
| 5 | PTO / leave | M/L | High | Missing HR core |
| 6 | Recurring tasks / deps | M | Medium | Standard next ask |
| 7 | Manager analytics | M | Medium | Leverages existing data |
| 8 | Client file uploads | S/M | Medium | Driver already exists |
| 9 | Calendar sync / ICS | S | Medium | Low effort |
| 10 | Multi-tenancy | L | High* | *Only if selling externally |
| 11 | SSO + SCIM | L | High* | *Enterprise gate |
| 12 | Internal audit log | M | Medium | Compliance |
| 13 | Export + E2E tests | M/L | Medium | Enterprise trust |

*See [deskii-feature-audit.md](deskii-feature-audit.md) for the full current feature inventory and [deskii-gap-sweep.md](deskii-gap-sweep.md) for the security/coverage/contract/docs gap findings referenced above.*
