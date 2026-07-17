import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@personal-os/database';
import { ProjectService } from '../project.service';

const makeProject = (over: Partial<any> = {}) => ({
  id: 'proj-1',
  goalId: 'goal-1',
  title: 'Launch',
  status: ProjectStatus.ACTIVE,
  progress: new Prisma.Decimal(40),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('ProjectService', () => {
  let service: ProjectService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'user-1';

  beforeEach(() => {
    repo = {
      isGoalOwned: jest.fn(),
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countDoingTasks: jest.fn(),
      countActiveTasks: jest.fn(),
      computeProgress: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new ProjectService(repo as any, audit as any);
  });

  it('rejects create when the goal is not owned (404)', async () => {
    repo.isGoalOwned.mockResolvedValue(false);
    await expect(
      service.create(userId, { goalId: 'g-x', title: 'T' } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks COMPLETED while a task is DOING (422)', async () => {
    repo.findByIdScoped.mockResolvedValue(makeProject());
    repo.countDoingTasks.mockResolvedValue(1);
    await expect(
      service.update(userId, 'proj-1', { status: ProjectStatus.COMPLETED } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('allows COMPLETED when no task is DOING', async () => {
    repo.findByIdScoped.mockResolvedValue(makeProject());
    repo.countDoingTasks.mockResolvedValue(0);
    repo.update.mockResolvedValue(makeProject({ status: ProjectStatus.COMPLETED }));
    const res = await service.update(userId, 'proj-1', {
      status: ProjectStatus.COMPLETED,
    } as any);
    expect(res.status).toBe(ProjectStatus.COMPLETED);
  });

  it('exposes computed progress breakdown', async () => {
    repo.findByIdScoped.mockResolvedValue(makeProject());
    repo.computeProgress.mockResolvedValue({
      progress: 66.67,
      doneTasks: 2,
      totalTasks: 3,
    });
    const res = await service.getProgress(userId, 'proj-1');
    expect(res).toEqual({
      projectId: 'proj-1',
      progress: 66.67,
      doneTasks: 2,
      totalTasks: 3,
    });
  });
});
