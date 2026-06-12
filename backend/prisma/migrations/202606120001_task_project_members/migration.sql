-- Add explicit internal task project membership.
CREATE TABLE "TaskProjectMember" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TaskProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskProjectMember_projectId_userId_key" ON "TaskProjectMember"("projectId", "userId");
CREATE INDEX "TaskProjectMember_projectId_idx" ON "TaskProjectMember"("projectId");
CREATE INDEX "TaskProjectMember_userId_idx" ON "TaskProjectMember"("userId");
CREATE INDEX "TaskProjectMember_addedById_idx" ON "TaskProjectMember"("addedById");
CREATE INDEX "TaskProjectMember_status_idx" ON "TaskProjectMember"("status");

ALTER TABLE "TaskProjectMember"
  ADD CONSTRAINT "TaskProjectMember_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskProjectMember"
  ADD CONSTRAINT "TaskProjectMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskProjectMember"
  ADD CONSTRAINT "TaskProjectMember_addedById_fkey"
  FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
