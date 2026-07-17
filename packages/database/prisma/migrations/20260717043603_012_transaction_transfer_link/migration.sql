-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "transferGroupId" UUID;

-- CreateIndex
CREATE INDEX "transactions_transferGroupId_idx" ON "transactions"("transferGroupId");
