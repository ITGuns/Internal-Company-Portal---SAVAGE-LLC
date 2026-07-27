# GAP_SWEEP - P4 (post)

Scope: developer control panel + admin entitlement toggle.

## Verified (this environment)
- ✓ **Backend build** `npm run build` exit 0; `tsc --noEmit` exit 0.
- ✓ **Frontend** `tsc --noEmit` exit 0; eslint clean on new files.
- ✓ **SLA** `gemfield-sla.test.ts`: business-minutes math (in-hours clamp, weekend skip), pause subtraction, state thresholds, per-tier targets.
- ✓ **Pipeline** `gemfield-pipeline.test.ts`: status guards, reopen rule (closed→open ⇒ triaged), SLA summary incl. waiting-on-client pause.
- ✓ **Internal-note leak guardrail (API shape)** `gemfield.internal-note-leak.test.ts`: the client serializer strips internal comments + internalNotes + staff-only fields (asserted on serialized bytes AND keys); management positive-control sees them. This is the guide's worst-bug guardrail.
- ✓ No regressions (upload.access, clients.access, org-catalog-sync).

## Delivered
- **Admin entitlement toggle** — `setEntitlement` (validates/dedupes GF-IDs) + `PATCH /api/gemfield/admin/organizations/:id/entitlement`, gated on MANAGEMENT access (not the entitlement guard, since it must reach a not-yet-entitled org). Frontend helper `setGemfieldEntitlement`.
- **Pipeline** — `GET /api/gemfield/admin/pipeline` (staff-only, Gemfield-scoped, SLA per item) + `PATCH .../tickets/:id/{status,assignee,classification}`. Every status move records a ClientActivity event. Reopen routes to Triaged.
- **Reuse** — reply uses the existing `POST /api/clients/tickets/:id/comments` (no parallel comment path); management serializer for staff reads.
- **Frontend** — `lib/gemfield-admin.ts` + `operations/clients/gemfield/page.tsx`: columns New→…→Closed, **move-buttons** (D5), SLA chips, in-scope/quoted classification, and a reply composer that **defaults to Internal** with an amber warning when switched to client-visible.

## Remaining in P4 (not yet built)
- ⧗ **Daily digest** to the dev channel (guide §4) — needs a scheduled job via the existing scheduler; not implemented.
- ⧗ **Nav registration** — the `/operations/clients/gemfield` page exists but isn't linked in the ops sidebar yet.
- ⧗ **Ticket detail depth** — drawer shows classification + reply; wizard answers + attachment previews + an assignee picker (backend `assignTicket` + `assignGemfieldTicket` exist) are not yet surfaced.
- ⧗ Embedding the entitlement toggle into the existing `/operations/clients/accounts` page (helper ready).

## Carried (as before)
- ⧗ Frontend unrendered; migration unapplied; HTTP route matrix for the new staff routes → CI/staging.
- ⧗ #W still pending (P3 gate) — do it on the Supabase branch before relying on any of this in prod.
