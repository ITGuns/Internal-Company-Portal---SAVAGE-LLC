-- Add per-user chat archive state without deleting conversation history.
ALTER TABLE "Participant" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Participant_userId_archivedAt_idx" ON "Participant"("userId", "archivedAt");
