-- Employee categories and the automatic employee history (2026-10-28, payroll
-- manager request). Additive only: two employment type options, one new table.
-- Rules: docs/payroll-time-v2-spec.md, "Employee categories" and "Employee history".

-- Employment types read Full-Time, Probationary, Temporary Hire, Part-Time,
-- Contractor, Intern. Make room after Full-Time, but only for seeded rows that
-- still have their seeded order, so an order changed in Payroll options stays.
UPDATE "PayrollOption" SET "sortOrder" = 5, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'payroll_option_employment_intern' AND "sortOrder" = 3;
UPDATE "PayrollOption" SET "sortOrder" = 4, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'payroll_option_employment_contractor' AND "sortOrder" = 2;
UPDATE "PayrollOption" SET "sortOrder" = 3, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'payroll_option_employment_part_time' AND "sortOrder" = 1;

-- Seed: skipped when the list already has the value or the label in any case
-- (a payroll role may have added it by hand), so the unique index never fails.
INSERT INTO "PayrollOption" ("id", "category", "value", "label", "sortOrder", "isDefault", "updatedAt")
SELECT v."id", 'employment_type', v."value", v."label", v."sortOrder", false, CURRENT_TIMESTAMP
FROM (VALUES
    ('payroll_option_employment_probationary', 'Probationary', 'Probationary', 1),
    ('payroll_option_employment_temporary_hire', 'Temporary Hire', 'Temporary Hire', 2)
) AS v("id", "value", "label", "sortOrder")
WHERE NOT EXISTS (
    SELECT 1 FROM "PayrollOption" o
    WHERE o."category" = 'employment_type'
      AND (lower(o."value") = lower(v."value") OR lower(o."label") = lower(v."label"))
)
ON CONFLICT DO NOTHING;

-- CreateTable: one row per person per pay period, written by the payroll
-- service on every payslip write and when the period is locked.
CREATE TABLE "PayrollRosterSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "employmentType" TEXT,
    "memberStatus" TEXT NOT NULL,
    "payrollScheme" TEXT,
    "payBasis" TEXT,
    "baseSalary" DOUBLE PRECISION,
    "taxRule" TEXT,
    "hoursWorked" DOUBLE PRECISION,
    "grossPay" DOUBLE PRECISION,
    "taxAmount" DOUBLE PRECISION,
    "netPay" DOUBLE PRECISION,
    "payslipId" TEXT,
    "payslipStatus" TEXT,

    CONSTRAINT "PayrollRosterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollRosterSnapshot_userId_idx" ON "PayrollRosterSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRosterSnapshot_periodId_userId_key" ON "PayrollRosterSnapshot"("periodId", "userId");

-- AddForeignKey
ALTER TABLE "PayrollRosterSnapshot" ADD CONSTRAINT "PayrollRosterSnapshot_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRosterSnapshot" ADD CONSTRAINT "PayrollRosterSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
