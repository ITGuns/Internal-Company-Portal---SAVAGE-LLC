-- Add a server-controlled requester/creator reference for tasks.
ALTER TABLE "Task" ADD COLUMN "createdById" TEXT;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
