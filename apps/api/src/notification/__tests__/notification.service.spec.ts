import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@personal-os/database';
import { NotificationService } from '../notification.service';

const makeNotification = (over: Partial<any> = {}) => ({
  id: 'notif-1',
  userId: 'user-1',
  type: NotificationType.REMINDER,
  title: 'Stand up',
  message: null,
  isRead: false,
  readAt: null,
  scheduledFor: new Date('2026-07-16T09:00:00Z'),
  sentAt: null,
  snoozedUntil: null,
  relatedEntityType: null,
  relatedEntityId: null,
  createdAt: new Date('2026-07-16T08:00:00Z'),
  updatedAt: new Date('2026-07-16T08:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'user-1';

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      countUnread: jest.fn(),
      findDue: jest.fn(),
      markManySent: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationService(repo as any, audit as any);
  });

  describe('create', () => {
    it('defaults type to REMINDER and audits notification.create', async () => {
      repo.create.mockImplementation(async (data: any) => makeNotification(data));
      const res = await service.create(userId, { title: 'Stand up' } as any);

      expect(repo.create.mock.calls[0][0].type).toBe(NotificationType.REMINDER);
      expect(res.title).toBe('Stand up');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'notification.create' }),
      );
    });
  });

  describe('markRead', () => {
    it('is a no-op when already read', async () => {
      repo.findByIdScoped.mockResolvedValue(makeNotification({ isRead: true }));
      await service.markRead(userId, 'notif-1');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('sets isRead + readAt when unread', async () => {
      repo.findByIdScoped.mockResolvedValue(makeNotification({ isRead: false }));
      repo.update.mockImplementation(async (_id, data) =>
        makeNotification({ ...data }),
      );
      await service.markRead(userId, 'notif-1');
      const data = repo.update.mock.calls[0][1];
      expect(data.isRead).toBe(true);
      expect(data.readAt).toBeInstanceOf(Date);
    });

    it('throws 404 when not owned', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.markRead(userId, 'x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('snooze', () => {
    it('re-arms the reminder: moves scheduledFor and clears sentAt', async () => {
      repo.findByIdScoped.mockResolvedValue(makeNotification({ sentAt: new Date() }));
      repo.update.mockImplementation(async (_id, data) =>
        makeNotification({ ...data }),
      );
      await service.snooze(userId, 'notif-1', {
        snoozedUntil: '2026-07-16T10:00:00Z',
      } as any);

      const data = repo.update.mock.calls[0][1];
      expect(data.snoozedUntil).toEqual(new Date('2026-07-16T10:00:00Z'));
      expect(data.scheduledFor).toEqual(new Date('2026-07-16T10:00:00Z'));
      expect(data.sentAt).toBeNull();
      expect(data.isRead).toBe(false);
    });
  });

  describe('dispatchDueReminders (cron logic)', () => {
    it('marks due reminders as sent and returns the count', async () => {
      const now = new Date('2026-07-16T09:00:00Z');
      repo.findDue.mockResolvedValue([
        { id: 'a', userId, title: 'A' },
        { id: 'b', userId, title: 'B' },
      ]);
      repo.markManySent.mockResolvedValue({ count: 2 });

      const processed = await service.dispatchDueReminders(now);

      expect(repo.findDue).toHaveBeenCalledWith(now);
      expect(repo.markManySent).toHaveBeenCalledWith(['a', 'b'], now);
      expect(processed).toBe(2);
    });

    it('does nothing when there are no due reminders', async () => {
      repo.findDue.mockResolvedValue([]);
      const processed = await service.dispatchDueReminders(new Date());
      expect(repo.markManySent).not.toHaveBeenCalled();
      expect(processed).toBe(0);
    });
  });
});
