-- Workspace settings (2026-10-14): branding moves from workspace-branding.json,
-- which Vercel's read-only filesystem never kept, to this table. Additive only;
-- the API reads the file as a fallback for one release.

-- CreateTable
CREATE TABLE "WorkspaceSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSetting_pkey" PRIMARY KEY ("key")
);
