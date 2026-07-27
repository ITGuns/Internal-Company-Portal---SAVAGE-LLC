# Gemfield E2E (Playwright) — ready to wire

These specs cover the guide's P5 browser E2E: the wizard end-to-end (desktop **and** mobile
viewport), the entitlement "absent for plain clients" check, and the control-panel default-internal
guardrail. They are **authored but not yet run** — Playwright isn't installed in the build, and the
app must be running with the mock seed. Wire them like this:

```powershell
# 1. Install Playwright in the frontend (one time)
cd "c:\Users\USER\Desktop\JOIN DESKII\deskii updated QA\frontend"
npm i -D @playwright/test
npx playwright install chromium

# 2. Copy these files into an e2e folder Playwright will pick up
New-Item -ItemType Directory -Force e2e | Out-Null
Copy-Item ..\docs\gemfield-bridge\e2e\*.ts e2e\

# 3. Exclude e2e from the app tsconfig so the @playwright/test import doesn't affect `next build`
#    In frontend/tsconfig.json add "e2e" to "exclude".

# 4. With the app running (backend + frontend) and the DB seeded (npm run seed:gemfield):
npx playwright test        # runs desktop + mobile projects
```

Notes:
- The specs assume the seed logins (`client.gemfield@…`, `client.plain@…`, `gemfield.dev@…`) and
  password `Deskii-Local-2026` (override with `E2E_PASSWORD` / `E2E_BASE_URL`).
- Selectors target the Gemfield components' roles/labels; only the shared `login()` helper may need
  tuning to your actual login form.
- The wizard attachment step is left as a `// see README` note — add a fixture image and
  `setInputFiles` on the file input to cover the "photo from a phone" path.
- For CI, add a job that boots the app + a seeded test DB, then runs `npx playwright test`.

What's already verified WITHOUT the browser (so these are additive, not the only coverage):
- Backend API E2E against live Supabase (progress, wizard submit, entitlement 404s, dev pipeline).
- Unit: entitlement matrix, internal-note leak (API shape), webhook idempotency, SLA, digest, EXIF.
