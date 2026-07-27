# Bring-up + #W walkthrough (run-book)

Goal: apply the Gemfield migration, seed mock data, run the app, and click the wizard through
(#W). Windows / PowerShell.

> **#W venue = a Supabase branch / staging copy** (chosen because prod has real clients). The
> wizard creates real tickets + uploads, so do NOT run #W or the mock seed against the production
> database. Two ways to get an isolated DB:
>
> - **Supabase branch** (recommended): in the Supabase dashboard create a *branch* of the project;
>   it gives you an isolated copy with its own connection strings. Point the steps below at the
>   branch's **direct** (5432) URL. The mock seed's non-local guard requires
>   `ALLOW_GEMFIELD_SEED_NONLOCAL=true` — only ever set that against a branch/staging DB.
> - **Local Postgres**: run Postgres locally (Docker or native) and use the local `.env` below as-is
>   (the guard passes automatically for localhost).
>
> Everything else is identical for both.

## 1. Backend env (`backend/.env`)

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/deskii?schema=public
DIRECT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/deskii?schema=public
JWT_SECRET=local-dev-jwt-secret-change-me
REFRESH_TOKEN_SECRET=local-dev-refresh-secret-change-me
SEED_DEFAULT_PASSWORD=LocalDev-Password-123
PORT=4000
# Optional - only needed to exercise the progress webhook / mock driver:
GEMFIELD_WEBHOOK_SECRET=local-webhook-secret
# Deep link in the ticket receipt email (optional):
APP_PUBLIC_URL=http://localhost:3000
```

> Port note: the frontend proxy defaults `BACKEND_URL` to `http://localhost:4000`, so run the
> backend on `PORT=4000` (above) — or set the frontend `BACKEND_URL` to match your backend port.

## 2. Apply schema + seed (from `backend/`)

```powershell
npm install                       # if not already
npm run prisma:generate
npm run prisma:deploy             # applies 202607250001_gemfield_bridge (+ all prior)
npm run prisma:seed               # departments, roles, tiers, demo staff users
npm run seed:gemfield             # Gemfield mock mode: entitled org, project mid-build, tickets
```

`seed:gemfield` prints the logins. Password = `SEED_DEFAULT_PASSWORD` for all of them:

| Login | Role | Use for |
|---|---|---|
| `client.gemfield@example.test` | Gemfield client (Acme Roofing) | **#W wizard walkthrough** |
| `client.plain@example.test` | Plain client (Plain Co) | prove the module is **absent** |
| `gemfield.dev@example.test` | Gemfield-dev staff | P4 control panel (later) |

## 3. Frontend env (`frontend/.env.local`)

```ini
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 4. Run

```powershell
# terminal 1
npm --prefix backend run dev
# terminal 2
npm --prefix frontend run dev      # http://localhost:3000
```

## 5. #W walkthrough (the gate)

Sign in as **`client.gemfield@example.test`** → you land on `/client`. Verify, on a phone-width
viewport where you can:

- [ ] The **"Your website build"** timeline shows phases with `intake_received…design` done and
      **Build** in progress; a **Preview** link appears (staging is exposed from `client_review`+ —
      to see it, advance the phase in step 6).
- [ ] A **"Start a request"** button is visible. Open it and click through:
      category card → narrowing dropdowns → attach a **photo from the phone** → description → review → **Send**.
- [ ] You get a **`TK-XXXXXX`** reference and (if email is configured) a receipt with a
      "reply in Deskii" link.
- [ ] The wizard footer always shows **Call support / Request a callback / Request a developer**;
      "Request a developer" files immediately as high priority.
- [ ] **Target: under 2 minutes, no help.** Note any friction — that feedback is the point of #W.

Then sign in as **`client.plain@example.test`** and confirm **none of the Gemfield module appears**
anywhere (absent, not grayed).

## 6. Mock webhook driver (optional — see the timeline move live)

With `GEMFIELD_WEBHOOK_SECRET` set (step 1), advance the build phase and watch the client timeline
update:

```powershell
$env:GEMFIELD_API_URL="http://localhost:4000"
$env:GEMFIELD_WEBHOOK_SECRET="local-webhook-secret"
node "scripts/gemfield-progress-push.mjs" --gf-id GF-2026-0147 --phase qa --status complete --note "Quality checks done"
node "scripts/gemfield-progress-push.mjs" --gf-id GF-2026-0147 --phase client_review --note "Ready for your review"
```

Re-running the same phase is a no-op (idempotent). After `client_review`, the **Preview** link
appears on the client timeline.

## 7. When #W passes

Record the result (and any UX fixes) in `STATUS.md`, then it's clear to build **P4** (the developer
control panel — sign in as `gemfield.dev@example.test`). If you hit issues, capture them and I'll fix
before P4.
