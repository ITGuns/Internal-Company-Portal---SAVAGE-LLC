# Frontend

Next.js 16 + React 19 frontend for the Internal Company Portal / MyDeskii app.

## Quick Start

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```powershell
npm test
npm run lint
npm run build
npm run dev
npm run start
```

## Main Areas

- `src/app` contains authenticated app routes such as dashboard, tasks, daily logs, payroll, chat, files, operations, and auth pages.
- `src/components` contains reusable shell, form, modal, card, button, payroll, task, chat, and file-directory UI.
- `src/context` and `src/contexts` contain shared providers for user/session, sockets, query client, and exchange-rate state.
- `src/lib` contains API helpers, dashboard/deep-link helpers, role helpers, design tokens, and pure workflow utilities.
- `tests` contains focused Node-based behavior tests for frontend utility logic.

## Project Docs

Use the root docs as the source of truth:

- `PRODUCT.md` for product audience, purpose, and principles.
- `DESIGN.md` for visual direction and component rules.
- `docs/frontend-redesign-plan.md` for the current redesign sequence.
- `docs/architecture.md` and `docs/features.md` for current structure and feature behavior.
- `docs/dev-notes.md` for recent implementation decisions and verification history.

## Notes

- The frontend is API-backed and authenticated; do not rely on client-side hiding for permission-sensitive behavior.
- Keep page files readable by moving repeated UI into components and reusable behavior into `src/lib` or hooks.
- Follow the restrained MyDeskii product direction in `PRODUCT.md` and `DESIGN.md` for new UI work.
