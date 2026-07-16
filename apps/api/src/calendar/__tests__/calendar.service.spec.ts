import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CalendarService } from '../calendar.service';

const makeEvent = (over: Partial<any> = {}) => ({
  id: 'evt-1',
  userId: 'user-1',
  title: 'Meeting',
  description: null,
  startTime: new Date('2026-07-16T09:00:00Z'),
  endTime: new Date('2026-07-16T10:00:00Z'),
  location: null,
  allDay: false,
  createdAt: new Date('2026-07-01T00:00:00Z'),
  updatedAt: new Date('2026-07-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('CalendarService', () => {
  let service: CalendarService;
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
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new CalendarService(repo as any, audit as any);
  });

  describe('create', () => {
    it('creates an event and audits calendar.create', async () => {
      repo.create.mockImplementation(async (data: any) => makeEvent(data));
      const res = await service.create(userId, {
        title: 'Meeting',
        startTime: '2026-07-16T09:00:00Z',
        endTime: '2026-07-16T10:00:00Z',
      } as any);

      expect(res.title).toBe('Meeting');
      expect(res.startTime).toBe('2026-07-16T09:00:00.000Z');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'calendar.create' }),
      );
    });

    it('rejects endTime not after startTime (422)', async () => {
      await expect(
        service.create(userId, {
          title: 'Bad',
          startTime: '2026-07-16T10:00:00Z',
          endTime: '2026-07-16T09:00:00Z',
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects endTime equal to startTime (422)', async () => {
      await expect(
        service.create(userId, {
          title: 'Zero',
          startTime: '2026-07-16T09:00:00Z',
          endTime: '2026-07-16T09:00:00Z',
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('allows an open-ended event (no endTime)', async () => {
      repo.create.mockImplementation(async (data: any) => makeEvent(data));
      const res = await service.create(userId, {
        title: 'Open',
        startTime: '2026-07-16T09:00:00Z',
      } as any);
      expect(res.endTime).toBeNull();
    });
  });

  describe('update', () => {
    it('validates the effective range using the existing startTime', async () => {
      repo.findByIdScoped.mockResolvedValue(
        makeEvent({ startTime: new Date('2026-07-16T09:00:00Z') }),
      );
      // Only endTime supplied, earlier than existing start -> 422.
      await expect(
        service.update(userId, 'evt-1', {
          endTime: '2026-07-16T08:00:00Z',
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('allows clearing endTime by passing null', async () => {
      repo.findByIdScoped.mockResolvedValue(makeEvent());
      repo.update.mockImplementation(async (_id, data) => makeEvent({ ...data }));
      const res = await service.update(userId, 'evt-1', {
        endTime: null,
      } as any);
      expect(res.endTime).toBeNull();
    });
  });

  describe('get', () => {
    it('throws 404 when not owned', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.get(userId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
