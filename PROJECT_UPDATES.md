# Project Updates & Placeholders

Purpose: single source of truth for progress updates, decisions, and environment/placeholders.

---

## How to use
- Add a dated entry to **Progress Log** for every meaningful change (design, infra, code, decisions).
- Keep placeholders updated when secrets, IDs, or external integration details change.
- Link related files, PRs, or tickets in the `Link` column.

---

## Progress Log
| Date | Author | Area | Update | Status | Link |
|---|---|---|---|---|---|
| 2026-01-27 | Architect | Planning | Created initial system architecture outline and TODO list | Done | |

Add entries as the project evolves. Keep rows concise and link to PRs or files where appropriate.

---

## Placeholders (update securely, do NOT commit secrets)
- GOOGLE_CLIENT_ID: <placeholder>
- GOOGLE_CLIENT_SECRET: <placeholder>
- GOOGLE_SERVICE_ACCOUNT_JSON_PATH: <path or secret store key>
- DISCORD_CLIENT_ID: <placeholder>
- DISCORD_CLIENT_SECRET: <placeholder>
- DISCORD_WEBHOOK_URLS:
  - department-ops: <placeholder>
  - general-announcements: <placeholder>
- DRIVE_BASE_FOLDER_ID (company root): <placeholder>
- DEPARTMENT_DRIVE_FOLDER_IDS: (map department -> folder_id)
- DATABASE_URL: <use env / secret manager>
- REDIS_URL: <use env / secret manager>
- JWT_SECRET: <secret store>
- REFRESH_TOKEN_SECRET: <secret store>
- SENTRY_DSN: <optional>

Notes:
- Never paste real secrets in this file; instead reference your secret manager keys (Vault/Azure Key Vault/GCP Secret Manager).

---

## Decision Log
| Date | Decision | Rationale | Owner | Related Files |
|---|---|---|---|---|
| 2026-01-27 | Use PostgreSQL + Redis + BullMQ for MVP | Balanced operational complexity and scalability | Architect | PROJECT_PLAN.md |

Add decisions here to preserve context and reasoning for later reviews.

---

## Workflow Definitions / DSL Placeholders
- Store JSON workflow definitions under `./workflows/` (example filename: `workflows/expense-approval.json`).
- Example keys to include: `id`, `name`, `departmentId`, `triggers`, `conditions`, `actions`, `approvals`, `timeouts`.

Example placeholder snippet:
```
{
  "id": "example-approval",
  "name": "Example Approval",
  "departmentId": "<dept-id> | null",
  "triggers": ["task.moved"],
  "conditions": { "to_status": "Review" },
  "actions": [ { "type": "create_approval", "reviewers": ["role:manager"] } ]
}
```

---

## Templates

Meeting note template:
- Date:
- Attendees:
- Summary:
- Action items:

Change/Release template:
- Version:
- Date:
- Summary:
- Impact:
- Rollback plan:

---

## TODO / Next Steps (short list)
- Scaffold repo skeleton (frontend + backend)
- Create `workflows/` folder and add example workflow JSON
- Add CI skeleton and environment provisioning docs

---

## Changelog
- 2026-01-27: Created file and initial project TODOs.

---

## Owners / Contacts
- Architecture: <name/email>
- DevOps: <name/email>
- Product: <name/email>

---

Keep this file lightweight. For secrets, use a secret manager and reference keys here instead of storing values.
