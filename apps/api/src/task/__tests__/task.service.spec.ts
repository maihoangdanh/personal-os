import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TaskStatus } from '@personal-os/database';
import { TaskService } from '../task.service';

const makeTask = (over: Partial<any> = {}) => ({
  id: 'task-1',
  projectId: 'proj-inbox',
  parentTaskId: null,
  milestoneId: null,
  title: 'Test',
  description: null,
  impact: 3,
  urgency: 4,
  priorityScore: 12,
  status: TaskStatus.TODO,
  deadline: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('TaskService', () => {
  let service: TaskService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'user-1';

  beforeEach(() => {
    repo = {
      findInboxProjectId: jest.fn(),
      findOwnedProjectId: jest.fn(),
      findOwnedMilestone: jest.fn(),
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findActiveSubtasks: jest.fn(),
      findOpenTimeLog: jest.fn(),
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
      weeklyTaskCounts: jest.fn(),
      upsertWeeklyTaskStat: jest.fn().mockResolvedValue(undefined),
      findWeeklyTaskStat: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TaskService(repo as any, audit as any);
  });

  describe('create', () => {
    it('defaults to the Inbox project and computes priorityScore = impact × urgency', async () => {
      repo.findInboxProjectId.mockResolvedValue('proj-inbox');
      repo.create.mockImplementation(async (data: any) => makeTask(data));

      const res = await service.create(userId, {
        title: 'Buy milk',
        impact: 3,
        urgency: 5,
      } as any);

      expect(repo.findInboxProjectId).toHaveBeenCalledWith(userId);
      const created = repo.create.mock.calls[0][0];
      expect(created.projectId).toBe('proj-inbox');
      expect(created.priorityScore).toBe(15);
      expect(res.priorityScore).toBe(15);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'task.create' }),
      );
    });

    it('uses an explicit projectId when the user owns it', async () => {
      repo.findOwnedProjectId.mockResolvedValue('proj-x');
      repo.create.mockImplementation(async (data: any) => makeTask(data));

      await service.create(userId, {
        title: 'T',
        impact: 1,
        urgency: 1,
        projectId: 'proj-x',
      } as any);

      expect(repo.findOwnedProjectId).toHaveBeenCalledWith('proj-x', userId);
      expect(repo.create.mock.calls[0][0].projectId).toBe('proj-x');
    });

    it('assigns a milestone that belongs to the same project', async () => {
      repo.findOwnedProjectId.mockResolvedValue('proj-x');
      repo.findOwnedMilestone.mockResolvedValue({ id: 'ms-1', projectId: 'proj-x' });
      repo.create.mockImplementation(async (data: any) => makeTask(data));

      await service.create(userId, {
        title: 'T',
        impact: 1,
        urgency: 1,
        projectId: 'proj-x',
        milestoneId: 'ms-1',
      } as any);

      expect(repo.create.mock.calls[0][0].milestoneId).toBe('ms-1');
    });

    it('rejects a milestone from a different project (422)', async () => {
      repo.findOwnedProjectId.mockResolvedValue('proj-x');
      repo.findOwnedMilestone.mockResolvedValue({
        id: 'ms-1',
        projectId: 'proj-other',
      });
      await expect(
        service.create(userId, {
          title: 'T',
          impact: 1,
          urgency: 1,
          projectId: 'proj-x',
          milestoneId: 'ms-1',
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a projectId the user does not own with 404', async () => {
      repo.findOwnedProjectId.mockResolvedValue(null);
      await expect(
        service.create(userId, {
          title: 'T',
          impact: 1,
          urgency: 1,
          projectId: 'proj-foreign',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    it('throws 404 when task is not in the user scope', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.get(userId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('complete', () => {
    it('blocks completion when subtasks are not done (422)', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTask());
      repo.findActiveSubtasks.mockResolvedValue([
        makeTask({ id: 'sub-1', status: TaskStatus.TODO }),
      ]);
      await expect(service.complete(userId, 'task-1')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('completes when all subtasks are done', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTask());
      repo.findActiveSubtasks.mockResolvedValue([
        makeTask({ id: 'sub-1', status: TaskStatus.DONE }),
      ]);
      repo.update.mockResolvedValue(makeTask({ status: TaskStatus.DONE }));

      const res = await service.complete(userId, 'task-1');
      expect(repo.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({
          status: TaskStatus.DONE,
          completedAt: expect.any(Date),
        }),
        ['proj-inbox'],
        [],
      );
      expect(res.status).toBe(TaskStatus.DONE);
    });
  });

  describe('timer flags + spentMinute on TaskResponseDto', () => {
    it('exposes isTimerRunning + activeTimeLogId from the open TimeLog, and sums spentMinute', async () => {
      repo.findByIdScoped.mockResolvedValue(
        makeTask({
          timeLogs: [
            { id: 'log-open', endTime: null, durationMinutes: null }, // running
            { id: 'log-1', endTime: new Date(), durationMinutes: 30 },
            { id: 'log-2', endTime: new Date(), durationMinutes: 15 },
          ],
        }),
      );
      const res = await service.get(userId, 'task-1');
      expect(res.isTimerRunning).toBe(true);
      expect(res.activeTimeLogId).toBe('log-open');
      expect(res.spentMinute).toBe(45); // 30 + 15, running leg excluded
    });

    it('reports no running timer and spentMinute 0 when timeLogs is empty', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTask({ timeLogs: [] }));
      const res = await service.get(userId, 'task-1');
      expect(res.isTimerRunning).toBe(false);
      expect(res.activeTimeLogId).toBeNull();
      expect(res.spentMinute).toBe(0);
    });
  });

  describe('startTimer', () => {
    it('rejects when a timer is already running (409)', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTask());
      repo.findOpenTimeLog.mockResolvedValue({ id: 'log-1' });
      await expect(service.startTimer(userId, 'task-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('weeklyStats', () => {
    it('computes completionPercent and upserts this week, no previous week -> changePercent null', async () => {
      repo.weeklyTaskCounts.mockResolvedValue({ completedCount: 3, totalCount: 6 });
      repo.findWeeklyTaskStat.mockResolvedValue(null);
      const res = await service.weeklyStats(userId);
      expect(res.completedCount).toBe(3);
      expect(res.totalCount).toBe(6);
      expect(res.completionPercent).toBe(50);
      expect(res.previousWeek).toBeNull();
      expect(res.changePercent).toBeNull();
      expect(repo.upsertWeeklyTaskStat).toHaveBeenCalledWith(
        userId,
        expect.any(String),
        3,
        6,
      );
    });

    it('returns 0% when the week has no tasks (no division by zero)', async () => {
      repo.weeklyTaskCounts.mockResolvedValue({ completedCount: 0, totalCount: 0 });
      repo.findWeeklyTaskStat.mockResolvedValue(null);
      const res = await service.weeklyStats(userId);
      expect(res.completionPercent).toBe(0);
    });

    it('computes changePercent as the percentage-point delta vs previous week', async () => {
      repo.weeklyTaskCounts.mockResolvedValue({ completedCount: 6, totalCount: 10 }); // 60%
      repo.findWeeklyTaskStat.mockResolvedValue({
        weekStart: '2026-07-13',
        completedCount: 4,
        totalCount: 10, // 40%
      });
      const res = await service.weeklyStats(userId);
      expect(res.completionPercent).toBe(60);
      expect(res.previousWeek).toEqual({ weekStart: '2026-07-13', completionPercent: 40 });
      expect(res.changePercent).toBe(20); // 60 - 40
    });

    it('ignores a previous week snapshot that itself has totalCount 0', async () => {
      repo.weeklyTaskCounts.mockResolvedValue({ completedCount: 1, totalCount: 2 });
      repo.findWeeklyTaskStat.mockResolvedValue({
        weekStart: '2026-07-13',
        completedCount: 0,
        totalCount: 0,
      });
      const res = await service.weeklyStats(userId);
      expect(res.previousWeek).toBeNull();
      expect(res.changePercent).toBeNull();
    });
  });
});
