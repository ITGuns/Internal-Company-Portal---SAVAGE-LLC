-- Add provider-agnostic client storage, booking, payment connection, and invoice records.
CREATE TABLE "ClientStorageRoot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local_app_storage',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "folderName" TEXT NOT NULL,
    "directoryFolderId" TEXT,
    "externalFolderId" TEXT,
    "externalUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientStorageRoot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientBookingRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "subject" TEXT NOT NULL,
    "preferredStartAt" TIMESTAMP(3),
    "preferredEndAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "meetingUrl" TEXT,
    "notes" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientBookingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientPaymentConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "accountLabel" TEXT,
    "externalCustomerId" TEXT,
    "externalMerchantId" TEXT,
    "lastFour" TEXT,
    "webhookStatus" TEXT NOT NULL DEFAULT 'not_configured',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientPaymentConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "billingStatusId" TEXT,
    "invoiceNumber" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "issueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalInvoiceId" TEXT,
    "hostedInvoiceUrl" TEXT,
    "notes" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientStorageRoot_organizationId_key" ON "ClientStorageRoot"("organizationId");
CREATE UNIQUE INDEX "ClientStorageRoot_directoryFolderId_key" ON "ClientStorageRoot"("directoryFolderId");
CREATE INDEX "ClientStorageRoot_provider_idx" ON "ClientStorageRoot"("provider");
CREATE INDEX "ClientStorageRoot_status_idx" ON "ClientStorageRoot"("status");

CREATE INDEX "ClientBookingRequest_organizationId_idx" ON "ClientBookingRequest"("organizationId");
CREATE INDEX "ClientBookingRequest_requestedById_idx" ON "ClientBookingRequest"("requestedById");
CREATE INDEX "ClientBookingRequest_provider_idx" ON "ClientBookingRequest"("provider");
CREATE INDEX "ClientBookingRequest_status_idx" ON "ClientBookingRequest"("status");
CREATE INDEX "ClientBookingRequest_preferredStartAt_idx" ON "ClientBookingRequest"("preferredStartAt");
CREATE INDEX "ClientBookingRequest_visibleToClient_idx" ON "ClientBookingRequest"("visibleToClient");

CREATE UNIQUE INDEX "ClientPaymentConnection_organizationId_provider_accountType_key" ON "ClientPaymentConnection"("organizationId", "provider", "accountType");
CREATE INDEX "ClientPaymentConnection_organizationId_idx" ON "ClientPaymentConnection"("organizationId");
CREATE INDEX "ClientPaymentConnection_provider_idx" ON "ClientPaymentConnection"("provider");
CREATE INDEX "ClientPaymentConnection_status_idx" ON "ClientPaymentConnection"("status");
CREATE INDEX "ClientPaymentConnection_webhookStatus_idx" ON "ClientPaymentConnection"("webhookStatus");

CREATE UNIQUE INDEX "ClientInvoice_invoiceNumber_key" ON "ClientInvoice"("invoiceNumber");
CREATE INDEX "ClientInvoice_organizationId_idx" ON "ClientInvoice"("organizationId");
CREATE INDEX "ClientInvoice_billingStatusId_idx" ON "ClientInvoice"("billingStatusId");
CREATE INDEX "ClientInvoice_provider_idx" ON "ClientInvoice"("provider");
CREATE INDEX "ClientInvoice_status_idx" ON "ClientInvoice"("status");
CREATE INDEX "ClientInvoice_dueAt_idx" ON "ClientInvoice"("dueAt");
CREATE INDEX "ClientInvoice_visibleToClient_idx" ON "ClientInvoice"("visibleToClient");

ALTER TABLE "ClientStorageRoot"
    ADD CONSTRAINT "ClientStorageRoot_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientStorageRoot"
    ADD CONSTRAINT "ClientStorageRoot_directoryFolderId_fkey"
    FOREIGN KEY ("directoryFolderId") REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientBookingRequest"
    ADD CONSTRAINT "ClientBookingRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientBookingRequest"
    ADD CONSTRAINT "ClientBookingRequest_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientPaymentConnection"
    ADD CONSTRAINT "ClientPaymentConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientInvoice"
    ADD CONSTRAINT "ClientInvoice_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientInvoice"
    ADD CONSTRAINT "ClientInvoice_billingStatusId_fkey"
    FOREIGN KEY ("billingStatusId") REFERENCES "ClientBillingStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
