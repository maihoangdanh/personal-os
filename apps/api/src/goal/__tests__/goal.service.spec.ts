import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@personal-os/database';
import { GoalService } from '../goal.service';

const D = (n: number) => new Prisma.Decimal(n);

const makeGoal = (over: Partial<any> = {}) => ({
  id: 'goal-1',
  visionId: 'vis-1',
  title: 'Save money',
  targetValue: D(1000),
  currentValue: D(250),
  deadline: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('GoalService', () => {
  let service: GoalService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'user-1';

  beforeEach(() => {
    repo = {
      isVisionOwned: jest.fn(),
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countActiveProjects: jest.fn(),
      getProjectAvgProgressByGoalIds: jest
        .fn()
        .mockResolvedValue(new Map<string, number>()),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new GoalService(repo as any, audit as any);
  });

  it('rejects create when the vision is not owned (404)', async () => {
    repo.isVisionOwned.mockResolvedValue(false);
    await expect(
      service.create(userId, { visionId: 'vis-x', title: 'T' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('computes progress = current/target*100 capped at 100', async () => {
    repo.findByIdScoped.mockResolvedValue(makeGoal());
    const res = await service.getProgress(userId, 'goal-1');
    expect(res.progress).toBe(25); // 250 / 1000

    repo.findByIdScoped.mockResolvedValue(
      makeGoal({ currentValue: D(5000), targetValue: D(1000) }),
    );
    const capped = await service.getProgress(userId, 'goal-1');
    expect(capped.progress).toBe(100); // capped
  });

  it('progress is 0 when target is null or 0', async () => {
    repo.findByIdScoped.mockResolvedValue(
      makeGoal({ targetValue: null, currentValue: D(10) }),
    );
    expect((await service.getProgress(userId, 'goal-1')).progress).toBe(0);
  });

  it('KPI goal keeps current/target formula regardless of project average', async () => {
    // targetValue != null → must NOT query project average, must NOT change.
    repo.findByIdScoped.mockResolvedValue(
      makeGoal({ targetValue: D(1000), currentValue: D(400) }),
    );
    const res = await service.getProgress(userId, 'goal-1');
    expect(res.progress).toBe(40); // 400 / 1000
    expect(repo.getProjectAvgProgressByGoalIds).not.toHaveBeenCalled();
  });

  it('non-KPI goal uses average project progress when it has projects', async () => {
    repo.findByIdScoped.mockResolvedValue(
      makeGoal({ targetValue: null, currentValue: D(0) }),
    );
    repo.getProjectAvgProgressByGoalIds.mockResolvedValue(
      new Map([['goal-1', 50]]),
    );
    const res = await service.getProgress(userId, 'goal-1');
    expect(res.progress).toBe(50);
    expect(repo.getProjectAvgProgressByGoalIds).toHaveBeenCalledWith(['goal-1']);
  });

  it('non-KPI goal is 0% when it has no projects', async () => {
    repo.findByIdScoped.mockResolvedValue(
      makeGoal({ targetValue: null, currentValue: D(0) }),
    );
    repo.getProjectAvgProgressByGoalIds.mockResolvedValue(
      new Map([['goal-1', 0]]),
    );
    expect((await service.getProgress(userId, 'goal-1')).progress).toBe(0);
  });

  it('list() fetches project average only for non-KPI goals', async () => {
    const kpiGoal = makeGoal({ id: 'g-kpi', targetValue: D(200), currentValue: D(50) });
    const nonKpiGoal = makeGoal({ id: 'g-nokpi', targetValue: null, currentValue: D(0) });
    repo.findManyScoped.mockResolvedValue({
      items: [kpiGoal, nonKpiGoal],
      total: 2,
    });
    repo.getProjectAvgProgressByGoalIds.mockResolvedValue(
      new Map([['g-nokpi', 75]]),
    );
    const res = await service.list(userId, {
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    } as any);
    expect(repo.getProjectAvgProgressByGoalIds).toHaveBeenCalledWith(['g-nokpi']);
    const byId = Object.fromEntries(res.data.map((g) => [g.id, g.progress]));
    expect(byId['g-kpi']).toBe(25); // 50 / 200, unchanged formula
    expect(byId['g-nokpi']).toBe(75); // project average
  });

  it('blocks deletion when the goal still has projects (422)', async () => {
    repo.findByIdScoped.mockResolvedValue(makeGoal());
    repo.countActiveProjects.mockResolvedValue(2);
    await expect(service.remove(userId, 'goal-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
