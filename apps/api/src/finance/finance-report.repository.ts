import { Injectable } from '@nestjs/common';
import { prisma } from '@personal-os/database';
import { computeNetWorth, sumRealized } from '../common/finance';

/** Read-only aggregation for finance reports. Transfers are excluded in sumRealized. */
@Injectable()
export class FinanceReportRepository {
  async monthlyTotals(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ income: number; expense: number }> {
    const [income, expense] = await Promise.all([
      sumRealized(prisma, { userId, type: 'INCOME', from, to }),
      sumRealized(prisma, { userId, type: 'EXPENSE', from, to }),
    ]);
    return { income: income.toNumber(), expense: expense.toNumber() };
  }

  netWorth(userId: string) {
    return computeNetWorth(prisma, userId);
  }

  /**
   * Upsert this user's Net Worth snapshot for the given month ("YYYY-MM").
   * One row per (userId, month) — keeps the latest values within the month so
   * historical trend accumulates over time without a separate cron/backfill.
   */
  async upsertNetWorthSnapshot(
    userId: string,
    month: string,
    totals: {
      netWorth: number;
      walletTotal: number;
      investmentTotal: number;
      assetTotal: number;
    },
  ): Promise<void> {
    await prisma.netWorthSnapshot.upsert({
      where: { userId_month: { userId, month } },
      create: { userId, month, ...totals },
      update: { ...totals },
    });
  }

  /** Snapshot for a specific month, or null if this user has none for it. */
  async netWorthSnapshotForMonth(
    userId: string,
    month: string,
  ): Promise<{ month: string; netWorth: number } | null> {
    const snap = await prisma.netWorthSnapshot.findUnique({
      where: { userId_month: { userId, month } },
      select: { month: true, netWorth: true },
    });
    return snap ? { month: snap.month, netWorth: snap.netWorth.toNumber() } : null;
  }

  /**
   * Up to `take` most-recent snapshots, returned oldest → newest (ascending by
   * month) for the trend chart. Returns however many exist (no padding).
   */
  async netWorthHistory(
    userId: string,
    take = 12,
  ): Promise<Array<{ month: string; netWorth: number }>> {
    const rows = await prisma.netWorthSnapshot.findMany({
      where: { userId },
      orderBy: { month: 'desc' },
      take,
      select: { month: true, netWorth: true },
    });
    return rows.map((r) => ({ month: r.month, netWorth: r.netWorth.toNumber() })).reverse();
  }
}
