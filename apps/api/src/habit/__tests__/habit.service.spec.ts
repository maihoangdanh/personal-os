import { ConflictException, NotFoundException } from '@nestjs/common';
import { computeStreak, toDateKey } from '../habit-date.util';
import { HabitService } from '../habit.service';

const utc = (s: string) => new Date(`${s}T00:00:00.000Z`);

const makeHabit = (over: Partial<any> = {}) => ({
  id: 'habit-1',
  userId: 'user-1',
  name: 'Read',
  description: null,
  frequency: 'DAILY',
  targetPerPeriod: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...over,
});

const makeLog = (over: Partial<any> = {}) => ({
  id: 'log-1',
  habitId: 'habit-1',
  logDate: utc('2026-07-16'),
  value: 1,
  note: null,
  createdAt: new Date('2026-07-16T08:00:00Z'),
  updatedAt: new Date('2026-07-16T08:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('computeStreak', () => {
  const today = utc('2026-07-16');

  it('returns 0 with no logs', () => {
    expect(computeStreak([], today)).toEqual({
      currentStreak: 0,
      lastLogDate: null,
      checkedInToday: false,
    });
  });

  it('counts consecutive days ending today', () => {
    const logs = [utc('2026-07-16'), utc('2026-07-15'), utc('2026-07-14')];
    const res = computeStreak(logs, today);
    expect(res.currentStreak).toBe(3);
    expect(res.checkedInToday).toBe(true);
    expect(res.lastLogDate).toBe('2026-07-16');
  });

  it('keeps the streak alive when the latest log is yesterday (not checked in today)', () => {
    const logs = [utc('2026-07-15'), utc('2026-07-14')];
    const res = computeStreak(logs, today);
    expect(res.currentStreak).toBe(2);
    expect(res.checkedInToday).toBe(false);
  });

  it('breaks the streak (0) when the latest log is older than yesterday', () => {
    const logs = [utc('2026-07-13'), utc('2026-07-12')];
    const res = computeStreak(logs, today);
    expect(res.currentStreak).toBe(0);
    expect(res.checkedInToday).toBe(false);
    expect(res.lastLogDate).toBe('2026-07-13');
  });

  it('stops counting at the first gap', () => {
    const logs = [
      utc('2026-07-16'),
      utc('2026-07-15'),
      utc('2026-07-13'), // gap at 14th
      utc('2026-07-12'),
    ];
    expect(computeStreak(logs, today).currentStreak).toBe(2);
  });

  it('de-duplicates same-day logs', () => {
    const logs = [utc('2026-07-16'), utc('2026-07-16'), utc('2026-07-15')];
    expect(computeStreak(logs, today).currentStreak).toBe(2);
  });
});

describe('HabitService', () => {
  let service: HabitService;
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
      findLogForDate: jest.fn(),
      createLog: jest.fn(),
      findLogDates: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new HabitService(repo as any, audit as any);
  });

  describe('create', () => {
    it('applies defaults and audits habit.create', async () => {
      repo.create.mockImplementation(async (data: any) => makeHabit(data));
      const res = await service.create(userId, { name: 'Read' } as any);

      const created = repo.create.mock.calls[0][0];
      expect(created.frequency).toBe('DAILY');
      expect(created.targetPerPeriod).toBe(1);
      expect(created.userId).toBe(userId);
      expect(res.name).toBe('Read');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'habit.create' }),
      );
    });
  });

  describe('get', () => {
    it('throws 404 when habit not owned', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.get(userId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('checkin', () => {
    it('rejects a duplicate same-day check-in with 409', async () => {
      repo.findByIdScoped.mockResolvedValue(makeHabit());
      repo.findLogForDate.mockResolvedValue(makeLog());
      await expect(
        service.checkin(userId, 'habit-1', {} as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.createLog).not.toHaveBeenCalled();
    });

    it('creates a log for today and audits habit.checkin', async () => {
      repo.findByIdScoped.mockResolvedValue(makeHabit());
      repo.findLogForDate.mockResolvedValue(null);
      repo.createLog.mockImplementation(async (data: any) => makeLog(data));

      const res = await service.checkin(userId, 'habit-1', { note: 'done' } as any);

      const created = repo.createLog.mock.calls[0][0];
      expect(created.habitId).toBe('habit-1');
      expect(created.value).toBe(1);
      expect(toDateKey(created.logDate)).toBe(toDateKey(new Date()));
      expect(res.note).toBe('done');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'habit.checkin' }),
      );
    });
  });

  describe('streak', () => {
    it('returns the computed streak for the habit', async () => {
      const today = new Date();
      const key = (d: Date) => new Date(d.getTime());
      repo.findByIdScoped.mockResolvedValue(makeHabit());
      repo.findLogDates.mockResolvedValue([{ logDate: key(today) }]);

      const res = await service.streak(userId, 'habit-1');
      expect(res.habitId).toBe('habit-1');
      expect(res.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });
});
