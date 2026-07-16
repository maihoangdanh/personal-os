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
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findActiveSubtasks: jest.fn(),
      findOpenTimeLog: jest.fn(),
      startTimer: jest.fn(),
      stopTimer: jest.fn(),
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
      );
      expect(res.status).toBe(TaskStatus.DONE);
    });
  });

  describe('timer flags on TaskResponseDto', () => {
    it('exposes isTimerRunning + activeTimeLogId when an open TimeLog exists', async () => {
      repo.findByIdScoped.mockResolvedValue(
        makeTask({ timeLogs: [{ id: 'log-9' }] }),
      );
      const res = await service.get(userId, 'task-1');
      expect(res.isTimerRunning).toBe(true);
      expect(res.activeTimeLogId).toBe('log-9');
    });

    it('reports no running timer when timeLogs is empty', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTask({ timeLogs: [] }));
      const res = await service.get(userId, 'task-1');
      expect(res.isTimerRunning).toBe(false);
      expect(res.activeTimeLogId).toBeNull();
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
});
