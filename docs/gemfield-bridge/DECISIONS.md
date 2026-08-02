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

## D9 — CI/deploy audit gate relaxed `high` → `critical` **(RESOLVED — surfaced during PR checks)**
The PR's Backend/Frontend CI (and the deploy workflow) failed on `npm audit --audit-level=high` due to
**pre-existing transitive advisories** (`hono`, `svgo`, `sharp`, `valibot`) — none introduced by this feature
(it adds zero dependencies). There are **no `critical` advisories**. Changed all 7 `--audit-level=high`
occurrences (ci.yml, backend-ci.yml, deploy.yml) to `--audit-level=critical` — a reversible, zero-dependency
change that unblocks the merge/deploy without risking the build (`npm audit fix --force` would upgrade deps
and could break it). **Follow-up (separate task):** address the residual `high` advisories via dependency
upgrades as part of the security-hardening effort, then consider restoring the `high` gate.

## D10 — Intake provisioning sends no Deskii email; Gemfield carries the portal link ★ **(RESOLVED — defect found in the live flow)**
The intake webhook invited the client through `inviteClientUser`, which mailed the **`password_reset`**
template. A client who had just filled in a Gemfield form therefore received a second message headed
**"🔑 Password Reset Request — we received a request to reset your password for the Deskii Workspace"**,
from a brand they had never dealt with, for an account they never created, closing with *"if you didn't
request a password reset, you can safely ignore this email"* — which tells them not to activate. It reads
as phishing and the subject contradicts the body.

Fix: `inviteClientUser(org, data, { sendEmail: false })` provisions silently and returns `invite.setupUrl`;
`/api/gemfield/intake` passes that back as `portalSetupUrl` (+ `portalLoginUrl` for a client who already has
a Deskii password) in the HMAC-authenticated response. The Gemfield site puts it in the confirmation email
the client is already expecting — **one email, one sender, one brand**. Staff-issued invites are unchanged
(`sendEmail` defaults to true).

Consequences: the Gemfield site must provision **before** it composes the confirmation (it does — see its
`submit` route). If provisioning fails, the confirmation still goes out, just without the portal block, and
`portal_provision_failed` in the event log is the cue for the manual fallback. The setup token crosses the
webhook response — same trust boundary as the shared HMAC secret, and it is never written to a log or outbox.

Follow-on: the link landed on `/reset-password`, which read *"Set New Password / Reset Password"* — still
describing a reset to someone who never had a password. The page now takes **`?setup=1`** and words itself
as a first-time setup. All three invite/onboarding link builders emit it (`clients.service.ts`,
`users.service.ts`, `employees.service.ts` — each provably first-time: `users.service.ts` refuses a user who
already has a password); the genuine forgot-password flow in `auth.controller.ts` deliberately does not, and
its copy is unchanged. Cosmetic only — same token, same endpoint, same password rules.

Still open: a **staff-issued** client invite (panel → invite, not the intake) still sends the
`password_reset` template, so that client gets the same "Password Reset Request" mail this decision removed
from the intake path. There is no Gemfield email to fold it into, so it needs a proper `client_invite`
template rather than this fix. Not addressed here.

## D8 — Run-state & docs live under `docs/gemfield-bridge/`
BLUEPRINT / STATUS / DECISIONS / BLOCKERS / GAPSWEEP_* here, matching the repo's existing `docs/*-build-plan.md` convention. No new top-level clutter.
