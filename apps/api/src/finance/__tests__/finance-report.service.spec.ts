import { FinanceReportService } from '../finance-report.service';

describe('FinanceReportService', () => {
  let service: FinanceReportService;
  let repo: { monthlyTotals: jest.Mock; netWorth: jest.Mock };

  beforeEach(() => {
    repo = { monthlyTotals: jest.fn(), netWorth: jest.fn() };
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
});
