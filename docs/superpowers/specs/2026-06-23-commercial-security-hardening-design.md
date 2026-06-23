# Commercial Security Hardening Design

## Goal

Close the pre-commit commercial-readiness findings without changing public workflows: uploads remain available through authenticated Deskii URLs, refresh sessions remain compatible in development, realtime presence works across backend instances, and load tests measure application capacity instead of the login limiter.

## Architecture

### Upload ownership

Add an additive `StoredUpload` model. The upload route creates a randomized object key and metadata owned by the authenticated uploader. A stored upload may be linked to exactly one `ClientAsset` or `FileFolder` record.

Download authorization uses existing business boundaries:

- the uploader can read an unlinked upload;
- operations users with client-management access can read linked client assets;
- active client members can read linked assets only when `visibleToClient=true`;
- internal users can read linked file-directory uploads only when their existing directory role can read the folder department;
- unrelated authenticated users receive `404` so object existence is not disclosed.

Storage drivers receive only randomized internal object keys. Database creation failures remove the just-written object to avoid orphaning it.

### Sessions and readiness

Refresh-session schema compatibility remains available for development and temporary previews. Production commercial mode fails closed when `RefreshSession` persistence is missing.

`/health` remains a liveness/dependency summary and returns `503` when the database is unavailable. `/ready` verifies the database and the commercial-mode prerequisites required before routing traffic.

Commercial configuration accepts only `sendgrid` or `smtp`. Paid deployment templates enable commercial mode explicitly; preview/serverless documentation keeps it disabled.

### Realtime presence

Socket.io rooms are the source of truth for online presence. `fetchSockets()` and room membership use the configured adapter, so online-user queries and disconnect decisions include every backend instance. The existing in-memory user map is removed.

### Load testing

The commercial scenario consumes a CSV pool of unique approved test users. Each VU logs in once, reuses its token, and executes a bounded mix of employee read paths. A separate auth-capacity scenario tests login intentionally. Thresholds remain explicit and the script refuses to run the 1,000-user profile without enough unique accounts.

## Error Handling

- Upload validation failures return `400`; missing auth returns `401`; forbidden or missing objects return `404`.
- Storage and metadata failures return safe `500` responses and structured logs without object contents or credentials.
- Commercial startup throws before listening when required persistence or provider configuration is invalid.
- Readiness failures return `503` with dependency names but no secrets.

## Testing

- Route tests cover owner, wrong-user, internal department, privileged client operations, visible client member, hidden client asset, and missing-object reads.
- Storage tests cover randomized keys and cleanup behavior.
- Refresh-session tests cover development compatibility and commercial fail-closed behavior.
- Readiness tests cover HTTP status and provider allowlisting.
- Socket tests cover adapter-aware presence helpers without requiring a live Redis service.
- Load-script checks validate profile selection and user-pool requirements.
- Full repository tests, builds, audits, Prisma checks, Compose/YAML validation, and diff review remain release gates.

## Operational Boundary

Repository hardening cannot provision vendor accounts or prove 1,000-user capacity by itself. Launch still requires managed PostgreSQL, Redis, S3-compatible storage, email credentials, monitoring, backups, and a successful production-like staging load test.
