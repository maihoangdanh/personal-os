import { FinanceReportService } from '../finance-report.service';

describe('FinanceReportService', () => {
  let service: FinanceReportService;
  let repo: {
    monthlyTotals: jest.Mock;
    netWorth: jest.Mock;
    upsertNetWorthSnapshot: jest.Mock;
    netWorthSnapshotForMonth: jest.Mock;
    netWorthHistory: jest.Mock;
    transactionsInRange: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      monthlyTotals: jest.fn(),
      netWorth: jest.fn(),
      upsertNetWorthSnapshot: jest.fn().mockResolvedValue(undefined),
      netWorthSnapshotForMonth: jest.fn().mockResolvedValue(null),
      netWorthHistory: jest.fn().mockResolvedValue([]),
      transactionsInRange: jest.fn(),
    };
    service = new FinanceReportService(repo as any);
  });

  it('computes profit and saving rate = (income − expense)/income', async () => {
    repo.monthlyTotals.mockResolvedValue({ income: 1000, expense: 600 });
    const res = await service.monthlyReport('u1', '2026-01');
    expect(res.month).toBe('2026-01');
    expect(res.income).toBe(1000);
    expect(res.expense).toBe(600);
    expect(res.profit).toBe(400);
    expect(res.savingRate).toBe(0.4);
    expect(res.savingRatePercent).toBe(40);
  });

  it('returns saving rate 0 when income is 0 (no divide-by-zero)', async () => {
    repo.monthlyTotals.mockResolvedValue({ income: 0, expense: 200 });
    const res = await service.monthlyReport('u1', '2026-02');
    expect(res.savingRate).toBe(0);
    expect(res.profit).toBe(-200);
  });

  it('passes a correct UTC month range to the repository', async () => {
    repo.monthlyTotals.mockResolvedValue({ income: 0, expense: 0 });
    await service.monthlyReport('u1', '2026-03');
    const [, from, to] = repo.monthlyTotals.mock.calls[0];
    expect((from as Date).toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect((to as Date).toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });

  it('rounds net worth components', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 5200.005,
      walletTotal: 700,
      investmentTotal: 1500,
      assetTotal: 3000,
    });
    const res = await service.netWorth('u1');
    expect(res.netWorth).toBe(5200.01);
  });

  it('upserts a snapshot for the current UTC month', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 1000,
      walletTotal: 1000,
      investmentTotal: 0,
      assetTotal: 0,
    });
    await service.netWorth('u1');
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(repo.upsertNetWorthSnapshot).toHaveBeenCalledWith('u1', month, {
      netWorth: 1000,
      walletTotal: 1000,
      investmentTotal: 0,
      assetTotal: 0,
    });
  });

  it('returns null previousMonth/changePercent when no prior snapshot exists', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 1000,
      walletTotal: 1000,
      investmentTotal: 0,
      assetTotal: 0,
    });
    repo.netWorthSnapshotForMonth.mockResolvedValue(null);
    const res = await service.netWorth('u1');
    expect(res.previousMonth).toBeNull();
    expect(res.changePercent).toBeNull();
  });

  it('computes MoM changePercent rounded to 1 decimal when prior snapshot exists', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 1068,
      walletTotal: 1068,
      investmentTotal: 0,
      assetTotal: 0,
    });
    repo.netWorthSnapshotForMonth.mockResolvedValue({ month: '2026-06', netWorth: 1000 });
    const res = await service.netWorth('u1');
    // (1068 - 1000) / 1000 * 100 = 6.8
    expect(res.previousMonth).toEqual({ month: '2026-06', netWorth: 1000 });
    expect(res.changePercent).toBe(6.8);
  });

  it('changePercent is null when previous net worth is 0 (no divide-by-zero)', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 500,
      walletTotal: 500,
      investmentTotal: 0,
      assetTotal: 0,
    });
    repo.netWorthSnapshotForMonth.mockResolvedValue({ month: '2026-06', netWorth: 0 });
    const res = await service.netWorth('u1');
    expect(res.changePercent).toBeNull();
  });

  it('queries the previous month accounting for the January year rollover', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
    repo.netWorth.mockResolvedValue({
      netWorth: 100,
      walletTotal: 100,
      investmentTotal: 0,
      assetTotal: 0,
    });
    await service.netWorth('u1');
    expect(repo.netWorthSnapshotForMonth).toHaveBeenCalledWith('u1', '2025-12');
    expect(repo.upsertNetWorthSnapshot).toHaveBeenCalledWith('u1', '2026-01', expect.anything());
    jest.useRealTimers();
  });

  it('passes history through in repository order (oldest → newest)', async () => {
    repo.netWorth.mockResolvedValue({
      netWorth: 300,
      walletTotal: 300,
      investmentTotal: 0,
      assetTotal: 0,
    });
    const series = [
      { month: '2026-05', netWorth: 100 },
      { month: '2026-06', netWorth: 200 },
      { month: '2026-07', netWorth: 300 },
    ];
    repo.netWorthHistory.mockResolvedValue(series);
    const res = await service.netWorth('u1');
    expect(res.history).toEqual(series);
  });

  describe('dailyReport', () => {
    it('buckets income/expense by day, every day present even when empty', async () => {
      repo.transactionsInRange.mockResolvedValue([
        {
          type: 'INCOME',
          amount: { toNumber: () => 500000 } as any,
          transactionDate: new Date('2026-07-05T08:00:00Z'),
        },
        {
          type: 'EXPENSE',
          amount: { toNumber: () => 120000 } as any,
          transactionDate: new Date('2026-07-05T18:00:00Z'),
        },
        {
          type: 'EXPENSE',
          amount: { toNumber: () => 50000 } as any,
          transactionDate: new Date('2026-07-05T20:00:00Z'),
        },
      ]);

      const res = await service.dailyReport('u1', '2026-07');
      expect(res.month).toBe('2026-07');
      expect(res.days).toHaveLength(31);
      const day5 = res.days.find((d: any) => d.date === '2026-07-05')!;
      expect(day5.income).toBe(500000);
      expect(day5.expense).toBe(170000);
      const day1 = res.days.find((d: any) => d.date === '2026-07-01')!;
      expect(day1).toEqual({ date: '2026-07-01', income: 0, expense: 0 });
    });
  });
});
