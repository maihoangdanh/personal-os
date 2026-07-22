import { Injectable } from '@nestjs/common';
import { FinanceReportRepository } from './finance-report.repository';

/** Parse "YYYY-MM" (or default to current month) into a UTC [from, to] range. */
function monthRange(month?: string): { from: Date; to: Date; month: string } {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth(); // 0-based
  if (month) {
    const [yy, mm] = month.split('-').map(Number);
    y = yy;
    m = mm - 1;
  }
  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const label = `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from, to, month: label };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Current month as "YYYY-MM" in UTC. */
function currentMonthLabel(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Previous month as "YYYY-MM", handling the January → December year rollover. */
function previousMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  // m is 1-based; go back one full month. Date.UTC handles year rollover.
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class FinanceReportService {
  constructor(private readonly repo: FinanceReportRepository) {}

  /**
   * Monthly report computed at runtime from transactions (no stored report).
   * Income/Expense exclude transfer legs. Saving Rate = (Income − Expense)/Income
   * (0 when Income = 0).
   */
  async monthlyReport(userId: string, month?: string) {
    const { from, to, month: label } = monthRange(month);
    const { income, expense } = await this.repo.monthlyTotals(userId, from, to);
    const profit = round2(income - expense);
    const savingRate = income === 0 ? 0 : round2((income - expense) / income);
    return {
      month: label,
      period: { from: from.toISOString(), to: to.toISOString() },
      income: round2(income),
      expense: round2(expense),
      profit,
      savingRate, // ratio (multiply by 100 for %)
      savingRatePercent: round2(savingRate * 100),
    };
  }

  /**
   * Net Worth = Σ wallet.balance + Σ investment.currentValue + Σ asset.value.
   *
   * Side effect: upserts a NetWorthSnapshot for the current month so historical
   * trend data accumulates over time (each API call "snapshots" the latest
   * values). Response also carries MoM change + a trend series built from REAL
   * stored snapshots only — nothing is interpolated or padded.
   */
  async netWorth(userId: string) {
    const nw = await this.repo.netWorth(userId);
    const netWorth = round2(nw.netWorth);
    const walletTotal = round2(nw.walletTotal);
    const investmentTotal = round2(nw.investmentTotal);
    const assetTotal = round2(nw.assetTotal);

    const month = currentMonthLabel();
    await this.repo.upsertNetWorthSnapshot(userId, month, {
      netWorth,
      walletTotal,
      investmentTotal,
      assetTotal,
    });

    // Trend/history (includes the row just upserted). previousMonth is null when
    // no snapshot exists for last month yet — we never fabricate a value.
    const previousMonth = await this.repo.netWorthSnapshotForMonth(
      userId,
      previousMonthLabel(month),
    );
    const history = await this.repo.netWorthHistory(userId, 12);

    const changePercent =
      previousMonth && previousMonth.netWorth !== 0
        ? round1(((netWorth - previousMonth.netWorth) / previousMonth.netWorth) * 100)
        : null;

    return {
      netWorth,
      walletTotal,
      investmentTotal,
      assetTotal,
      previousMonth,
      changePercent,
      history,
    };
  }
}
