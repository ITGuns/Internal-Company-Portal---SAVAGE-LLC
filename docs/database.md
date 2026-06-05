# Database Notes

## Prisma And Migrations

The backend uses Prisma with PostgreSQL.

Current additive migrations related to the recent release:

- `202605210001_task_sessions_signup_requests`
- `202605210002_task_creator`

Migration SQL is now tracked. Do not ignore migration SQL files or rely on local schema drift.

Before changing schema:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

Use `npm run prisma:migrate` for local development migrations and `npm run prisma:deploy` for deployment migration application.

## Client Service Tier Presets

`ClientServiceTier` stores the client account tier catalog used by Client Operations account and billing views.

Default SOP-derived tier presets are maintained in `backend/src/clients/client-service-tier-presets.ts` and can be applied with:

```powershell
cd backend
npm run seed:client-service-tiers
```

The preset seed upserts by tier `name`, updates matching preset descriptions/prices/ranks, and leaves unrelated custom tiers untouched. No schema migration is required for the current tier catalog.

## Client Website Work Type

`ClientOrganization.websiteWorkType` stores the intake choice for website work:

- `existing_site_improvement` when the client has a website the team will improve.
- `new_build` when the team will build a new website or rebuild from scratch.

The field is nullable so existing client organizations are not backfilled into an inaccurate category.

## Identity And Authorization

`User` is the account record and owns authentication fields, roles, tasks, logs, time entries, notifications, and related profile data.

`UserRole` stores active authorization.

- Signup should not create active `UserRole` records.
- Approval creates an active role from the requested signup fields when present.
- Role checks in controllers and permission helpers should read active `UserRole` data, not requested signup fields.

`Department` groups users, tasks, and available role options.

`AvailableRole` stores backend-managed role options.

- Roles may be department-specific through `departmentId`.
- Global roles have no department.
- `(name, departmentId)` is unique.
- Frontend role dropdowns should use department `availableRoles` returned by the backend.

## Signup Approval

`EmployeeProfile.requestedRole` and `EmployeeProfile.requestedDepartmentId` store signup intent separately from active authorization.

- Signup writes requested values only.
- Approval converts the requested values into an active `UserRole`.
- Missing requested role or department leaves approval from creating a role assignment.

Payroll-sensitive fields also live on `EmployeeProfile`.

- Compensation, currency, payment frequency, bank account, and tax ID are protected fields.
- Directory serializers must not expose sensitive payroll/profile fields.

## Task Tracking

`Task.completedAt` stores the server-side completion timestamp.

- Set when a task first moves to `completed`.
- Cleared when a task moves away from `completed`.
- Indexed for completion-date reporting.

`Task.createdById` stores the requester/creator separately from assignment.

- Links to `User.id` through the `TaskCreator` relation.
- Uses `onDelete: SetNull` so historical tasks survive user removal.
- Indexed for creator-scoped visibility checks.
- `Task.assigneeId` remains the current task owner/worker through the `TaskAssignee` relation.

`TaskWorkSession` stores timer work history.

- `taskId` links to `Task` with cascade delete.
- `userId` links to `User` with cascade delete.
- `startedAt`, `endedAt`, and `durationSeconds` capture a closed timer segment.
- Indexed by task, user, and start time.

## Daily Logs

`DailyLog` stores employee work summaries by date.

- `tasks` is a JSON field used by the frontend for manual entries and Task Tracking imports.
- Imported task entries use stable source IDs such as `task:<taskId>` to prevent duplicate imports.
- Completed task imports should be based on `Task.completedAt`; in-progress assigned tasks can still appear as active work suggestions.
- Review-stage task suggestions are UI review helpers and should remain separate from employee self-report imports unless explicitly added by the user.

## Payroll

`TimeEntry` stores clock-in/clock-out and manual time-entry records.

- `clockOut` may be null for an open entry.
- Manager audit views use existing `userId`, `start`, and `end` filtering rather than a separate audit table.
- Correction notes are currently stored in the entry notes/context, not in a durable immutable audit-log table.

`PayrollPeriod`, `Payslip`, and `PayrollItem` store generated payroll results.

- Period generation is restricted through payroll controller permissions.
- Payslip reads are self-service by default and privileged for management review.

`PayrollEvent` stores calendar-level payroll events.

## Collaboration And Files

Chat, announcements, notifications, uploads, and file-directory records are part of the same Prisma schema.

- Chat room authorization depends on conversation participation.
- File-directory permissions are enforced in the controller/service layer; do not expose unsafe file tree mutations from unauthenticated routes.
- Uploaded files are served through authenticated `/api/uploads/files/:filename` routes.
- Uploaded file metadata and served files should be treated as authenticated portal data unless a route explicitly makes them public.
