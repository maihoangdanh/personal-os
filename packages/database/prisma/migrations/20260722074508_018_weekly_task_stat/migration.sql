-- CreateTable
CREATE TABLE "weekly_task_stats" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weekStart" VARCHAR(10) NOT NULL,
    "completedCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weekly_task_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_task_stats_userId_weekStart_key" ON "weekly_task_stats"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "weekly_task_stats" ADD CONSTRAINT "weekly_task_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
