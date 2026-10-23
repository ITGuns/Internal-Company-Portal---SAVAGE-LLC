-- Guided-tour progress, stored per account so a client is not re-taught on a
-- second device. Expand-only: one nullable-by-default array column, no backfill
-- and no lock on a heavily-used table. Existing users start with none seen,
-- which is exactly "has not been shown the guide yet".
ALTER TABLE "User" ADD COLUMN     "tourSeen" TEXT[] DEFAULT ARRAY[]::TEXT[];
