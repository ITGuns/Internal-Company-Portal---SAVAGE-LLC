CREATE TABLE "DailyLogComment" (
  "id" TEXT NOT NULL,
  "dailyLogId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyLogComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DailyLogComment"
  ADD CONSTRAINT "DailyLogComment_dailyLogId_fkey"
  FOREIGN KEY ("dailyLogId") REFERENCES "DailyLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyLogComment"
  ADD CONSTRAINT "DailyLogComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DailyLogComment_dailyLogId_idx" ON "DailyLogComment"("dailyLogId");
CREATE INDEX "DailyLogComment_authorId_idx" ON "DailyLogComment"("authorId");
