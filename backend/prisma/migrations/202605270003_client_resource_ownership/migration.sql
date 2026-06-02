ALTER TABLE "ClientResourceLink"
    ADD COLUMN "createdById" TEXT;

CREATE INDEX "ClientResourceLink_createdById_idx" ON "ClientResourceLink"("createdById");

ALTER TABLE "ClientResourceLink"
    ADD CONSTRAINT "ClientResourceLink_createdById_fkey"
    FOREIGN KEY ("createdById")
    REFERENCES "User"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
