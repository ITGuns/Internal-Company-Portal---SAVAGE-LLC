# Prompt-to-Quality Cycle

Use this reference when the user wants an instant workflow from a prompt: plan first, choose skills, verify repo fit, implement, review deeply, fix, and repeat until the result is solid or blocked.

## Outcome

Turn a user prompt into a complete engineering cycle:

1. Plan.
2. Check applicability.
3. Improve or reject the plan if needed.
4. Implement.
5. Review technical quality and user experience.
6. Replan fixes.
7. Re-implement and re-review.

The loop ends only when no material reviewer findings remain, the user stops it, or a real blocker prevents progress.

Before the final response, the agent should behave like a reviewer of its own work: find mistakes, fix them, rerun focused checks, and only then summarize the outcome.

## 1. Prompt Intake

Before planning, identify:

- requested outcome
- target user or actor
- business/product goal
- affected repo area
- likely risk level
- likely browser or desktop review needs
- assumptions that must be verified from the repo
- memory hints that need current repo or rendered-app verification
- whether the user asked to overanalyze or avoid hallucination, which should raise research depth and evidence reporting

If the request is ambiguous but a safe default exists, proceed with the default and say so. Ask only when a wrong assumption would be costly.

## 2. Skill Plan

Select skills/tools before planning implementation:

- Product or ambiguous feature: `brainstorming`, `writing-plans`, `product-requirements-quality`.
- PRD or issue-ready artifact: `to-prd`, only when the user asks for PRD/issue-tracker output.
- Backend/API: `api-service-quality`, `auth-access-control` when permissions are involved.
- Database/query/schema: `database-safety`, Postgres guidance when relevant.
- Frontend/UI: approved frontend craft stack: `impeccable`, `emil-design-eng`, `design-taste-frontend`, `motion-web-design`, `web-design-guidelines`, Browser/in-app browser or Chrome when requested.
- GSAP-specific frontend motion: add the official GSAP skills only when GSAP is actually needed: `gsap-react`, `gsap-performance`, `gsap-scrolltrigger`, `gsap-core`, `gsap-timeline`, `gsap-plugins`, or `gsap-utils` based on the implementation.
- Marketing/brand-heavy frontend: add `gpt-taste` only when cinematic landing-page structure, rich visuals, or GSAP-style motion fit the product goal.
- Bug/failure: `systematic-debugging`, `test-driven-development`.
- Security/release: `security-production-readiness`, `verification-before-completion`.
- Desktop/app surface: `computer-use` when the visible Windows app state is the source of truth.

State the selected skills briefly when useful. Skip skills that do not change the work quality.

## 3. Repo Applicability Check

Before accepting a plan, prove the request fits the repo:

- Does this feature already exist in another form?
- Which files, routes, models, components, tests, and docs own the behavior?
- Does the request match `PRODUCT.md`, `DESIGN.md`, and current feature docs?
- Are there API, database, auth, role, or deployment contracts that constrain the work?
- Is the requested workflow safe for client/user data?
- Can the result be verified locally or through existing tests?
- What current evidence disproves or updates memory, prior assumptions, or the first hypothesis?
- For UI/workflow work, what rendered route, browser state, visual-smoke output, Chrome session, or Computer Use surface will verify it?

If the request does not fit the repo, explain the mismatch and propose the closest safe plan.

## 4. Plan Quality Gate

A plan is acceptable only if it includes:

- goal and success criteria
- affected files/modules/routes
- implementation steps in a safe order
- data/API/auth contracts to preserve
- browser/manual click-through paths for UI work
- tests and commands to run
- docs to update or reason to skip docs
- risks, blockers, and rollback considerations

Reject and replan if the plan is vague, too broad, skips verification, ignores architecture, touches unrelated files, or cannot prove user value.

## 5. Implementation

Implement only after the plan passes:

- keep changes scoped
- prefer existing patterns and helpers
- avoid unrelated rewrites
- preserve user changes
- update docs when behavior or workflow memory changes

## 6. Reviewer Pass

After implementation, switch to reviewer mode before final response.

Review technical quality:

- diff scope and accidental unrelated edits
- TypeScript/build/lint/test failures
- API contracts, validation, auth, authorization, and serialization
- database/query behavior and migrations if touched
- security, secrets, uploads, logs, permissions, and sensitive data exposure
- performance, duplication, maintainability, and file-size pressure
- docs accuracy and dev-notes when meaningful

Review user experience:

- whether the workflow is understandable without explanation
- whether the page tells users what to do next
- whether client/admin/employee paths are easy and efficient
- whether forms, buttons, labels, states, and errors are clear
- whether mobile and desktop layouts are usable
- whether important buttons and navigation controls were clicked through

For UI work, use Browser/in-app browser when practical. Do not claim the flow is good from code alone.

Manual audit scope:

- **Affected-flow audit**: use for focused UI, route, workflow, form, dashboard, auth, or client-facing changes. Click every changed route, important button/control, form path, dialog, state transition, and navigation path.
- **Full-feature audit**: use for cross-cutting shell, navigation, theme, auth, role, routing, shared-state, dashboard, release/publish, broad redesign, or explicit "all features" requests. Walk the primary admin, employee, client, and anonymous/auth workflows across desktop and mobile where practical.
- **Not applicable**: use only for docs-only, non-rendered backend, CLI-only, or unreachable-app work. State why and use the best fallback verification.

Completion is not allowed when material reviewer findings are known and fixable.

## 7. Fix Cycle

If the reviewer pass finds issues:

1. Classify severity.
2. Replan only the needed fix.
3. Implement the fix.
4. Rerun focused verification.
5. Rerun the reviewer pass on the changed area.

Repeat while meaningful findings remain and progress is possible. Stop and report only when:

- no material findings remain
- the user requests a pause
- verification is blocked by missing services, credentials, unavailable tooling, or unsafe action requirements
- the same blocker repeats and cannot be resolved without user input

## Review Output

In the final response, include:

- implementation summary
- edited files
- skills/tools used
- verification commands and browser/manual paths checked
- reviewer findings fixed
- remaining risks or blockers

Keep the final response concise. Do not dump raw logs unless requested.
