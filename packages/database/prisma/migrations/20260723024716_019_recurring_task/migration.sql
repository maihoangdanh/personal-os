-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "recurringTemplateId" UUID;

-- CreateTable
CREATE TABLE "recurring_task_templates" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "impact" SMALLINT NOT NULL,
    "urgency" SMALLINT NOT NULL,
    "estimateMinute" INTEGER,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "weekDays" INTEGER[],
    "timeOfDay" VARCHAR(5),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "recurring_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_task_templates_active_idx" ON "recurring_task_templates"("active");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "recurring_task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_task_templates" ADD CONSTRAINT "recurring_task_templates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
