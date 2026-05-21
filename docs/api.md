# API Notes

## Tasks

All task endpoints require authentication.

### Task Read Visibility

Employee task reads are server-scoped.

- Privileged users may read all tasks through list, search, status, department, assignee, and detail endpoints.
- Non-privileged users receive tasks assigned to their authenticated user ID or created by their authenticated user ID.
- `GET /api/tasks/assignee/:assigneeId` returns `403` when a non-privileged user requests another user's tasks.
- `GET /api/tasks/:id` returns `403` when a non-privileged user requests a task they neither created nor are assigned to.

### `GET /api/tasks/:id`

Returns one task with detail relations.

- Includes `department` and `assignee`.
- Includes `creator` when `createdById` is set.
- Includes `workSessions` sorted newest first.
- Each work session includes `startedAt`, `endedAt`, `durationSeconds`, and the session `user` identity fields.

### `POST /api/tasks`

Creates a task.

- Privileged users may provide `assigneeId`, `departmentId`, and `role`.
- Non-privileged users cannot choose assignment fields. The server derives:
  - `assigneeId` from the authenticated user ID.
  - `departmentId` from the user's primary `UserRole.departmentId`.
  - `role` from the user's primary `UserRole.role`.
- Non-privileged task creation fails when the account has no role with a department.
- The server sets `createdById` from the authenticated requester; clients should not send requester ownership.

### `PATCH /api/tasks/:id`

Updates a task.

- Privileged users may update assignment, department, and role fields.
- Non-privileged users may only update tasks assigned to them.
- Non-privileged users cannot update `assigneeId`, `departmentId`, or `role`.
- Moving a task into `completed` sets `completedAt` server-side.
- Moving a task away from `completed` clears `completedAt`.
- Closing a running task timer (`playing` to `paused`/`stopped`, or status to `completed`) records a `TaskWorkSession` when duration is available.

### Privileged Task Assignment Roles

The task assignment privilege check currently recognizes:

- `admin`
- `manager`
- `operations_manager`
- `Operations Manager`
- `Chief Operations Officer`

Configured admin bypass emails also receive privileged task assignment access.

## Departments

### `GET /api/departments`

Returns active departments with their backend-managed role options.

- Each department includes `availableRoles` ordered by name.
- Task role dropdowns should use these backend role options.

## Users

### Directory Responses

User directory endpoints sanitize sensitive fields before returning data to the frontend.

- `GET /api/users`, `GET /api/users/search`, and `GET /api/users/:id` omit password and password-reset fields.
- Embedded `employeeProfile` data is limited to public directory fields such as `jobTitle` and `employmentType`.
- Payroll-sensitive fields such as salary, currency, payment frequency, bank account, and tax ID are not returned through user directory endpoints.

## Payroll

All payroll endpoints require authentication unless noted otherwise.

### Payroll Management Access

Payroll management access currently recognizes:

- `admin`
- `administrator`
- `manager`
- `operations_manager`

Configured admin bypass emails also receive payroll management access.

### Time Entry Access

- `GET /api/payroll/time-entries` returns the authenticated user's entries by default.
- `GET /api/payroll/time-entries?userId=:userId` returns `403` when a non-privileged user requests another user's entries.
- `POST /api/payroll/entry` lets users create their own manual entry.
- Privileged users may create a manual entry for another employee by passing `userId`.
- `PATCH /api/payroll/entry/:id` lets users update their own entry start, end, and notes.
- Only privileged users can reassign a time entry by changing `userId`.
- `DELETE /api/payroll/entry/:id` lets users delete their own entry; privileged users may delete any employee entry.
- Manual entry create/update validates date values and requires end time to be after start time when an end time is provided.

### Payroll Profile Access

- `GET /api/payroll/config/:userId` allows self access or privileged access to another employee.
- `POST /api/payroll/config/:userId` allows self access only for permitted non-sensitive fields.
- Protected payroll profile fields are manager-only: `jobTitle`, `employmentType`, `baseSalary`, `currency`, `paymentFrequency`, `bankAccount`, and `taxId`.
- Non-privileged updates containing protected fields return `403` with the rejected field names.
- Empty or unknown payroll profile updates return `400`.

## Auth And Signup

### `POST /auth/signup`

Creates a pending user application.

- `name`, `email`, `password`, `departmentId`, and `role` are required.
- `departmentId` must match an existing department.
- `role` must match an available role for that department or a global available role.
- Signup stores requested role data on `EmployeeProfile`.
- Signup does not create active `UserRole` authorization records.

### `POST /auth/login`

Authenticates approved users only.

- Invalid credentials return `401`.
- Pending or unapproved accounts return `403`.
- Approved users receive access and refresh tokens.

### `POST /api/employees/approve/:id`

Approves a pending employee application.

- Sets `status` to `verified` and `isApproved` to `true`.
- Assigns the requested role and department from `EmployeeProfile` as an active `UserRole` when both values are present.
