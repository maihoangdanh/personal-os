-- CreateTable
CREATE TABLE "networth_snapshots" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "netWorth" DECIMAL(18,2) NOT NULL,
    "walletTotal" DECIMAL(18,2) NOT NULL,
    "investmentTotal" DECIMAL(18,2) NOT NULL,
    "assetTotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "networth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "networth_snapshots_userId_month_key" ON "networth_snapshots"("userId", "month");

-- AddForeignKey
ALTER TABLE "networth_snapshots" ADD CONSTRAINT "networth_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
