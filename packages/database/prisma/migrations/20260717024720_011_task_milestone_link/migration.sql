-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "milestoneId" UUID;

-- CreateIndex
CREATE INDEX "tasks_milestoneId_idx" ON "tasks"("milestoneId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
