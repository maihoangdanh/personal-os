-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "relatedEntityId" UUID,
ADD COLUMN     "relatedEntityType" VARCHAR(50),
ADD COLUMN     "scheduledFor" TIMESTAMPTZ(6),
ADD COLUMN     "sentAt" TIMESTAMPTZ(6),
ADD COLUMN     "snoozedUntil" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "notifications_scheduledFor_idx" ON "notifications"("scheduledFor");
