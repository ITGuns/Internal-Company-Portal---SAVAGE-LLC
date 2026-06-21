-- Persist scheduler job history used by payroll and client automation.
CREATE TABLE "SchedulerJobRun" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "resultJson" TEXT,
    "errorMsg" TEXT,

    CONSTRAINT "SchedulerJobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SchedulerJobRun_jobType_idx" ON "SchedulerJobRun"("jobType");
CREATE INDEX "SchedulerJobRun_status_idx" ON "SchedulerJobRun"("status");
CREATE INDEX "SchedulerJobRun_startedAt_idx" ON "SchedulerJobRun"("startedAt");
