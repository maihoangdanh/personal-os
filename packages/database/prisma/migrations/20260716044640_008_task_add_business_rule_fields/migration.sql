-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "completedAt" TIMESTAMPTZ(6),
ADD COLUMN     "estimateMinute" INTEGER;
