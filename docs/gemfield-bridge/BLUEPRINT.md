# Deskii × Gemfield Bridge — Blueprint (extension map)

**Phase:** P0 → awaiting **#B** (Blueprint approval, blocking).
**Prime directive:** extend, never parallel. Every item below names the existing Deskii module it extends and the files it touches. Nothing here creates a second notification system, a second uploader, or a bespoke auth check.

> **Reading note.** The guide names `Deskii_Context.md`, `Gemfield_Context.md`, and `GEMFIELD_BUILD_PROCESS.md` as required inputs. **None of these files exist** (verified). This Blueprint was instead grounded in the actual code + the real `CONTEXT.md` + `gem/gemfield_intake_schema_v2.json`. See BLOCKERS.md.

---

## 0. The central reconciliation (the #B decision)

The guide's literal spec says "new tables `GemfieldProject` / `GemfieldMilestone`" and a `TK-####` ticket system. But Deskii **already has**, in `backend/prisma/schema.prisma`:

| Guide wants | Already exists in Deskii | Location |
|---|---|---|
| Gemfield project + progress | `ClientProject` (`status`, `progress`, `liveUrl`, `previewUrl`, `internalNotes`) | schema.prisma:352 |
| Ticket with category/priority/status/assignment | `ClientTicket` | schema.prisma:380 |
| Internal-note vs client-reply | `ClientTicketComment.visibility` (`client`/`internal`), filtered in serializers | schema.prisma:410, clients.serializers.ts:475 |
| "Every move is an event" | `ClientActivity` (append-only, `client`/`internal` visibility, typed events incl. `ticket_status_changed`) | schema.prisma:778 |
| Client ticket list + create UI | `ClientTicketsPage` | frontend `src/app/client/tickets/page.tsx` |
| Staff ticket admin | `AdminTicketPanel` / `/operations/clients/requests` | frontend `src/components/client-portal/AdminTicketPanel.tsx` |
| Service tiers, org membership scoping | `ClientServiceTier`, `ClientMembership`, `getAccessContext` | schema.prisma:286/334, clients.controller.ts:160 |

**Building parallel `GemfieldProject`/`GemfieldTicket` tables would duplicate all of the above** — a "failed task" by the guide's own definition.

**Recommendation (adopted unless #B overrides):** implement the Bridge as a **Gemfield specialization of the existing client models** — additive fields on `ClientOrganization`/`ClientProject`/`ClientTicket`, one genuinely-new child table (`GemfieldMilestone` — the phase timeline), one genuinely-new join (`ClientTicketAttachment`, reusing `StoredUpload`), a new RBAC role, the wizard UI, and the server-side entitlement guard. The guide's table *names* become *fields/children on existing models*; every capability the guide lists is preserved.

---

## 1. Entitlement foundation (P1) — the exclusivity, made structural

**Extends:** `ClientOrganization` + the client access policy + RBAC seed.

- **Prisma (additive):** on `ClientOrganization` (schema.prisma:298)
  - `gemfieldClient Boolean @default(false)`
  - `gemfieldCaseIds String[] @default([])` — GF-IDs, format `GF-{YYYY}-{NNNN}`, validated `^GF-\d{4}-\d+$` (mirrors `gem/src/lib/intake/store.ts`).
- **Guard — reuses the existing pattern, does not invent one:** new `backend/src/clients/gemfield/gemfield.access.ts` exporting `canAccessGemfield(access, orgId)` + `requireGemfieldClient` middleware, built on `getAccessContext` (clients.controller.ts:160), `getActiveClientOrganizationIds` / `canReadClientOrganization` (clients.access.ts:48/70), and the org's `gemfieldClient` flag.
  - **Deny returns 404, not 403** (deliberate divergence from the existing 403-on-unassigned pattern) so a non-entitled caller cannot even detect the module exists — "absent, not grayed" as a server property, not just UI.
- **RBAC role `gemfield-dev`:** add to `ORG_DEPARTMENT_ROLE_CATALOG` under "Website Developers" and the appropriate access set in `backend/src/org/org-access-policy.ts`; seed via `prisma/seed.ts`. This is the guide's "new role seed, existing mechanism."
- **Admin surface:** extend the existing client-org admin (`/operations/clients/accounts`) to let staff toggle `gemfieldClient` and manage `gemfieldCaseIds`.
- **ENTITLEMENT GATE (blocking, before any UI):** `backend/tests/gemfield-entitlement.matrix.test.ts` — every new endpoint × {gemfield client, plain Deskii client, staff, unauthenticated}; deny cases assert 404 + zero record data in the body; **includes an attachment-URL case** (org A's ticket attachment unfetchable by org B and by plain clients — extends `canReadStoredUpload`, upload.access.ts:21).

## 2. Website Progress (P2)

**Extends:** `ClientProject`; reuses Socket.io + `ClientActivity`.

- **Prisma:** on `ClientProject` add `gfId String?`, `gemfieldPhase String?`, `stagingUrl String?`. New child model **`GemfieldMilestone`** `{ id, projectId, phase, status, note?, at }` (the phase timeline — genuinely new; no equivalent exists).
- **Phase vocabulary (NOT a Prisma enum — the schema has zero enums by convention):** `backend/src/clients/gemfield/gemfield.phases.ts` — ordered array + validation Set. Proposed (from the guide; net-new since no phase list exists in either repo): `intake_received → research → blueprint → design → build → qa → client_review → launch_prep → live`. **Needs #B/#S confirmation of names.**
- **Ingestion, two modes:**
  - Webhook `POST /api/gemfield/progress` — new `backend/src/gemfield/gemfield-progress.controller.ts`, mounted in `main.ts` beside the other `app.use('/api/...')` lines; HMAC-signed, idempotent per `(gfId, phase)`.
  - Staff editor in `/operations/clients/delivery` (extends the existing delivery panel) — the always-current fallback.
- **Sender (ships with the build):** `scripts/gemfield-progress-push.mjs` — reads a client repo's `STATUS.md`, maps phases, POSTs. Token provisioning → BLOCKERS.md.
- **Client view:** new `src/components/client-portal/GemfieldProgressCard.tsx` composed from `ProductionPanel`/`ProductionStatusHero`, rendered on `/client` next to the existing project cards; staging link at `client_review`, live link at `live`. Multi-project orgs list all projects.
- **Realtime:** `notificationService.notifyUser` + `broadcastDataChange('client-overview')` (notifications are ephemeral — history lives in `GemfieldMilestone` + `ClientActivity`). Copy is warm, no internal jargon.

## 3. Ticket wizard (P3) — **#W walkthrough gate**

**Extends:** `ClientTicket` + `ClientTicketComment` + the upload pipeline. Does **not** replace the existing `/client/tickets` create form — it's a richer, schema-driven entry path that produces the same `ClientTicket`.

- **Prisma (additive on `ClientTicket`):** `sourceWizardVersion String?`, `ticketKind String?` (`standard`/`callback`/`dev_assist`), `wizardAnswers Json?`, `changeClass String?` (`in_scope`/`quoted`, set by staff in P4). New join **`ClientTicketAttachment`** `{ ticketId, uploadId }` reusing `StoredUpload`; extend `canReadStoredUpload` (upload.access.ts) with a ticket branch (org-scoped).
- **Wizard config (schema-driven, versioned — the Gemfield habit):** `frontend/src/lib/gemfield/ticket-wizard-schema.ts`. Steps: (1) category cards → (2) dynamic narrowing dropdowns fed from the org's project pages → (3) attachments + plain description → (4) review → `TK-{seq}` (a display sequence over `ClientTicket`).
- **Wizard UI:** `src/components/client-portal/gemfield/TicketWizard.tsx`, stepper modeled on `PayrollSetupModal.tsx` (the only existing stepper; no reusable `<Stepper>` yet — extract one). Uses `ChoiceGroup`, `ProductionPanel`, `Button`. Fully tap/keyboard completable (WCAG AA — P5).
- **Attachments:** reuse `UploadsService.create` + org-scoped `/api/uploads/files/:id`. **EXIF stripping does not exist today** → add `sharp` scoped to this path (decision — see DECISIONS.md). Size/type caps reuse `upload.validation.ts`.
- **Always-visible affordances:** Call support (`tel:` + callback → files a priority ticket, `ticketKind=callback`) and Request developer assistance (`ticketKind=dev_assist`, priority high, top of pipeline). Phone + callback hours from config (#S), never hardcoded.
- **Abuse rails:** new per-org rate limiter — reuse `connectAuthRateLimitStoreFactory` (Redis) with a custom org/user `keyGenerator` (only auth IP/email keying exists today). Soft duplicate hint.
- **Email:** new `EmailTemplateType` `gemfield_ticket_received` in `email.templates.ts`, notify-only, carrying a "reply in Deskii" deep link; inbound parsing explicitly out of v1 scope, stated in the email body.
- **Client ticket list:** extend `ClientTicketsPage` — org-wide visibility (any org member sees/comments), reopen within 14 days, creator attributed. Already largely present.

## 4. Developer Ticket Control Panel (P4) — **#S config gate**

**Extends:** the staff `/operations/clients/requests` area + `AdminTicketPanel`; gated to `gemfield-dev` via existing RBAC.

- **Route:** `src/app/operations/clients/gemfield/page.tsx` in `ClientOperationsShell`, filtered to `gemfieldClient` orgs.
- **Board:** columns `New → Triaged → In Progress → Waiting on Client → Resolved` (+ `Closed`) — these are `ClientTicket.status` values (extend the status validation set). Reuse the column-grouping pattern from `task-tracking/page.tsx` + `BoardCard.tsx`. **No DnD library is installed** → column moves via buttons by default; `dnd-kit` only if approved (decision). Every move → `ClientActivity` event (existing pattern).
- **Detail:** reuse `AdminTicketPanel`; internal-vs-client replies already exist and are serializer-filtered — **change the compose default to `internal`** and add an unmistakable visual marker. SLA chips (first-response + resolution per tier, config-driven; clock runs business-hours, **pauses in `Waiting on Client`**). Ticket links to its `ClientProject`/GF-ID.
- **Classification:** `changeClass` (`in_scope`/`quoted`) with seeded client-facing reply templates.
- **Digest:** daily to the dev channel via existing chat/notification infra + email.

## 5. Dark launch

Entire module behind a feature flag; migrations land early (P1), exposure lands last (flag opens at **#Z**). Non-entitled orgs see nothing throughout.

## 6. Definition of done

**Machine:** entitlement matrix green · internal-note leak test green (asserted on the client API *response shape*, not just UI) · wizard E2E green mobile+desktop · migration up/down clean · webhook idempotent under replay · all GAP_SWEEP files filed.
**Human:** a real Gemfield client files a change ticket with a phone photo in <2 min unaided · a plain Deskii client sees nothing anywhere · a dev moves it through the pipeline and the client sees each visible update · a callback request reaches a human.

## 7. Human checks

- **#B** — this Blueprint + the §0 reconciliation. *(blocking, now)*
- **#W** — wizard walkthrough on staging before P4 is built.
- **#S** — SLA targets + support phone + callback hours config.
- **#Z** — pre-launch review; the flag opens here.
