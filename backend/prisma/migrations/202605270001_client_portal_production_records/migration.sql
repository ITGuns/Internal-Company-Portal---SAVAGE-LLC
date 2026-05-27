-- Add production client-portal workflow records without touching existing portal data.
CREATE TABLE "ClientWorkItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWorkItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responseNote" TEXT,
    "requestedById" TEXT,
    "decidedById" TEXT,
    "dueAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "leadsCaptured" INTEGER,
    "missedOpportunities" INTEGER,
    "followUpStatus" TEXT,
    "leadSourceBreakdown" JSONB,
    "reputationSnapshot" JSONB,
    "localVisibilitySnapshot" JSONB,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientRoadmapRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "impact" TEXT,
    "effort" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRoadmapRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "status" TEXT NOT NULL DEFAULT 'received',
    "notes" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientBillingStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "monthlyAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "renewalAt" TIMESTAMP(3),
    "notes" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBillingStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientCalendarItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCalendarItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientBillingStatus_organizationId_key" ON "ClientBillingStatus"("organizationId");

CREATE INDEX "ClientWorkItem_organizationId_idx" ON "ClientWorkItem"("organizationId");
CREATE INDEX "ClientWorkItem_projectId_idx" ON "ClientWorkItem"("projectId");
CREATE INDEX "ClientWorkItem_status_idx" ON "ClientWorkItem"("status");
CREATE INDEX "ClientWorkItem_visibleToClient_idx" ON "ClientWorkItem"("visibleToClient");
CREATE INDEX "ClientWorkItem_dueAt_idx" ON "ClientWorkItem"("dueAt");
CREATE INDEX "ClientWorkItem_assignedToId_idx" ON "ClientWorkItem"("assignedToId");

CREATE INDEX "ClientApproval_organizationId_idx" ON "ClientApproval"("organizationId");
CREATE INDEX "ClientApproval_projectId_idx" ON "ClientApproval"("projectId");
CREATE INDEX "ClientApproval_status_idx" ON "ClientApproval"("status");
CREATE INDEX "ClientApproval_visibleToClient_idx" ON "ClientApproval"("visibleToClient");
CREATE INDEX "ClientApproval_dueAt_idx" ON "ClientApproval"("dueAt");

CREATE INDEX "ClientReport_organizationId_idx" ON "ClientReport"("organizationId");
CREATE INDEX "ClientReport_status_idx" ON "ClientReport"("status");
CREATE INDEX "ClientReport_visibleToClient_idx" ON "ClientReport"("visibleToClient");
CREATE INDEX "ClientReport_periodStart_idx" ON "ClientReport"("periodStart");
CREATE INDEX "ClientReport_createdById_idx" ON "ClientReport"("createdById");

CREATE INDEX "ClientRoadmapRecommendation_organizationId_idx" ON "ClientRoadmapRecommendation"("organizationId");
CREATE INDEX "ClientRoadmapRecommendation_status_idx" ON "ClientRoadmapRecommendation"("status");
CREATE INDEX "ClientRoadmapRecommendation_visibleToClient_idx" ON "ClientRoadmapRecommendation"("visibleToClient");
CREATE INDEX "ClientRoadmapRecommendation_sortOrder_idx" ON "ClientRoadmapRecommendation"("sortOrder");

CREATE INDEX "ClientAsset_organizationId_idx" ON "ClientAsset"("organizationId");
CREATE INDEX "ClientAsset_projectId_idx" ON "ClientAsset"("projectId");
CREATE INDEX "ClientAsset_type_idx" ON "ClientAsset"("type");
CREATE INDEX "ClientAsset_status_idx" ON "ClientAsset"("status");
CREATE INDEX "ClientAsset_visibleToClient_idx" ON "ClientAsset"("visibleToClient");

CREATE INDEX "ClientBillingStatus_status_idx" ON "ClientBillingStatus"("status");
CREATE INDEX "ClientBillingStatus_visibleToClient_idx" ON "ClientBillingStatus"("visibleToClient");

CREATE INDEX "ClientCalendarItem_organizationId_idx" ON "ClientCalendarItem"("organizationId");
CREATE INDEX "ClientCalendarItem_projectId_idx" ON "ClientCalendarItem"("projectId");
CREATE INDEX "ClientCalendarItem_status_idx" ON "ClientCalendarItem"("status");
CREATE INDEX "ClientCalendarItem_visibleToClient_idx" ON "ClientCalendarItem"("visibleToClient");
CREATE INDEX "ClientCalendarItem_startAt_idx" ON "ClientCalendarItem"("startAt");
CREATE INDEX "ClientCalendarItem_createdById_idx" ON "ClientCalendarItem"("createdById");

ALTER TABLE "ClientWorkItem"
    ADD CONSTRAINT "ClientWorkItem_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkItem"
    ADD CONSTRAINT "ClientWorkItem_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientWorkItem"
    ADD CONSTRAINT "ClientWorkItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientWorkItem"
    ADD CONSTRAINT "ClientWorkItem_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientApproval"
    ADD CONSTRAINT "ClientApproval_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientApproval"
    ADD CONSTRAINT "ClientApproval_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientApproval"
    ADD CONSTRAINT "ClientApproval_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientApproval"
    ADD CONSTRAINT "ClientApproval_decidedById_fkey"
    FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientReport"
    ADD CONSTRAINT "ClientReport_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientReport"
    ADD CONSTRAINT "ClientReport_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientRoadmapRecommendation"
    ADD CONSTRAINT "ClientRoadmapRecommendation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAsset"
    ADD CONSTRAINT "ClientAsset_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientAsset"
    ADD CONSTRAINT "ClientAsset_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientBillingStatus"
    ADD CONSTRAINT "ClientBillingStatus_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientCalendarItem"
    ADD CONSTRAINT "ClientCalendarItem_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientCalendarItem"
    ADD CONSTRAINT "ClientCalendarItem_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientCalendarItem"
    ADD CONSTRAINT "ClientCalendarItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
