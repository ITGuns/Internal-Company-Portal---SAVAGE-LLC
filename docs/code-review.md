# Code Review Checklist

Use this checklist for human review, agent review, and pre-release self-review. Apply the relevant sections only; do not turn narrow changes into broad rewrites.

## Review Operating Mode

- Start with the current branch, dirty worktree, and exact diff.
- Read `AGENTS.md` and the relevant docs before reviewing meaningful changes.
- Use memory only as a pointer; verify drift-prone claims against the current repo, commands, rendered app, or browser state.
- Prioritize defects, regressions, security issues, missing validation, missing tests, and broken contracts.
- Ground each finding in a file and line reference when possible.
- Do not report speculative style preferences as blockers.
- Do not revert unrelated user or agent changes.

## Backend and API

- Inputs are validated before use, especially uploads, auth, profile data, dates, IDs, and JSON fields.
- Routes that should be protected use `authenticateToken`.
- Privileged behavior is checked server-side, not only hidden in the frontend.
- Controllers stay thin enough to read; reusable business logic belongs in services or helpers.
- Responses do not expose passwords, reset tokens, bank/tax fields, secrets, or unneeded private user data.
- API contract changes are reflected in `docs/api.md` when behavior changes.
- Focused backend tests cover changed validation, permission, serialization, and business-rule paths.

## Auth and Access Control

- Pending or unapproved users cannot receive normal login or refresh tokens.
- Employee self-service routes only expose or mutate the authenticated user's own data unless a documented management permission applies.
- Management roles and admin bypass behavior use existing permission helpers where possible.
- Chat, payroll, employees, uploads, and file-directory changes identify trust boundaries and sensitive outputs.
- Errors are clear without leaking sensitive internals.

## Uploads and Files

- File type, extension, MIME, and size behavior match the route contract.
- Image or avatar input rejects unsafe protocols and malformed data.
- Uploaded files are served through authenticated routes unless intentionally public and documented.
- File names and paths cannot escape the intended storage location.
- Tests cover accepted and rejected file/avatar cases.

## Database and Prisma

- Schema changes are explicit, reviewed, and documented before implementation.
- Prisma schema, migrations, seed data, and query callers are inspected before database behavior changes.
- Relationship ownership and cascade behavior are preserved unless intentionally changed.
- Query changes avoid avoidable N+1 behavior and preserve tenant/user visibility rules.
- `npx prisma validate` and `npx prisma generate` pass when schema or Prisma client behavior is touched.

## Frontend and UX

- Pages reuse existing components, hooks, API helpers, role helpers, and style patterns.
- Loading, empty, error, disabled, and success states are handled when the flow needs them.
- Mobile, tablet, and desktop layouts avoid overlap, clipping, awkward wrapping, and unusable touch targets.
- Forms have clear labels, validation feedback, and accessible controls.
- Management-only UI remains convenience only; backend authorization remains authoritative.
- Browser verification covers changed routes when the app can be rendered locally.
- Manual click-through covers affected routes, buttons, forms, dialogs, navigation paths, and important states.
- Full-feature audit is completed for cross-cutting shell, auth, role, navigation, dashboard, release, broad redesign, or explicit "all features" requests.
- Tool choice is justified: Browser/in-app browser for local web DOM and responsive checks, Chrome for user Chrome session/profile/tab/extension needs, and Computer Use for real Windows app surfaces.

## Agent and Skill Workflow

- Meaningful work follows Vibe Auto Research: hypothesis, evidence, decision, edit, verification.
- Anti-hallucination evidence is named before completion: memory checked, repo files inspected, commands run, rendered routes or desktop surfaces checked, and blockers stated.
- Implementation work ends with a self-review/fix cycle before final response.
- Repo-local skill changes update `skills/skills-lock.json`.
- `npm run check:skills` passes after skill snapshot or lockfile changes.
- Third-party skills are reviewed before import, kept only when useful for repeated portal work, and not used with private portal data unless explicitly approved.
- Agent findings are checked against the actual repo diff before implementation.

## Documentation and Release

- `docs/dev-notes.md` has a concise session summary after meaningful work.
- `docs/architecture.md`, `docs/features.md`, `docs/api.md`, or `docs/database.md` are updated only when their source-of-truth content changes.
- Root/package verification commands remain accurate.
- Release or publish decisions include branch state, dirty worktree, tests/builds, audits, compose config when relevant, and `git diff --check`.
