-- Persist randomized upload objects and link them to the records that control access.
CREATE TABLE "StoredUpload" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoredUpload_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientAsset" ADD COLUMN "uploadId" TEXT;
ALTER TABLE "FileFolder" ADD COLUMN "uploadId" TEXT;

CREATE UNIQUE INDEX "StoredUpload_objectKey_key" ON "StoredUpload"("objectKey");
CREATE INDEX "StoredUpload_ownerId_idx" ON "StoredUpload"("ownerId");
CREATE INDEX "StoredUpload_createdAt_idx" ON "StoredUpload"("createdAt");
CREATE UNIQUE INDEX "ClientAsset_uploadId_key" ON "ClientAsset"("uploadId");
CREATE UNIQUE INDEX "FileFolder_uploadId_key" ON "FileFolder"("uploadId");

ALTER TABLE "StoredUpload"
ADD CONSTRAINT "StoredUpload_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientAsset"
ADD CONSTRAINT "ClientAsset_uploadId_fkey"
FOREIGN KEY ("uploadId") REFERENCES "StoredUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FileFolder"
ADD CONSTRAINT "FileFolder_uploadId_fkey"
FOREIGN KEY ("uploadId") REFERENCES "StoredUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
