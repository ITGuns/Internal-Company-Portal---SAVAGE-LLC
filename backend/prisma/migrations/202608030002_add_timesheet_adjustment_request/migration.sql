-- Timesheet adjustment requests: staff ask for a clock-in/out correction and the
-- person who manages them decides. Expand-only - one new table, no change to
-- TimeEntry, so existing time tracking is untouched by this migration.
CREATE TABLE "TimesheetAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "requestedEnd" TIMESTAMP(3),
    "originalStart" TIMESTAMP(3),
    "originalEnd" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimesheetAdjustmentRequest_userId_idx" ON "TimesheetAdjustmentRequest"("userId");
CREATE INDEX "TimesheetAdjustmentRequest_status_idx" ON "TimesheetAdjustmentRequest"("status");
CREATE INDEX "TimesheetAdjustmentRequest_timeEntryId_idx" ON "TimesheetAdjustmentRequest"("timeEntryId");
CREATE INDEX "TimesheetAdjustmentRequest_createdAt_idx" ON "TimesheetAdjustmentRequest"("createdAt");

ALTER TABLE "TimesheetAdjustmentRequest" ADD CONSTRAINT "TimesheetAdjustmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimesheetAdjustmentRequest" ADD CONSTRAINT "TimesheetAdjustmentRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimesheetAdjustmentRequest" ADD CONSTRAINT "TimesheetAdjustmentRequest_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
