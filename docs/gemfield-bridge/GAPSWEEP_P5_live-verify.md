# GAP_SWEEP - P5 (live verification against Supabase)

The bridge was run for real against a live Supabase database (mock-seeded via `seed:gemfield`) and
exercised end-to-end through the HTTP API. This upgrades several definition-of-done items from
"unit-tested / typechecked" to "verified against real data."

## Verified live (backend, HTTP level)
- ✓ **Server boots clean** against Supabase (found + fixed a real rate-limiter `req.ip`/IPv6 bug that
  only surfaced at runtime — commit 67c9745).
- ✓ **Website Progress** - gemfield client reads their project + 5 milestones; `currentPhase=build`;
  staging link correctly withheld (build < client_review).
- ✓ **Wizard submit -> pipeline** - client POSTs a request, gets `TK-…`, and it appears in the dev
  pipeline (the full client→staff loop).
- ✓ **Entitlement deny-matrix (17/0)** - plain client → gemfield org = 404; plain client → own
  non-entitled org = 404; unauth = 401; deny body exposes only `{error}` (zero leak).
- ✓ **Staff-only control panel** - gemfield *client* and plain client → pipeline/move/entitlement =
  403; unauth = 401; dev = 200 and can move/classify.
- ✓ **Internal-note-never-leaks (LIVE)** - a client's own API response does NOT contain the seeded
  internal note and has no `internalNotes` field, while staff DO see it. The guide's worst-bug
  guardrail, proven on real API responses.

Reusable smoke check committed at `scripts/gemfield-smoke-check.mjs` (parameterized by
`GEMFIELD_SMOKE_BASE` / `GEMFIELD_SMOKE_PASSWORD`); re-run it against any seeded environment.

## Still outstanding for P5 / launch
- ⧗ **#W** - the human wizard click-through in a browser (UX judgment). Backend behind it is proven;
  frontend is typechecked + renders (Next "Ready") but not yet eyeballed by a person.
- ⧗ **Playwright E2E** (wizard on a mobile viewport, board drag/move) - authored to run in CI; needs
  a browser runner.
- ⧗ **a11y pass** (WCAG AA, keyboard/tap completable) - needs a rendered page.
- ⧗ **Webhook idempotency under replay** - unit-tested; a live replay needs `GEMFIELD_WEBHOOK_SECRET`.
- ⧗ **Migration up/down** on a real DB (we used `db push` on the throwaway; prod uses `migrate deploy`).

## Still outstanding for launch (owners)
- ⧗ **#S config** (SLA targets + support phone + callback hours) - needs the operator's values.
- ⧗ **CI green** - pre-existing `npm audit` high advisories block the merge gate (repo-wide, not this
  feature); plus Vercel "account blocked" for the frontend deploy.
- ⧗ **#Z** - open the dark-launch flag once the above are done.
