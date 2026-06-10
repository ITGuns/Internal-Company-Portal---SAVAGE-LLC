-- Add collaborator invitations for internal task work without changing the primary assignee contract.
CREATE TABLE "TaskCollaborator" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCollaborator_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskCollaborator"
  ADD CONSTRAINT "TaskCollaborator_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCollaborator"
  ADD CONSTRAINT "TaskCollaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskCollaborator"
  ADD CONSTRAINT "TaskCollaborator_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TaskCollaborator_taskId_userId_key" ON "TaskCollaborator"("taskId", "userId");
CREATE INDEX "TaskCollaborator_taskId_idx" ON "TaskCollaborator"("taskId");
CREATE INDEX "TaskCollaborator_userId_idx" ON "TaskCollaborator"("userId");
CREATE INDEX "TaskCollaborator_invitedById_idx" ON "TaskCollaborator"("invitedById");
CREATE INDEX "TaskCollaborator_status_idx" ON "TaskCollaborator"("status");
