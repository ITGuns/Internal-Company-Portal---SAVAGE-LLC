# Gemfield Bridge — STATUS

**Date:** 2026-07-25
**Model:** Opus 4.8 (orchestration + build). Flags expected: **zero**.
**Current phase:** P4 (control panel + admin toggle) backend verified, frontend typechecked. #W (wizard walkthrough) still outstanding — to be run on a **Supabase branch** (prod has real clients). P1-P3 committed + pushed (PR to `main`, user merges). P4 committed on the same branch. Remaining before launch: #W, P4 leftovers (digest, nav link, detail depth), P5 hardening, #Z flag.

**Next action (user):** (1) open the PR to `main` and confirm Render's `DIRECT_URL` = Supabase direct; (2) create a Supabase branch, apply migration + `seed:gemfield` (`ALLOW_GEMFIELD_SEED_NONLOCAL=true`), run #W per `RUNBOOK_local_bringup.md`.

## Three likeliest breakpoints (guide kickoff §7.1)

1. **Entitlement leakage through shared queries.** Because we *extend* `ClientTicket`/`ClientProject` (tables shared by every client org) rather than isolate a Gemfield table, any new query that forgets the org + `gemfieldClient` filter can leak across tenants. The existing membership filter (`getClientOrganizationVisibilityFilter`) scopes by org, but the *entitlement* layer is new. → Mitigation: single `requireGemfieldClient` guard on every bridge route, Prisma filters that always include org, and the blocking entitlement matrix (incl. attachment URLs) before any UI.

2. **Internal-note exposure.** `ClientTicketComment.visibility` is filtered in `serializeClientTicketForClient` (clients.serializers.ts:475) — but each *new* endpoint (wizard submit, dev panel, ticket detail) must route through the client-vs-management serializer or it leaks raw comments/`internalNotes`. → Mitigation: leak test asserted on the client API **response shape**, not the UI; compose default = internal.

3. **Migration risk on the live shared schema.** We alter heavily-used tables (`ClientOrganization`, `ClientTicket`, `ClientProject`) + add `GemfieldMilestone` and `ClientTicketAttachment`. → Mitigation: expand-only, additive columns with defaults (`String[] @default([])`, booleans default false), no backfill that locks; migration `202607250001_gemfield_bridge` tested up/down on a schema copy.

## Log
- P0: 5 parallel readers mapped RBAC/data-model/migrations, auth+org-scoping guards, uploads/notifications/email/rate-limit services, the MyDeskii frontend, and Gemfield GF-ID/phase/intake conventions. Findings folded into BLUEPRINT.md.
- P1: migration `202607250001_gemfield_bridge` (expand-only); `gemfield_developer` role; `gemfield.access.ts` guard + `gemfield.phases.ts`; `canReadStoredUpload` ticket branch + service wiring; blocking `gemfield.entitlement.matrix.test.ts`. Verified: prisma validate, tsc exit 0, matrix + affected pure tests green. Migration apply + HTTP route matrix deferred to CI/staging (no DB here). See GAPSWEEP_P1_post.md.
- P2: backend `clients/gemfield/` (controller, service, progress planner, webhook HMAC) mounted at `/api/gemfield`; shared `resolveClientAccessContext` (ClientsController refactored to use it); `gemfield_phase_advanced` activity; serializer field exposure; realtime via `broadcastDataChange`. Frontend `lib/gemfield.ts` + `GemfieldProgressCard` gated on `/client`. Sender `scripts/gemfield-progress-push.mjs`. Verified: backend+frontend tsc exit 0, `gemfield.webhook.test.ts` (HMAC + idempotency) green, script dry-run. Frontend unrendered (no app), route matrix + migration apply → CI/staging. See GAPSWEEP_P2_post.md.
- P3: backend wizard ticket (`gemfield-ticket.ts` routing + `gemfield-ticket.service.ts`) creates a ClientTicket with attachments (StoredUpload join) + zero-dep EXIF strip (`image-metadata.ts`); per-org rate limiter; notify-only receipt email; route `POST /api/gemfield/organizations/:id/tickets`. Frontend schema-driven `gemfield-ticket-wizard.ts` + `TicketWizard` stepper + `GemfieldRequestLauncher` (call/callback/dev-assist affordances) gated on `/client`. Verified: backend build + tests (`gemfield-ticket`, `image-metadata`) green, frontend tsc + eslint clean. Frontend unrendered; #W due. See GAPSWEEP_P3_post.md.
