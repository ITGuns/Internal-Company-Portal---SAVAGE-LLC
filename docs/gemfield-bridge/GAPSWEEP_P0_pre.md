# GAP_SWEEP — P0 (pre)

Checklist run before requesting #B. ✓ = verified against source, ⚠ = watch item carried into build.

- ✓ **Existing-convention drift** — confirmed conventions to follow: normalized string-slug roles (no enum), `String`+validation-Set for statuses (no Prisma enum), hand-authored `YYYYMMDDNNNN_snake_case` migrations (expand-only), controller `router()` + `authenticateToken`/`requireRole` guards, `apiFetch('/clients/...')` on the client (portal does NOT use TanStack Query — that's staff-only).
- ✓ **Entitlement model** — extends `ClientOrganization` + reuses `getAccessContext`/`clients.access.ts`; no bespoke auth check introduced. ⚠ Carry: every bridge query must include org + `gemfieldClient`.
- ✓ **Notification reuse** — `notificationService.notifyUser`/`broadcastDataChange`; no second notifier. ⚠ Ephemeral — persist via `GemfieldMilestone`/`ClientActivity`.
- ✓ **File reuse** — `StoredUpload` + `UploadsService` + `canReadStoredUpload`; new `ClientTicketAttachment` join only. ⚠ EXIF stripping absent (D4).
- ✓ **Internal-note safety** — mechanism exists (`visibility` + serializers); ⚠ every new endpoint must use the client-vs-management serializer; compose default → internal.
- ✓ **Migration safety** — additive only on live shared tables; up/down test planned on schema copy.
- ✓ **Copy tone** — client-facing strings warm/plain, no internal jargon (never "BLOCKERS.md" → "we're waiting on your photos").
- ⚠ **Open decisions** — D1/D2 (#B), D4 (EXIF), D5 (board DnD) — see DECISIONS.md.
