# Gemfield Bridge — BLOCKERS

Items that need real data or an operator decision. None block P0→P1 *design*; several block launch (#Z).

## Needs real-world data (parks until provided)
- **B1 — Support phone number + callback hours (#S).** Config-driven, never hardcoded. Blocks P3 "Call support" copy and P4 SLA config.
- **B2 — SLA targets per service tier (#S).** First-response + resolution targets per `ClientServiceTier`. Blocks P4 SLA chips.
- **B3 — Webhook token provisioning.** `POST /api/gemfield/progress` needs the env var **`GEMFIELD_WEBHOOK_SECRET`** (ops-provisioned). Without it the route returns 503 and the sender script exits early; the staff editor carries progress meanwhile. Code is done; only the secret is outstanding.
- **B4 — Real GF-IDs for seed/demo.** Mock mode uses fixtures (`GF-2026-0001` etc.); production linkage needs staff to enter actual GF-IDs on each org.

## Missing inputs named by the guide (compensated, not blocking)
- **B5 — `Deskii_Context.md`, `Gemfield_Context.md`, `GEMFIELD_BUILD_PROCESS.md` do not exist.** Grounded the Blueprint in the real code + `CONTEXT.md` + `gem/gemfield_intake_schema_v2.json` instead. If these docs exist elsewhere, share them and I'll reconcile.
- **B6 — No CHANGES.md / in-scope-vs-quoted policy exists** in either repo. The `changeClass` field + reply templates author this policy for the first time; confirm the two categories and template wording at #W/#S.

## Decisions awaiting operator (see DECISIONS.md)
- **B7 — D4 EXIF:** add `sharp`? (recommended yes)
- **B8 — D5 board:** move-buttons vs `dnd-kit`? (recommended move-buttons)
- **B9 — D1/D2:** extend-not-parallel + phase names — the core #B approval.
