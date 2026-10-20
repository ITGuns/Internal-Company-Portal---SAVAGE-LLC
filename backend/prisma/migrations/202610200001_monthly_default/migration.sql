-- Monthly payroll (2026-10-20): new employee profiles get the "Monthly" payment
-- frequency label. Column default only; existing rows keep their value.

-- AlterTable
ALTER TABLE "EmployeeProfile" ALTER COLUMN "paymentFrequency" SET DEFAULT 'Monthly';
