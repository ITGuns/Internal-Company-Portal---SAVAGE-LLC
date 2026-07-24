# GAP_SWEEP - P1 (post)

Scope: entitlement foundation - additive migration, RBAC role, entitlement guard, entitlement gate.

## Verified (this environment, no DB)
- ✓ **Schema valid** - `prisma validate` passes; `prisma format` applied (repo style).
- ✓ **Migration is expand-only** - generated via offline `prisma migrate diff` (P0 snapshot → new schema): only ADD COLUMN (nullable / defaulted), CREATE TABLE, CREATE INDEX, ADD CONSTRAINT. No drops, no renames, no NOT NULL without default. Existing rows + plain client orgs unaffected.
- ✓ **Backend typecheck** - `tsc -p tsconfig.json --noEmit` exit 0 after `prisma generate`.
- ✓ **Entitlement gate green** - `gemfield.entitlement.matrix.test.ts`: guard predicate + Express middleware across {gemfield member, plain client, cross-org client, staff, unauthenticated} × {entitled, non-entitled, inactive, non-existent, missing-id} orgs. Deny = 404 with a static `{error:'Not found'}` body (asserted `Object.keys === ['error']` → zero record/existence leakage); non-entitled and non-existent return byte-identical bodies. Attachment row: org B and plain clients cannot read org A's ticket attachment; staff + same-org members can.
- ✓ **No regressions** - `org-catalog-sync`, `upload.access`, `clients.access`, `client-service-tier-presets` pure tests still pass after the role-catalog and upload-predicate edits.

## Convention adherence
- ✓ Role added the existing way (catalog entry → auto-seeded AvailableRole + access Set); no bespoke auth.
- ✓ Phases as String + validation Set (no Prisma enum), matching repo convention.
- ✓ Attachments reuse `StoredUpload` via a join; `canReadStoredUpload` extended with one branch, not a parallel path.
- ✓ Deny returns 404 not 403 (D3) - divergence is deliberate and documented.

## Carried to CI/staging (needs a live Postgres - unavailable here)
- ⧗ Apply `202607250001_gemfield_bridge` via `prisma migrate deploy`; confirm `migrate diff --from-migrations ... --to-schema --exit-code` is empty (schema/migration in sync).
- ⧗ HTTP-level route matrix (supertest-style, per `clients.routes.test.ts`) once P2 lands the first Gemfield route - the guard is already proven at the middleware level.
- ⧗ Migration down/rollback rehearsal on a schema copy.

## Watch items into P2
- ⚠ Every Gemfield Prisma query must include org + `gemfieldClient` scoping (breakpoint #1).
- ⚠ The P2 controller must wire `requireGemfieldClient` deps (`resolveAccess` via the existing access-context resolver, `loadOrganization` selecting `id,status,gemfieldClient`).
- ⚠ Mock-mode demo data (2 orgs, fixtures) deferred to P2 alongside the progress feature.
