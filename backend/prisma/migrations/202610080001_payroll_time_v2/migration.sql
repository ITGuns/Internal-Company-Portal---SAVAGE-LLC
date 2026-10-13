-- Payroll and time v2 (2026-10-08): pay basis per employee, overtime approvals,
-- time-entry adjustment requests, payslip edit audit fields.
-- Contract: docs/payroll-time-v2-spec.md. Additive only; existing rows keep current behaviour.

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "hourlyRate" DOUBLE PRECISION,
ADD COLUMN     "overtimeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
ADD COLUMN     "payBasis" TEXT NOT NULL DEFAULT 'hourly_from_monthly';

-- AlterTable
ALTER TABLE "Payslip" ADD COLUMN     "editNote" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedById" TEXT;

-- CreateTable
CREATE TABLE "OvertimeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "approvedHours" DOUBLE PRECISION,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryAdjustmentRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "action" TEXT NOT NULL DEFAULT 'update',
    "proposedStart" TIMESTAMP(3),
    "proposedEnd" TIMESTAMP(3),
    "previousStart" TIMESTAMP(3),
    "previousEnd" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntryAdjustmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OvertimeRequest_userId_workDate_idx" ON "OvertimeRequest"("userId", "workDate");

-- CreateIndex
CREATE INDEX "OvertimeRequest_status_idx" ON "OvertimeRequest"("status");

-- CreateIndex
CREATE INDEX "TimeEntryAdjustmentRequest_userId_status_idx" ON "TimeEntryAdjustmentRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "TimeEntryAdjustmentRequest_status_idx" ON "TimeEntryAdjustmentRequest"("status");

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAdjustmentRequest" ADD CONSTRAINT "TimeEntryAdjustmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAdjustmentRequest" ADD CONSTRAINT "TimeEntryAdjustmentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryAdjustmentRequest" ADD CONSTRAINT "TimeEntryAdjustmentRequest_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
