import { UnprocessableEntityException } from '@nestjs/common';
import { RecurrenceFrequency } from '@personal-os/database';
import { RecurringTaskService } from '../recurring-task.service';

const userId = 'user-1';

function makeTemplate(over: Partial<any> = {}) {
  return {
    id: 'tpl-1',
    projectId: 'proj-1',
    title: 'Check TikTok Ads',
    description: null,
    impact: 3,
    urgency: 4,
    estimateMinute: 15,
    frequency: RecurrenceFrequency.DAILY,
    weekDays: [],
    timeOfDay: null,
    active: true,
    lastGeneratedDate: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...over,
  };
}

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let repo: Record<string, jest.Mock>;
  let taskRepo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };

  beforeEach(() => {
    repo = {
      findOwnedProjectId: jest.fn(),
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      update: jest.fn(),
      findAllActive: jest.fn(),
    };
    taskRepo = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      update: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new RecurringTaskService(repo as any, taskRepo as any, audit as any);
  });

  describe('create', () => {
    it('rejects WEEKLY with empty weekDays (422)', async () => {
      repo.findOwnedProjectId.mockResolvedValue({ id: 'proj-1' });
      await expect(
        service.create(userId, {
          title: 'x',
          impact: 3,
          urgency: 3,
          projectId: 'proj-1',
          frequency: RecurrenceFrequency.WEEKLY,
          weekDays: [],
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a projectId the user does not own (404)', async () => {
      repo.findOwnedProjectId.mockResolvedValue(null);
      await expect(
        service.create(userId, {
          title: 'x',
          impact: 3,
          urgency: 3,
          projectId: 'not-owned',
          frequency: RecurrenceFrequency.DAILY,
        } as any),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('matchesToday (via maybeGenerateToday)', () => {
    it('DAILY always generates when not yet generated today', async () => {
      const tpl = makeTemplate({ frequency: RecurrenceFrequency.DAILY, lastGeneratedDate: null });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(
        'tpl-1',
        expect.objectContaining({ lastGeneratedDate: expect.any(Date) }),
      );
    });

    it('does not generate twice on the same day', async () => {
      const today = new Date();
      const tpl = makeTemplate({ lastGeneratedDate: today });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it('WEEKLY only generates when today matches weekDays', async () => {
      // Pick a weekday NOT today so it should skip.
      const isoToday = ((new Date().getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
      const otherDay = isoToday === 1 ? 2 : 1;
      const tpl = makeTemplate({
        frequency: RecurrenceFrequency.WEEKLY,
        weekDays: [otherDay],
        lastGeneratedDate: null,
      });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it('copies impact/urgency/estimateMinute/projectId and computes priorityScore', async () => {
      const tpl = makeTemplate({ impact: 2, urgency: 5, estimateMinute: 20 });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'Check TikTok Ads',
          impact: 2,
          urgency: 5,
          priorityScore: 10,
          estimateMinute: 20,
          status: 'TODO',
          recurringTemplateId: 'tpl-1',
        }),
      );
    });
  });

  describe('stop', () => {
    it('sets active=false', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTemplate());
      repo.update.mockResolvedValue(makeTemplate({ active: false }));
      const res = await service.stop(userId, 'tpl-1');
      expect(repo.update).toHaveBeenCalledWith('tpl-1', { active: false });
      expect(res.active).toBe(false);
    });

    it('throws 404 when template not owned/found', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.stop(userId, 'tpl-x')).rejects.toThrow('Recurring task not found');
    });
  });
});
