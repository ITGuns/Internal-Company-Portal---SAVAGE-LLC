# GAP_SWEEP - P2 (post)

Scope: Website Progress - ingestion (HMAC webhook + staff editor), client timeline, realtime, sender script.

## Verified (this environment)
- ✓ **Backend typecheck** - `tsc --noEmit` exit 0 (controller, service, progress planner, webhook, serializers, main.ts mount, access-context extraction).
- ✓ **Frontend typecheck** - `tsc --noEmit` exit 0 (gemfield.ts lib, GemfieldProgressCard, ClientOrganization/ClientProject type additions, /client page integration).
- ✓ **Webhook + idempotency test green** - `gemfield.webhook.test.ts`: HMAC verify (valid passes; tampered phase/note, wrong secret, missing sig/secret all fail closed); canonical message order-stable; `planGemfieldProgress` deterministic (idempotent), key = (projectId, phase); current phase = furthest-along (no regression on earlier reports); invalid phase throws; **service replay upserts one milestone** (mock DB); unknown GF-ID rejected before write.
- ✓ **Entitlement gate still green**; no regressions in `clients.access`/`upload.access`/`clients.activity`.
- ✓ **Sender script** - `node --check` clean; dry-run signs with the same canonical field order as the backend.

## Convention adherence
- ✓ Reused `notificationService.broadcastDataChange` (existing socket channel) - no second notifier.
- ✓ Reused `createClientActivity` for the persistent audit entry (client-visible) - no second feed.
- ✓ Extracted `resolveClientAccessContext` and refactored `ClientsController` to use it - one resolver, not two (entitlement can't drift from base scoping).
- ✓ Progress vocab = String + validation Set; guard = the single `requireGemfieldClient`.
- ✓ Staging link exposed server-side only from `client_review` onward (not merely UI-hidden).
- ✓ Client copy warm/plain ("Your website build", "We're getting started"); no internal jargon.

## Carried to CI/staging (needs live Postgres / running app - unavailable here)
- ⧗ Apply migration; run the HTTP route matrix for the 3 new endpoints (read/editor/webhook) × personas per `clients.routes.test.ts`.
- ⧗ **Frontend is typechecked but NOT rendered** - GemfieldProgressCard timeline, entitlement-gated visibility, staging/live links need a staging click-through (part of the #W gate).
- ⧗ Webhook end-to-end (real HMAC over HTTP) + Socket.io push to a connected client.
- ⧗ Provision `GEMFIELD_WEBHOOK_SECRET` (BLOCKERS B3) before the sender/webhook is live; staff editor carries progress meanwhile.

## Watch items into P3
- ⚠ Wizard submit must route through the client-vs-management serializer (internal-note safety).
- ⚠ Attachments: reuse UploadsService + new ClientTicketAttachment join; add `sharp` EXIF strip (D4); per-org rate limiter.
- ⚠ Mock-mode demo data (2 orgs + fixtures) still deferred - fold into P3 or a seed pass.
