-- Add internal task projects and flexible manager reporting links.
CREATE TABLE "TaskProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "color" TEXT,
    "departmentId" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT,
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskProject_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;

ALTER TABLE "TaskProject"
  ADD CONSTRAINT "TaskProject_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskProject"
  ADD CONSTRAINT "TaskProject_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskProject"
  ADD CONSTRAINT "TaskProject_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TaskProject_status_idx" ON "TaskProject"("status");
CREATE INDEX "TaskProject_departmentId_idx" ON "TaskProject"("departmentId");
CREATE INDEX "TaskProject_ownerId_idx" ON "TaskProject"("ownerId");
CREATE INDEX "TaskProject_createdById_idx" ON "TaskProject"("createdById");
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "User_managerId_idx" ON "User"("managerId");
