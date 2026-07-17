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
}
