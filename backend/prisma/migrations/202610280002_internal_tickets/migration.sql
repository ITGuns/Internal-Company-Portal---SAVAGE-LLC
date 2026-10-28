-- Internal tickets (2026-10-28): concerns a member raises with a supervisor from
-- the org chart (/org-chart, /concerns), with their message thread. Additive only.

-- CreateTable
CREATE TABLE "InternalTicket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "InternalTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalTicket_number_key" ON "InternalTicket"("number");

-- CreateIndex
CREATE INDEX "InternalTicket_assigneeId_idx" ON "InternalTicket"("assigneeId");

-- CreateIndex
CREATE INDEX "InternalTicket_requesterId_idx" ON "InternalTicket"("requesterId");

-- CreateIndex
CREATE INDEX "InternalTicket_status_idx" ON "InternalTicket"("status");

-- CreateIndex
CREATE INDEX "InternalTicketMessage_ticketId_createdAt_idx" ON "InternalTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalTicketMessage_authorId_idx" ON "InternalTicketMessage"("authorId");

-- AddForeignKey
ALTER TABLE "InternalTicket" ADD CONSTRAINT "InternalTicket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicket" ADD CONSTRAINT "InternalTicket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketMessage" ADD CONSTRAINT "InternalTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InternalTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketMessage" ADD CONSTRAINT "InternalTicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
