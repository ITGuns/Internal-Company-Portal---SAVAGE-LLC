# Database Notes

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

## Signup Approval

`EmployeeProfile.requestedRole` and `EmployeeProfile.requestedDepartmentId` store signup intent separately from active authorization.

- Signup writes requested values only.
- Approval converts the requested values into an active `UserRole`.
- Missing requested role or department leaves approval from creating a role assignment.
