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

  it('blocks deletion when the goal still has projects (422)', async () => {
    repo.findByIdScoped.mockResolvedValue(makeGoal());
    repo.countActiveProjects.mockResolvedValue(2);
    await expect(service.remove(userId, 'goal-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
