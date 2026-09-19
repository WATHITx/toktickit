-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "itPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "ticketOwnerId" INTEGER;

-- CreateIndex
CREATE INDEX "Ticket_ticketOwnerId_idx" ON "Ticket"("ticketOwnerId");

-- CreateIndex
CREATE INDEX "Ticket_itPriority_idx" ON "Ticket"("itPriority");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
