-- Add the Deskii client portal data model as an additive tenant-scoped module.
CREATE TABLE "ClientServiceTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DOUBLE PRECISION,
    "priorityRank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientServiceTier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tierId" TEXT,
    "websiteUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientOrganization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'client',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientProject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "summary" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "targetLaunchAt" TIMESTAMP(3),
    "liveUrl" TEXT,
    "previewUrl" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'new',
    "internalNotes" TEXT,
    "createdById" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ClientTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientTicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'client',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTicketComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientUpdate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientMetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMetricSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientResourceLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientResourceLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientServiceTier_name_key" ON "ClientServiceTier"("name");
CREATE UNIQUE INDEX "ClientOrganization_slug_key" ON "ClientOrganization"("slug");
CREATE UNIQUE INDEX "ClientMembership_organizationId_userId_key" ON "ClientMembership"("organizationId", "userId");

CREATE INDEX "ClientOrganization_status_idx" ON "ClientOrganization"("status");
CREATE INDEX "ClientOrganization_tierId_idx" ON "ClientOrganization"("tierId");
CREATE INDEX "ClientMembership_organizationId_idx" ON "ClientMembership"("organizationId");
CREATE INDEX "ClientMembership_userId_idx" ON "ClientMembership"("userId");
CREATE INDEX "ClientMembership_status_idx" ON "ClientMembership"("status");
CREATE INDEX "ClientProject_organizationId_idx" ON "ClientProject"("organizationId");
CREATE INDEX "ClientProject_status_idx" ON "ClientProject"("status");
CREATE INDEX "ClientTicket_organizationId_idx" ON "ClientTicket"("organizationId");
CREATE INDEX "ClientTicket_projectId_idx" ON "ClientTicket"("projectId");
CREATE INDEX "ClientTicket_createdById_idx" ON "ClientTicket"("createdById");
CREATE INDEX "ClientTicket_assignedToId_idx" ON "ClientTicket"("assignedToId");
CREATE INDEX "ClientTicket_status_idx" ON "ClientTicket"("status");
CREATE INDEX "ClientTicket_priority_idx" ON "ClientTicket"("priority");
CREATE INDEX "ClientTicketComment_ticketId_idx" ON "ClientTicketComment"("ticketId");
CREATE INDEX "ClientTicketComment_authorId_idx" ON "ClientTicketComment"("authorId");
CREATE INDEX "ClientTicketComment_visibility_idx" ON "ClientTicketComment"("visibility");
CREATE INDEX "ClientUpdate_organizationId_idx" ON "ClientUpdate"("organizationId");
CREATE INDEX "ClientUpdate_projectId_idx" ON "ClientUpdate"("projectId");
CREATE INDEX "ClientUpdate_createdById_idx" ON "ClientUpdate"("createdById");
CREATE INDEX "ClientUpdate_visibleToClient_idx" ON "ClientUpdate"("visibleToClient");
CREATE INDEX "ClientUpdate_status_idx" ON "ClientUpdate"("status");
CREATE INDEX "ClientMetricSnapshot_organizationId_idx" ON "ClientMetricSnapshot"("organizationId");
CREATE INDEX "ClientMetricSnapshot_visibleToClient_idx" ON "ClientMetricSnapshot"("visibleToClient");
CREATE INDEX "ClientMetricSnapshot_periodStart_idx" ON "ClientMetricSnapshot"("periodStart");
CREATE INDEX "ClientResourceLink_organizationId_idx" ON "ClientResourceLink"("organizationId");
CREATE INDEX "ClientResourceLink_projectId_idx" ON "ClientResourceLink"("projectId");
CREATE INDEX "ClientResourceLink_visibleToClient_idx" ON "ClientResourceLink"("visibleToClient");
CREATE INDEX "ClientResourceLink_type_idx" ON "ClientResourceLink"("type");

ALTER TABLE "ClientOrganization"
    ADD CONSTRAINT "ClientOrganization_tierId_fkey"
    FOREIGN KEY ("tierId") REFERENCES "ClientServiceTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientMembership"
    ADD CONSTRAINT "ClientMembership_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientMembership"
    ADD CONSTRAINT "ClientMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientProject"
    ADD CONSTRAINT "ClientProject_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientTicket"
    ADD CONSTRAINT "ClientTicket_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientTicket"
    ADD CONSTRAINT "ClientTicket_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientTicket"
    ADD CONSTRAINT "ClientTicket_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientTicket"
    ADD CONSTRAINT "ClientTicket_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientTicketComment"
    ADD CONSTRAINT "ClientTicketComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "ClientTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientTicketComment"
    ADD CONSTRAINT "ClientTicketComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientUpdate"
    ADD CONSTRAINT "ClientUpdate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientUpdate"
    ADD CONSTRAINT "ClientUpdate_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientUpdate"
    ADD CONSTRAINT "ClientUpdate_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientMetricSnapshot"
    ADD CONSTRAINT "ClientMetricSnapshot_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientResourceLink"
    ADD CONSTRAINT "ClientResourceLink_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientResourceLink"
    ADD CONSTRAINT "ClientResourceLink_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "ClientProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
