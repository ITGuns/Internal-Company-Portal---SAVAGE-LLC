-- CreateTable
CREATE TABLE "UpgradeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planSlug" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'requested',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "externalPaymentId" TEXT,
    "hostedCheckoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "organizationId" TEXT,
    "note" TEXT,
    "handledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpgradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpgradeRequest_userId_idx" ON "UpgradeRequest"("userId");

-- CreateIndex
CREATE INDEX "UpgradeRequest_status_idx" ON "UpgradeRequest"("status");

-- CreateIndex
CREATE INDEX "UpgradeRequest_organizationId_idx" ON "UpgradeRequest"("organizationId");

-- CreateIndex
CREATE INDEX "UpgradeRequest_createdAt_idx" ON "UpgradeRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "ClientOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

