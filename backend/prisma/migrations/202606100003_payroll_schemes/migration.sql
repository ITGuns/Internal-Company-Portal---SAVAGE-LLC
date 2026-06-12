-- Add payroll divisor and billable-hour controls without changing existing payslip records.
ALTER TABLE "EmployeeProfile"
  ADD COLUMN "payrollScheme" TEXT NOT NULL DEFAULT 'weekdays',
  ADD COLUMN "maxBillableHoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8;
