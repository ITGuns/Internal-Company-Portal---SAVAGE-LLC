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
   (`payrollPeriodForDay` and `periodBoundsFromInput` in
   `payroll.calculations.ts`; period length under "Pay periods" below).
   Older rows stored at UTC midnight are read through `periodStartDayKey`
   and `periodEndDayKey`, which return the same calendar day for both, so no
   backfill is needed.
2. Overtime is paid only when an `OvertimeRequest` for that day is approved.
   Paid OT hours for a day = `min(approvedHours, actualHours - cap)`.
   OT pay = paid OT hours x hourly rate x `overtimeMultiplier`.
3. Pay basis per employee (`EmployeeProfile.payBasis`):
   - `hourly_from_monthly` (default, current behaviour): hourly rate =
     baseSalary / divisor days / cap, per the profile's `payrollScheme` row
     (see "Salary divisor schemes and credited days").
     Gross = credited hours x rate + OT pay.
   - `fixed_monthly`: gross = baseSalary x periodFraction + OT pay.
     periodFraction = 0.5 for a semi-monthly window (1-15, 16-end), 1 for a
     whole calendar month, else periodCalendarDays / daysInMonth(periodStart).
     Hourly rate for OT uses the `hourly_from_monthly` formula.
   - `hourly_rate`: rate = `EmployeeProfile.hourlyRate`. Gross = credited
     hours x rate + OT pay. baseSalary ignored. Credited hours equal billable
     hours unless the scheme caps credited days (2026-10-20).
4. Employees cannot create, edit or delete time entries directly. They clock
   in/out, and file a `TimeEntryAdjustmentRequest` for corrections. Roles in
   `MANAGEMENT_ACCESS_ROLES` or `PAYROLL_MANAGEMENT_ROLES` review requests.
   Since 2026-10-14 only `PAYROLL_MANAGEMENT_ROLES` (full access included) edit
   time directly and backfill past days (`POST /payroll/entries/backfill`, see
   `docs/api.md`); plain managers keep review rights only. Since 2026-10-17 a
   backfill end time earlier than the start time ends on the next day (night
   shifts); the entry counts on its start day, and equal times are refused.
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

## Salary divisor schemes and credited days (2026-10-20)

Owner request: "make everything CRUD instead of fixed dropdowns; the payroll
manager says 22 days are the maximum credited days". The salary divisor
schemes, employment types and pay frequency labels are rows that payroll
roles manage in Payroll options. Currency stays a fixed list.

- `PayrollScheme { key, name, kind, value, maxCreditedDays, isDefault,
  sortOrder, archivedAt }`. `EmployeeProfile.payrollScheme` stores the `key`
  (no foreign key, no data rewrite). Migration `202610200002_payroll_schemes`
  seeds the old values under their old keys (`weekdays` "Weekdays of month",
  `flat_30` "Flat 30 days", `flat_20` "Flat 20 days", `flat_160_hours` "Flat
  160 hours") plus `fixed_22_days` "22 credited days" (kind `fixed_days`,
  value 22, maxCreditedDays 22), the default for new profiles. The column
  default is `fixed_22_days`.
- `PayrollOption { category, value, label, sortOrder, isDefault, archivedAt }`
  for `employment_type` (Full-Time default, Part-Time, Contractor labelled
  "Contractor / Freelance", Intern) and `payment_frequency` (Monthly default,
  Semi-Monthly, Bi-Weekly, Weekly). Profiles store `value`.
- Divisor (`getPayrollRateContext`, `schemeDivisor` in `payroll-schemes.ts`):
  `fixed_days` divides the monthly salary by `value` days, `fixed_hours` by
  `value` hours, `weekdays` by the weekdays of the period's month. Hourly =
  daily rate / `maxBillableHoursPerDay`. The return shape only grew
  (`payrollSchemeName`, `payrollSchemeKind`, `maxCreditedDays`);
  `payrollSchemeLabel` stays and holds the row name.
- Credited-days cap: on `hourly_from_monthly` and `hourly_rate`, paid regular
  hours stop at `maxCreditedDays x maxBillableHoursPerDay` per calendar month
  (2 decimals). A whole-month period gets that cap. A period inside one month
  that starts after the 1st (a 16-end half, a custom range) gets the month cap
  minus the billable hours of that month before it, so an uneven split such
  as March 2026 (10 and 12 weekdays) loses nothing. Only a period that spans
  two months falls back to `cap x periodFraction`
  (`creditedHoursCapForPeriod` in `payroll.service.ts`). Hours above the cap
  become a payslip line of type `uncredited_hours`, amount 0, "Beyond 22
  credited days, not paid (8 h)". They are not overtime; approved overtime is
  paid as before. `fixed_monthly` pays the salary whatever the hours, so no
  cap applies. Example: 23 weekdays of 8 h = 184 billable h, 176 credited, 8
  uncredited.
- Business effect to confirm with the payroll manager: the default divides
  the salary by 22 days and credits at most 22 days, so on
  `hourly_from_monthly` full attendance in a month with fewer than 22
  weekdays (February 2027 has 20) pays below the monthly salary, and never
  above it. Existing profiles keep their old (uncapped) scheme until someone
  switches them in Set Up Payroll.
- Line wording names the row: "Billable work hours (176 h credited, 184 h
  billable, 184 h tracked) - 22 credited days". Without a cap hit the old
  "(88 h billable, 90 h tracked)" form stays. On `hourly_rate` the suffix is
  "Hourly rate, <scheme name>" when the scheme has a cap, else "Hourly rate".
  A hand-entered hours override drops the uncredited line.
- Resolution: an unknown or empty key resolves to the default row and is
  logged once per key; archived rows still resolve for the profiles on them;
  when the table cannot be read, the built-in copy (`BUILT_IN_PAYROLL_SCHEMES`,
  same keys and math) applies.
- Defaults: every path that creates a profile (sign-up, employee create,
  invitation, lazy create on `GET /payroll/config/:userId`) writes the current
  default scheme, employment type and pay frequency, read before its
  transaction. The column defaults are the fallback when the lists cannot be
  read.
- List rules: names 2 to 60 characters, unique in their list (any case);
  `kind` is `weekdays`, `fixed_days` or `fixed_hours`; fixed kinds need a value
  of 10 to 31 days or 40 to 744 hours (lower values are almost surely typos
  that would multiply everyone's rate); `maxCreditedDays` 1 to 31 or null. A
  scheme `key` is a slug of the name made on create; an option `value`
  is set on create (defaults to the label). Neither changes afterwards.
  Exactly one default per list: setting one clears the old one in the same
  serializable transaction (a lost race answers 409). The default cannot be
  archived or deleted (409). A row any profile stores cannot be deleted (409,
  "Archive it instead"); it can be archived. Archived rows cannot be newly
  chosen on a profile (400) but stay on the profiles that have them.
- Profile updates (`POST /payroll/config/:userId`, `PATCH /users/:id`): a
  changed `payrollScheme`, `employmentType` or `paymentFrequency` must be an
  active row of its list (400 otherwise); an unchanged value is always kept.
  `PATCH /users/:id` checks the scheme before it saves anything, accepts
  `salary`, `payrollScheme` and `maxBillableHoursPerDay` from payroll roles
  only (403 for other managers, like `POST /payroll/config`), and no longer
  resets the currency to PHP when a salary is sent.
- Routes: `docs/api.md`, "Payroll Schemes And Option Lists". Writes broadcast
  the socket resource `payroll-options`; profile saves broadcast
  `payroll-profile`, so open pages refetch.

## Pay periods (2026-10-20)

The company pays once a month. New periods are one calendar month by default
(1st 00:00 to the last day 23:59:59 in `PAYROLL_TIMEZONE`, pay date 5 days
after the end). `PAYROLL_PERIOD_CADENCE=semi_monthly` brings back the 1-15 and
16-end split; any other value, or none, means monthly
(`config.payrollPeriodCadence`, `payrollPeriodForDay`).

- Stored periods are never rewritten. Production keeps October 2026 as two
  halves (1-15 and 16-31); November 2026 is the first whole month.
- `period-advance` and `POST /payroll/periods/ensure` create the expected
  period only when no stored period shares a calendar day with it. A half
  that overlaps the month is returned (ensure) or makes the job skip.
- Vercel Cron runs the scheduler at 00:00 UTC (08:00 Manila) on the 1st and
  the 16th (Hobby allows two crons; the 16th keeps client invoices and the
  digest on their old timing). For payroll the 16th run is a harmless retry:
  period-advance skips, and auto-payslip regenerates the same ended period,
  keeping hand-edited payslips and sending no second email. Lock a period
  once it is paid so a later run cannot change it.
- `periodFraction` is 1 for a whole month, so `fixed_monthly` pays the full
  salary; `hourly_from_monthly` pays the same total as the two halves did.
- The frontend reads `NEXT_PUBLIC_PAYROLL_PERIOD_CADENCE` (same values, monthly
  default) for the generate-payslip fallback range and the scheduler copy.
- Going back to semi-monthly is an env change on both apps (the 16th cron is
  already in place).
- Switch to monthly only when the current month has both halves or neither.
  With only the 1-15 half stored, ensure keeps returning it after the 15th
  and no period covers 16-end, so create that half by hand first
  (`POST /payroll/periods`).
- `EmployeeProfile.paymentFrequency` is a label only; its default is
  `"Monthly"` since migration `202610200001_monthly_default`.

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
overtime, not paid"), `uncredited_hours` (amount 0, informational, hours
beyond the scheme's credited days, since 2026-10-20), `allowance`,
`deduction`, `adjustment`. Net = sum of all item amounts (deductions are
negative).

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
| POST/PATCH/DELETE | /payroll/entry[/:id] | payroll management only (since 2026-10-14) | everyone else, managers included, gets 403 `{ message: "Submit an adjustment request" }` |
| POST | /payroll/entries/backfill | payroll management only | `{ userId, startDate, endDate, startTime, endTime, skipWeekends, notes?, dryRun? }` -> `{ created, skipped, days }`; details in `docs/api.md` |
| PATCH | /payroll/payslips/:id | payroll management | `{ items: [{type, description, amount}], note }` -> replace items, recompute gross/net, set editedBy/At/Note. 409 if period processed. |
| DELETE | /payroll/payslips/:id | payroll management | 409 if period processed |
| GET/POST | /payroll/config/:userId | unchanged | now accepts `payBasis`, `hourlyRate`, `overtimeMultiplier` (privileged only, via `filterPayrollProfileUpdate`); since 2026-10-20 a changed scheme or option must come from its list |
| GET | /payroll/schemes, /payroll/options/:category | any signed-in user | `inUseCount` per row for payroll roles only |
| POST/PATCH/DELETE | /payroll/schemes[/:id], /payroll/options/:category[/:id] | payroll management | see "Salary divisor schemes and credited days" |
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
  hourly rate field (shown for `hourly_rate`), OT multiplier field. Since
  2026-10-20 one page in two columns (pay basis and live rates left, details
  right, one column on a phone), Cancel and Save in a fixed footer, the
  scheme, employment type and pay frequency selects read the lists, and a
  "Manage options" link (payroll roles) closes the dialog, opens Payroll
  options, and reopens the dialog with the unsaved form afterwards.
- Payroll options (`PayrollOptionsManager`, payroll roles; from Employee
  Overview and the setup dialog): schemes, employment types and pay frequency
  labels with add, edit, set default, archive, restore and delete, "in use by
  N employees", inline validation and server messages.
- Time clock and calendar: employees see clock in/out, their entries
  read-only, "Request a correction" (opens adjustment modal) and, on a day
  over the cap, "Request overtime". Payroll roles get Manual, Backfill hours,
  edit and delete. Plain managers see other people's time read-only and file
  requests for their own.
- Payroll calendar page: new "Approvals" tab (management and payroll roles)
  with two queues, OT and corrections, approve/reject with note, filter by
  status and person. Badge count on the tab.
- Payslips tab: edit (line items CRUD, note required) and delete on draft
  payslips. Locked periods show the lock reason.
- My payslips: show overtime approved and pending lines and the pay basis.
- Employee Overview cards (2026-10-20): one action row (View, Set up payroll,
  Edit, Reset password, Deactivate) that becomes a two-column grid on a phone,
  a pay summary line (pay basis, scheme name, daily cap, pay frequency from
  the lists), the status badge inside the card, and a search box.
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

Vercel does NOT run migrations: `vercel.json` uses the legacy `builds` array,
which makes Vercel ignore `buildCommand`, so a migrate step there never
executes (that is how this release shipped twice against a database without
its tables). Render only migrates when it deploys, and it does not deploy
while CI is red.

Migrations for production run from the GitHub Actions workflow
`.github/workflows/migrate-production.yml` (push to `main` touching
`backend/prisma/**`, or run by hand). It needs the repository secret
`PRODUCTION_DIRECT_DATABASE_URL` (direct 5432 URL, not the 6543 pooler).
Order for any release with a migration: migration applied first, merge
second. Manual fallback: paste the migration SQL into the Supabase SQL editor
for the project and insert the matching `_prisma_migrations` row.
