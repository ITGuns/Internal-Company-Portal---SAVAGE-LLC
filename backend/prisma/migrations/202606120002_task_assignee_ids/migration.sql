-- Backfill the existing Prisma schema field for legacy multi-assignee task visibility.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "assigneeIds" JSONB;
