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

  /** Net Worth = Σ wallet.balance + Σ investment.currentValue + Σ asset.value. */
  async netWorth(userId: string) {
    const nw = await this.repo.netWorth(userId);
    return {
      netWorth: round2(nw.netWorth),
      walletTotal: round2(nw.walletTotal),
      investmentTotal: round2(nw.investmentTotal),
      assetTotal: round2(nw.assetTotal),
    };
  }
}
