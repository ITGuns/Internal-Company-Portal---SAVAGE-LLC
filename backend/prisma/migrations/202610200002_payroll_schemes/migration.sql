-- Payroll schemes and option lists as data (2026-10-20). The salary divisor
-- schemes and the employment type and pay frequency dropdowns become rows that
-- payroll roles manage. EmployeeProfile.payrollScheme keeps holding the scheme
-- key, so existing rows need no rewrite. New profiles default to the
-- "22 credited days" scheme (the payroll manager's rule: at most 22 credited
-- days a month). Additive apart from the column default.

-- CreateTable
CREATE TABLE "PayrollScheme" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "maxCreditedDays" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollOption" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollScheme_key_key" ON "PayrollScheme"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollOption_category_value_key" ON "PayrollOption"("category", "value");

-- Seed: the four schemes the code had as fixed values (same keys), plus the new default.
INSERT INTO "PayrollScheme" ("id", "key", "name", "kind", "value", "maxCreditedDays", "isDefault", "sortOrder", "updatedAt") VALUES
    ('payroll_scheme_fixed_22_days', 'fixed_22_days', '22 credited days', 'fixed_days', 22, 22, true, 0, CURRENT_TIMESTAMP),
    ('payroll_scheme_weekdays', 'weekdays', 'Weekdays of month', 'weekdays', NULL, NULL, false, 1, CURRENT_TIMESTAMP),
    ('payroll_scheme_flat_30', 'flat_30', 'Flat 30 days', 'fixed_days', 30, NULL, false, 2, CURRENT_TIMESTAMP),
    ('payroll_scheme_flat_20', 'flat_20', 'Flat 20 days', 'fixed_days', 20, NULL, false, 3, CURRENT_TIMESTAMP),
    ('payroll_scheme_flat_160_hours', 'flat_160_hours', 'Flat 160 hours', 'fixed_hours', 160, NULL, false, 4, CURRENT_TIMESTAMP);

-- Seed: the values Set Up Payroll offered before this release. "Monthly" stays the
-- default pay frequency (migration 202610200001_monthly_default).
INSERT INTO "PayrollOption" ("id", "category", "value", "label", "sortOrder", "isDefault", "updatedAt") VALUES
    ('payroll_option_employment_full_time', 'employment_type', 'Full-Time', 'Full-Time', 0, true, CURRENT_TIMESTAMP),
    ('payroll_option_employment_part_time', 'employment_type', 'Part-Time', 'Part-Time', 1, false, CURRENT_TIMESTAMP),
    ('payroll_option_employment_contractor', 'employment_type', 'Contractor', 'Contractor / Freelance', 2, false, CURRENT_TIMESTAMP),
    ('payroll_option_employment_intern', 'employment_type', 'Intern', 'Intern', 3, false, CURRENT_TIMESTAMP),
    ('payroll_option_frequency_monthly', 'payment_frequency', 'Monthly', 'Monthly (once a month)', 0, true, CURRENT_TIMESTAMP),
    ('payroll_option_frequency_semi_monthly', 'payment_frequency', 'Semi-Monthly', 'Semi-Monthly (twice a month)', 1, false, CURRENT_TIMESTAMP),
    ('payroll_option_frequency_bi_weekly', 'payment_frequency', 'Bi-Weekly', 'Bi-Weekly (every 2 weeks)', 2, false, CURRENT_TIMESTAMP),
    ('payroll_option_frequency_weekly', 'payment_frequency', 'Weekly', 'Weekly', 3, false, CURRENT_TIMESTAMP);

-- AlterTable: new profiles start on the 22 credited days scheme. Existing rows keep their key.
ALTER TABLE "EmployeeProfile" ALTER COLUMN "payrollScheme" SET DEFAULT 'fixed_22_days';
