-- Payslip approval with Disbursement Officer sign-off, and withholding tax
-- rules (2026-10-28, payroll manager request). Additive only: new nullable
-- columns, one column with a default, one new table, one role row.
-- Rules: docs/payroll-time-v2-spec.md, "Disbursement sign-off" and "Withholding tax".

-- AlterTable: null follows the workspace default tax rule, 'none' means no tax,
-- anything else is a PayrollTaxRule key.
ALTER TABLE "EmployeeProfile" ADD COLUMN     "taxRule" TEXT;

-- AlterTable: every existing payslip starts as 'draft' (not approved). The
-- existing "status" column is not touched.
ALTER TABLE "Payslip" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvalSignature" TEXT,
ADD COLUMN     "approvalSignerName" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT;

-- CreateTable: no rule is seeded and none is the default, so nothing is taxed
-- until a payroll role adds a rule.
CREATE TABLE "PayrollTaxRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollTaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollTaxRule_key_key" ON "PayrollTaxRule"("key");

-- Seed: the Disbursement Officer role under Payroll / Finance, so it can be
-- assigned from Operations right away (ORG_DEPARTMENT_ROLE_CATALOG has it too;
-- the org-catalog sync adds it where the department is missing here).
INSERT INTO "AvailableRole" ("id", "name", "departmentId", "createdAt")
SELECT 'available_role_disbursement_officer', 'Disbursement Officer', d."id", CURRENT_TIMESTAMP
FROM "Department" d
WHERE d."name" = 'Payroll / Finance'
ON CONFLICT DO NOTHING;
