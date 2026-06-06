-- Add server-controlled task completion and work-session history.
ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "TaskWorkSession" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskWorkSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_completedAt_idx" ON "Task"("completedAt");
CREATE INDEX "TaskWorkSession_taskId_idx" ON "TaskWorkSession"("taskId");
CREATE INDEX "TaskWorkSession_userId_idx" ON "TaskWorkSession"("userId");
CREATE INDEX "TaskWorkSession_startedAt_idx" ON "TaskWorkSession"("startedAt");

ALTER TABLE "TaskWorkSession"
    ADD CONSTRAINT "TaskWorkSession_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskWorkSession"
    ADD CONSTRAINT "TaskWorkSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Store requested signup role data separately from active authorization roles.
ALTER TABLE "EmployeeProfile" ADD COLUMN "requestedRole" TEXT;
ALTER TABLE "EmployeeProfile" ADD COLUMN "requestedDepartmentId" TEXT;
