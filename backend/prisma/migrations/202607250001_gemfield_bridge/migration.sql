-- Deskii x Gemfield Bridge (P1) - expand-only. Extends existing client models; no drops, no renames.
-- Every added column is nullable or carries a default, so existing rows and plain (non-Gemfield) client
-- organizations are unaffected. New tables reuse StoredUpload for attachments rather than a parallel uploader.

-- AlterTable: entitlement flags on the existing client organization.
ALTER TABLE "ClientOrganization" ADD COLUMN     "gemfieldCaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gemfieldClient" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Gemfield build tracking on the existing client project.
ALTER TABLE "ClientProject" ADD COLUMN     "gemfieldPhase" TEXT,
ADD COLUMN     "gfId" TEXT,
ADD COLUMN     "stagingUrl" TEXT;

-- AlterTable: wizard provenance + triage classification on the existing client ticket.
ALTER TABLE "ClientTicket" ADD COLUMN     "changeClass" TEXT,
ADD COLUMN     "sourceWizardVersion" TEXT,
ADD COLUMN     "ticketKind" TEXT,
ADD COLUMN     "wizardAnswers" JSONB;

-- CreateTable: per-phase build timeline for a project (idempotent per project+phase).
CREATE TABLE "GemfieldMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GemfieldMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ticket <-> StoredUpload join (reuses the existing upload pipeline).
CREATE TABLE "ClientTicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GemfieldMilestone_projectId_idx" ON "GemfieldMilestone"("projectId");

-- CreateIndex
CREATE INDEX "GemfieldMilestone_phase_idx" ON "GemfieldMilestone"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "GemfieldMilestone_projectId_phase_key" ON "GemfieldMilestone"("projectId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTicketAttachment_uploadId_key" ON "ClientTicketAttachment"("uploadId");

-- CreateIndex
CREATE INDEX "ClientTicketAttachment_ticketId_idx" ON "ClientTicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "ClientOrganization_gemfieldClient_idx" ON "ClientOrganization"("gemfieldClient");

-- CreateIndex
CREATE INDEX "ClientProject_gfId_idx" ON "ClientProject"("gfId");

-- CreateIndex
CREATE INDEX "ClientTicket_ticketKind_idx" ON "ClientTicket"("ticketKind");

-- AddForeignKey
ALTER TABLE "GemfieldMilestone" ADD CONSTRAINT "GemfieldMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTicketAttachment" ADD CONSTRAINT "ClientTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ClientTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTicketAttachment" ADD CONSTRAINT "ClientTicketAttachment_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "StoredUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;
