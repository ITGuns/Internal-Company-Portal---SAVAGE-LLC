# GAP_SWEEP - P3 (post)

Scope: ticket wizard - schema-driven steps, wizard-submit backend, attachments (EXIF strip), rate limit, call/dev-assist affordances.

## Verified (this environment)
- ✓ **Backend build** - `npm run build` (tsc emit) exit 0; `tsc --noEmit` exit 0.
- ✓ **Frontend typecheck** - `tsc --noEmit` exit 0; **eslint clean** (0 errors, 0 warnings) on all new files.
- ✓ **Image metadata stripper** - `image-metadata.test.ts`: JPEG APP1/EXIF removed + structural segments kept; PNG eXIf chunk removed + IHDR/IEND kept; GIF/non-image returned unchanged; never throws.
- ✓ **Ticket routing/normalization** - `gemfield-ticket.test.ts`: dev_assist/callback -> high, broken -> high, else normal; unknown category/kind coerce to safe defaults; callback folds number+window into the description; wizardVersion/answers pass through; `TK-XXXXXX` reference.
- ✓ **No regressions** - entitlement matrix + webhook idempotency tests still green.

## Convention adherence / guide requirements met
- ✓ Wizard submission creates a normal **ClientTicket** (extend, not parallel) with additive fields; listing/detail/comments reuse existing `/api/clients` endpoints (internal-note-safe serializers).
- ✓ Attachments reuse **StoredUpload** (`UploadsService.create`) + the `ClientTicketAttachment` join; magic-byte validated (`validateUploadContent`); **images metadata-stripped before storage**; served only via the P1 org-scoped `canReadStoredUpload` ticket branch.
- ✓ **Schema-driven steps** in a versioned config (`gemfield-ticket-wizard.ts`, `GEMFIELD_WIZARD_VERSION`) - adding a change-type is config, not code.
- ✓ **Call support** (tel: + request-a-callback -> priority `callback` ticket with number/time) and **Request a developer** (`dev_assist` -> high priority) always visible in the wizard footer.
- ✓ **Per-org+user rate limit** (10/min) reusing `express-rate-limit`; soft cap on attachments (6).
- ✓ **Notify-only email** with a "reply in Deskii" deep link and an explicit "this inbox isn't monitored" line; best-effort (never fails the request).

## Deviations / carried items
- ⚠ **D4: zero-dep stripper instead of `sharp`** (approved choice was sharp). Covers all accepted image types (PNG/JPEG/GIF); documented + reversible. Needs sign-off.
- ⚠ **TK reference is a stable short id (TK-XXXXXX), not a monotonic sequence** - a counter is a later nicety (D6).
- ⧗ **Frontend unrendered** - wizard, launcher, progress card typechecked only; the #W human staging walkthrough (the P3 gate) requires a running app and is NOT satisfiable here.
- ⧗ **Redis store for the ticket rate limiter** - defaults to in-memory; production should supply the shared Redis store.
- ⧗ Route-level HTTP matrix for the new ticket endpoint (persona × entitlement) → CI/staging (guard already proven at middleware level).

## Watch items into P4
- ⚠ Dev control panel must default the reply compose to **internal** and keep the internal-note API-level leak test (the worst-bug guardrail).
- ⚠ Board = move-buttons (D5); classification `changeClass` (in_scope/quoted); SLA clock business-hours + pause in Waiting-on-Client.
