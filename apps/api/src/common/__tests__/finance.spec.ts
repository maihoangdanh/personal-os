import { Prisma } from '@personal-os/database';
import {
  computeNetWorth,
  computeWalletBalance,
  sumRealized,
} from '../finance';

const D = (n: number) => new Prisma.Decimal(n);

describe('finance helpers', () => {
  describe('computeWalletBalance', () => {
    it('balance = Σincome − Σexpense', async () => {
      const tx = {
        transaction: {
          aggregate: jest
            .fn()
            .mockResolvedValueOnce({ _sum: { amount: D(1000) } }) // income
            .mockResolvedValueOnce({ _sum: { amount: D(300) } }), // expense
        },
      };
      const bal = await computeWalletBalance(tx as any, 'w1');
      expect(bal.toNumber()).toBe(700);
    });

    it('treats null sums as 0', async () => {
      const tx = {
        transaction: {
          aggregate: jest
            .fn()
            .mockResolvedValueOnce({ _sum: { amount: null } })
            .mockResolvedValueOnce({ _sum: { amount: null } }),
        },
      };
      expect((await computeWalletBalance(tx as any, 'w1')).toNumber()).toBe(0);
    });
  });

  describe('sumRealized', () => {
    it('ALWAYS filters transferGroupId: null (transfers excluded)', async () => {
      const aggregate = jest.fn().mockResolvedValue({ _sum: { amount: D(42) } });
      const client = { transaction: { aggregate } };
      const total = await sumRealized(client as any, {
        userId: 'u1',
        type: 'EXPENSE',
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
        category: 'Food',
      });
      expect(total.toNumber()).toBe(42);
      const where = aggregate.mock.calls[0][0].where;
      expect(where.transferGroupId).toBeNull();
      expect(where.type).toBe('EXPENSE');
      expect(where.wallet).toEqual({ userId: 'u1' });
      expect(where.category).toEqual({ equals: 'Food', mode: 'insensitive' });
    });
  });

  describe('computeNetWorth', () => {
    it('= Σ wallet.balance + Σ investment.currentValue + Σ asset.value', async () => {
      const client = {
        wallet: { aggregate: jest.fn().mockResolvedValue({ _sum: { balance: D(700) } }) },
        investment: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { currentValue: D(1500) } }),
        },
        asset: { aggregate: jest.fn().mockResolvedValue({ _sum: { value: D(3000) } }) },
      };
      const nw = await computeNetWorth(client as any, 'u1');
      expect(nw).toEqual({
        netWorth: 5200,
        walletTotal: 700,
        investmentTotal: 1500,
        assetTotal: 3000,
      });
    });
  });
});
