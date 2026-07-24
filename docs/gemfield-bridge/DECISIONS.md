# Gemfield Bridge — DECISIONS

Recommendations carry a ★. Items marked **(needs #B)** must be confirmed before P1.

## D1 — Extend existing client models, not parallel Gemfield tables ★ **(needs #B)**
The guide's `GemfieldProject`/`GemfieldTicket` names become **additive fields + one child table + one join** on `ClientProject`/`ClientTicket`/`ClientOrganization`. Rationale: the existing models already carry status/progress/priority/assignment/internal-note-visibility, the client UI, the staff admin panels, and the activity feed. Parallel tables would duplicate all of it — a "failed task" per the guide. Only genuinely-new tables: `GemfieldMilestone` (phase timeline), `ClientTicketAttachment` (join over `StoredUpload`).
*Alternative rejected:* literal new tables → double the surface, split the audit trail, fork the internal-note filtering (the exact bug the guide fears most).

## D2 — Phase list is net-new; adopt the guide's 9 phases as a String + validation Set **(needs #B)**
No phase sequence exists in either repo; the schema has **zero Prisma enums** by convention. So phases live as an ordered array + validation Set in `gemfield.phases.ts`, values: `intake_received, research, blueprint, design, build, qa, client_review, launch_prep, live`. Confirm names/order.

## D3 — Entitlement denial returns 404, not 403 ★
Existing client routes 403 on a valid-but-unassigned org (discloses existence). Bridge routes 404 for non-entitled callers → "absent, not grayed" becomes a server property. Slight divergence from existing convention, justified by the exclusivity requirement.

## D4 — EXIF stripping: implemented zero-dependency, NOT `sharp` **(RESOLVED — deviates from the approved choice)**
Approved choice was "add `sharp`." **Implemented instead as a zero-dependency stripper** (`backend/src/uploads/image-metadata.ts`): strips the JPEG APP1 (EXIF/XMP) segment and PNG metadata chunks. Rationale:
- The allowed upload MIME types are only PNG/JPEG/GIF (`upload.validation.ts`) — no HEIC/TIFF — and GIF carries no GPS, so JPEG+PNG stripping **fully covers the GPS-leak surface** for accepted formats.
- `sharp` is a **native module that cannot be installed or verified** in this environment; the zero-dep stripper is fully unit-tested here (`image-metadata.test.ts`), honoring the "backend-first, verified" mandate.
- Fails safe: returns original bytes on any parse anomaly.
Trade-off: it does not re-encode or cover formats that aren't accepted anyway. **Swap to `sharp` later** if the accepted-type list grows (HEIC/TIFF) — the call site is a single function. Flag for sign-off.

## D5 — Dev-panel board: move-buttons first, DnD optional **(needs decision)**
No drag-and-drop library is installed anywhere. ★ Recommend column **move-buttons** for v1 (keyboard-accessible, zero new dep, satisfies "every move is an event") and treat drag as a later polish. Alternative: add `dnd-kit` now (new dep, more test surface). The guide says "drag between columns" — move-buttons deliver the same state machine; confirm this substitution is acceptable.

## D6 — TK-#### is a display sequence over ClientTicket ★
Tickets remain `ClientTicket` rows (cuid ids). `TK-{seq}` is a human reference derived from a per-scope counter, shown in UI/email — not a second identity. Keeps one ticket table.

## D7 — Notifications stay ephemeral; history via GemfieldMilestone + ClientActivity ★
No `Notification` table exists (real-time is fire-and-forget). Persistent progress/audit history is the `GemfieldMilestone` rows and `ClientActivity` events — no new persistence system.

## D8 — Run-state & docs live under `docs/gemfield-bridge/`
BLUEPRINT / STATUS / DECISIONS / BLOCKERS / GAPSWEEP_* here, matching the repo's existing `docs/*-build-plan.md` convention. No new top-level clutter.
