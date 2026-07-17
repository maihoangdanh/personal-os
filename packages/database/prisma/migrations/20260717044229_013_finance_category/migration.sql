-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "category" VARCHAR(100);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "category" VARCHAR(100);

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");
