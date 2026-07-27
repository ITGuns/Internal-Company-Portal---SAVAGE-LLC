# Gemfield Bridge — STATUS

**Date:** 2026-07-25
**Model:** Opus 4.8 (orchestration + build). Flags expected: **zero**.
**Current phase:** P1–P4 built; **backend verified LIVE against Supabase** (mock-seeded, run end-to-end via API). Backend E2E + a 17/0 security matrix pass on real data (entitlement 404s, staff-only 403s, internal-note-never-leaks, wizard→pipeline). One runtime bug found + fixed (rate-limiter IPv6, commit 67c9745). Frontend typechecked + renders ("Ready") but not yet human-clicked (#W). All committed + pushed (PR to `main`).

**Remaining:** #W browser click (UX judgment only — backend proven) · P4 leftovers (digest, ops nav link, ticket-detail depth) · Playwright/a11y · **#S** SLA+phone config (operator) · CI-green (`npm audit` gate) + Vercel account for merge · **#Z** dark-launch flag.

**Next actions (user):** (1) click the wizard through in a browser (localhost or, after merge, mydeskii.com); (2) give me SLA targets + support phone (#S); (3) fix the Vercel account block + decide on the audit gate so the PR can merge. Reusable check: `scripts/gemfield-smoke-check.mjs`.

## Three likeliest breakpoints (guide kickoff §7.1)

1. **Entitlement leakage through shared queries.** Because we *extend* `ClientTicket`/`ClientProject` (tables shared by every client org) rather than isolate a Gemfield table, any new query that forgets the org + `gemfieldClient` filter can leak across tenants. The existing membership filter (`getClientOrganizationVisibilityFilter`) scopes by org, but the *entitlement* layer is new. → Mitigation: single `requireGemfieldClient` guard on every bridge route, Prisma filters that always include org, and the blocking entitlement matrix (incl. attachment URLs) before any UI.

2. **Internal-note exposure.** `ClientTicketComment.visibility` is filtered in `serializeClientTicketForClient` (clients.serializers.ts:475) — but each *new* endpoint (wizard submit, dev panel, ticket detail) must route through the client-vs-management serializer or it leaks raw comments/`internalNotes`. → Mitigation: leak test asserted on the client API **response shape**, not the UI; compose default = internal.

3. **Migration risk on the live shared schema.** We alter heavily-used tables (`ClientOrganization`, `ClientTicket`, `ClientProject`) + add `GemfieldMilestone` and `ClientTicketAttachment`. → Mitigation: expand-only, additive columns with defaults (`String[] @default([])`, booleans default false), no backfill that locks; migration `202607250001_gemfield_bridge` tested up/down on a schema copy.

## Log
- P0: 5 parallel readers mapped RBAC/data-model/migrations, auth+org-scoping guards, uploads/notifications/email/rate-limit services, the MyDeskii frontend, and Gemfield GF-ID/phase/intake conventions. Findings folded into BLUEPRINT.md.
- P1: migration `202607250001_gemfield_bridge` (expand-only); `gemfield_developer` role; `gemfield.access.ts` guard + `gemfield.phases.ts`; `canReadStoredUpload` ticket branch + service wiring; blocking `gemfield.entitlement.matrix.test.ts`. Verified: prisma validate, tsc exit 0, matrix + affected pure tests green. Migration apply + HTTP route matrix deferred to CI/staging (no DB here). See GAPSWEEP_P1_post.md.
- P2: backend `clients/gemfield/` (controller, service, progress planner, webhook HMAC) mounted at `/api/gemfield`; shared `resolveClientAccessContext` (ClientsController refactored to use it); `gemfield_phase_advanced` activity; serializer field exposure; realtime via `broadcastDataChange`. Frontend `lib/gemfield.ts` + `GemfieldProgressCard` gated on `/client`. Sender `scripts/gemfield-progress-push.mjs`. Verified: backend+frontend tsc exit 0, `gemfield.webhook.test.ts` (HMAC + idempotency) green, script dry-run. Frontend unrendered (no app), route matrix + migration apply → CI/staging. See GAPSWEEP_P2_post.md.
- P3: backend wizard ticket (`gemfield-ticket.ts` routing + `gemfield-ticket.service.ts`) creates a ClientTicket with attachments (StoredUpload join) + zero-dep EXIF strip (`image-metadata.ts`); per-org rate limiter; notify-only receipt email; route `POST /api/gemfield/organizations/:id/tickets`. Frontend schema-driven `gemfield-ticket-wizard.ts` + `TicketWizard` stepper + `GemfieldRequestLauncher` (call/callback/dev-assist affordances) gated on `/client`. Verified: backend build + tests (`gemfield-ticket`, `image-metadata`) green, frontend tsc + eslint clean. Frontend unrendered; #W due. See GAPSWEEP_P3_post.md.
