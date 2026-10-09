# Payroll and time v2 spec (2026-10-08)

Owner decision (Pol, 2026-10-08): support all three pay bases, selectable per
employee, and make every payroll figure editable (CRUD) by admin and payroll
roles. Employees only clock in and out; every correction goes through an
approval. Overtime is unpaid unless approved.

This document is the contract between the backend and frontend work. Keep it
current when the implementation drifts.

## Rules

1. Billable cap: `EmployeeProfile.maxBillableHoursPerDay` (default 8). Hours
   above the cap on a day are overtime. Days are bucketed in
   `PAYROLL_TIMEZONE` (env, default `Asia/Manila`, fall back to
   `DAILY_DIGEST_TIMEZONE`), never UTC. Pay periods follow the same zone:
   new periods start at midnight and end at 23:59:59 in `PAYROLL_TIMEZONE`
   (`semiMonthlyPeriodForDay` and `periodBoundsFromInput` in
   `payroll.calculations.ts`). Older rows stored at UTC midnight are read
   through `periodStartDayKey` and `periodEndDayKey`, which return the same
   calendar day for both, so no backfill is needed.
2. Overtime is paid only when an `OvertimeRequest` for that day is approved.
   Paid OT hours for a day = `min(approvedHours, actualHours - cap)`.
   OT pay = paid OT hours x hourly rate x `overtimeMultiplier`.
3. Pay basis per employee (`EmployeeProfile.payBasis`):
   - `hourly_from_monthly` (default, current behaviour): hourly rate =
     baseSalary / divisor days / cap, per existing `payrollScheme` rules.
     Gross = billable hours x rate + OT pay.
   - `fixed_monthly`: gross = baseSalary x periodFraction + OT pay.
     periodFraction = 0.5 for a semi-monthly window (1-15, 16-end), 1 for a
     whole calendar month, else periodCalendarDays / daysInMonth(periodStart).
     Hourly rate for OT uses the `hourly_from_monthly` formula.
   - `hourly_rate`: rate = `EmployeeProfile.hourlyRate`. Gross = billable
     hours x rate + OT pay. baseSalary ignored.
4. Employees cannot create, edit or delete time entries directly. They clock
   in/out, and file a `TimeEntryAdjustmentRequest` for corrections. Roles in
   `MANAGEMENT_ACCESS_ROLES` or `PAYROLL_MANAGEMENT_ROLES` edit directly and
   review requests.
5. Payslips in a draft period can be edited (line items replaced, gross and
   net recomputed, note required) or deleted by payroll-management roles.
   Processed (locked) periods are read-only: respond 409.
6. Removing a member = deactivate (`User.status = "inactive"`). Inactive users
   cannot log in, refresh a session, or pass `requireAuth`. Reactivate
   restores `active`. Hard delete stays admin-only, needs `?confirm=hard`,
   and is refused with 409 while the user has any payslip.
7. New accounts come only from admin invitation (`POST
   /users/onboarding-invitations`) or admin approval. Google sign-in for an
   unknown email creates the user as `pending` / `isApproved: false` and the
   login is refused with the existing "awaiting approval" message. Emails in
   `ADMIN_EMAILS` and users that already exist are unaffected.
8. Scheduler auto-payslip targets the draft period that most recently ended
   (`endDate < now`), not the newest period.
9. Payslip generation never overwrites a hand edit silently. Single generate
   (`POST /payroll/periods/:periodId/generate/:userId`) on a payslip with
   `editedAt` set returns 409 unless the body has `force: true`; a forced
   regenerate clears the edit record. Bulk generate (`generate-all`) skips
   edited payslips and reports them as skipped. When the body supplies
   `hoursWorked` (manual path), it replaces only the regular-hours (or fixed
   salary) line; approved and unapproved overtime lines are still added.
   Deductions sent in the body are applied on both the manual and automatic
   paths.

## Schema additions (Prisma, one migration `202610080001_payroll_time_v2`)

```prisma
// EmployeeProfile, new fields
payBasis           String @default("hourly_from_monthly") // hourly_from_monthly | fixed_monthly | hourly_rate
hourlyRate         Float?
overtimeMultiplier Float  @default(1.25)

model OvertimeRequest {
  id           String    @id @default(cuid())
  userId       String
  workDate     DateTime  // midnight in PAYROLL_TIMEZONE, stored as UTC instant
  hours        Float     // the employee's original ask, never changed by review
  approvedHours Float?   // set on approval; pay reads approvedHours ?? hours
  reason       String?
  status       String    @default("pending") // pending | approved | rejected
  reviewedById String?
  reviewedAt   DateTime?
  reviewNote   String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  user         User      @relation("OvertimeRequests", fields: [userId], references: [id], onDelete: Cascade)
  reviewedBy   User?     @relation("OvertimeReviews", fields: [reviewedById], references: [id], onDelete: SetNull)
  @@index([userId, workDate])
  @@index([status])
}

model TimeEntryAdjustmentRequest {
  id            String    @id @default(cuid())
  userId        String
  timeEntryId   String?   // null when action = create
  action        String    @default("update") // create | update | delete
  proposedStart DateTime?
  proposedEnd   DateTime?
  previousStart DateTime? // entry times captured at approval of update/delete
  previousEnd   DateTime?
  reason        String
  status        String    @default("pending") // pending | approved | rejected
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  user          User      @relation("AdjustmentRequests", fields: [userId], references: [id], onDelete: Cascade)
  reviewedBy    User?     @relation("AdjustmentReviews", fields: [reviewedById], references: [id], onDelete: SetNull)
  timeEntry     TimeEntry? @relation(fields: [timeEntryId], references: [id], onDelete: SetNull)
  @@index([userId, status])
  @@index([status])
}

// Payslip, new fields
editedById String?
editedAt   DateTime?
editNote   String?
```

Payroll item types: `regular_hours`, `fixed_salary`, `overtime_approved`,
`overtime_pending` (amount 0, informational, described as "Unapproved
overtime, not paid"), `allowance`, `deduction`,
`adjustment`. Net = sum of all item amounts (deductions are negative).

## Backend routes

All under the existing `/payroll`, `/users` and `/employees` routers. Auth as noted.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /payroll/overtime-requests | self | `{ workDate: "YYYY-MM-DD", hours, reason? }`. 400 if hours > pending OT that day. |
| GET | /payroll/overtime-requests | self: own; management/payroll: all | `?status=&userId=&from=&to=` |
| POST | /payroll/overtime-requests/:id/approve | management or payroll roles | `{ note? }`, may approve fewer hours; stored in `approvedHours`, `hours` unchanged |
| POST | /payroll/overtime-requests/:id/reject | same | `{ note? }` |
| DELETE | /payroll/overtime-requests/:id | owner or management, pending only | 409 once reviewed |
| POST | /payroll/adjustment-requests | self | `{ action, timeEntryId?, proposedStart?, proposedEnd?, reason }` |
| GET | /payroll/adjustment-requests | same split as OT | |
| POST | /payroll/adjustment-requests/:id/approve | management or payroll | applies the change to TimeEntry in one transaction, appends a correction note |
| POST | /payroll/adjustment-requests/:id/reject | same | |
| DELETE | /payroll/adjustment-requests/:id | owner or management, pending only | 409 once reviewed |
| POST/PATCH/DELETE | /payroll/entry[/:id] | management or payroll only | employees get 403 `{ message: "Submit an adjustment request" }` |
| PATCH | /payroll/payslips/:id | payroll management | `{ items: [{type, description, amount}], note }` -> replace items, recompute gross/net, set editedBy/At/Note. 409 if period processed. |
| DELETE | /payroll/payslips/:id | payroll management | 409 if period processed |
| GET/POST | /payroll/config/:userId | unchanged | now accepts `payBasis`, `hourlyRate`, `overtimeMultiplier` (privileged only, via `filterPayrollProfileUpdate`) |
| GET | /payroll/preview-calculation | unchanged | response adds `payBasis`, `overtimeApprovedHours`, `overtimePendingHours`, `overtimePay` |
| POST | /payroll/periods/:periodId/generate/:userId | unchanged | 409 on a hand-edited payslip unless `{ force: true }`; see rule 9 |
| POST | /payroll/periods/:periodId/generate-all | unchanged | skips hand-edited payslips; see rule 9 |
| GET | /employees/deployed | unchanged | each row now includes `payBasis`; `?includeInactive=true` also returns deactivated members |
| POST | /users/:id/deactivate | admin or operations_manager | sets status inactive, revokes refresh sessions |
| POST | /users/:id/reactivate | same | |
| DELETE | /users/:id | admin only | needs `?confirm=hard`; 409 while payslips exist |

Permission helper to add: `canReviewTimeRequests(roles)` = management or
payroll roles. Mirror it in `frontend/src/lib/role-access.ts`.

## Frontend

- `PayrollSetupModal`: pay basis select (three options with one-line help),
  hourly rate field (shown for `hourly_rate`), OT multiplier field.
- Time clock and calendar: employees see clock in/out, their entries
  read-only, "Request a correction" (opens adjustment modal) and, on a day
  over the cap, "Request overtime". Managers keep direct edit.
- Payroll calendar page: new "Approvals" tab (management and payroll roles)
  with two queues, OT and corrections, approve/reject with note, filter by
  status and person. Badge count on the tab.
- Payslips tab: edit (line items CRUD, note required) and delete on draft
  payslips. Locked periods show the lock reason.
- My payslips: show overtime approved and pending lines and the pay basis.
- Employee overview tab: "Add employee" opens the admin invite flow (role
  picker + setup link), not the public pending endpoint. "Remove" becomes
  Deactivate with a Reactivate toggle for inactive users; hard delete is a
  separate admin-only action behind a typed confirmation.
- Copy: plain sentences, no em dashes, no exclamation marks.

## Tests

Backend (`backend/tests`, node:assert style, no DB): pay math for each basis,
OT paid hours cap at actual, periodFraction, scheduler period selection, route
guards for every new route, OAuth unknown email -> pending, inactive user
refused at login/refresh/requireAuth.

Frontend (`frontend/tests`): role-access review helper, OT and adjustment
form validation, payslip edit recompute.

## Deploy note

The Vercel build command runs `prisma migrate deploy` on Production builds
only (guarded by `VERCEL_ENV`), using `DIRECT_DATABASE_URL` from the Vercel
project env. Merging to `main` therefore migrates the database before the new
code goes live. A failed migration fails the build and the previous deploy
stays up. Preview builds skip the migration. Nobody needs a local
`backend/.env.production` for routine deploys.

Manual fallback, from a clone that has `backend/.env.production` with a
direct (non-pooled) database URL:

```bash
npm --prefix backend run prisma:deploy:production
```
