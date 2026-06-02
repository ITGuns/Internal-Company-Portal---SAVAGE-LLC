CREATE TABLE "ClientActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'internal',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientActivity_organizationId_createdAt_idx"
    ON "ClientActivity"("organizationId", "createdAt");

CREATE INDEX "ClientActivity_organizationId_visibility_createdAt_idx"
    ON "ClientActivity"("organizationId", "visibility", "createdAt");

CREATE INDEX "ClientActivity_subjectType_subjectId_idx"
    ON "ClientActivity"("subjectType", "subjectId");

CREATE INDEX "ClientActivity_type_idx"
    ON "ClientActivity"("type");

ALTER TABLE "ClientActivity"
    ADD CONSTRAINT "ClientActivity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientActivity"
    ADD CONSTRAINT "ClientActivity_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
