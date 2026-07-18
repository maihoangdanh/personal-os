import { ConflictException, NotFoundException } from '@nestjs/common';
import { JournalService } from '../journal.service';

const makeJournal = (over: Partial<any> = {}) => ({
  id: 'j1',
  userId: 'u1',
  date: new Date('2026-01-15T00:00:00.000Z'),
  content: 'Today was good',
  mood: 'good',
  createdAt: new Date('2026-01-15T00:00:00Z'),
  updatedAt: new Date('2026-01-15T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('JournalService', () => {
  let service: JournalService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'u1';

  beforeEach(() => {
    repo = {
      findByDateAny: jest.fn(),
      create: jest.fn(),
      revive: jest.fn(),
      findByIdScoped: jest.fn(),
      findByDateScoped: jest.fn(),
      findManyScoped: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new JournalService(repo as any, audit as any);
  });

  describe('create', () => {
    it('creates a new entry when none exists for the date', async () => {
      repo.findByDateAny.mockResolvedValue(null);
      repo.create.mockResolvedValue(makeJournal());
      const res = await service.create(userId, {
        date: '2026-01-15',
        content: 'Today was good',
        mood: 'good',
      });
      expect(res.date).toBe('2026-01-15');
      expect(repo.create).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'journal.create' }),
      );
    });

    it('rejects a duplicate active entry with 409', async () => {
      repo.findByDateAny.mockResolvedValue(makeJournal({ deletedAt: null }));
      await expect(
        service.create(userId, { date: '2026-01-15', content: 'x' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('REVIVES a soft-deleted entry instead of inserting (unique slot)', async () => {
      repo.findByDateAny.mockResolvedValue(
        makeJournal({ id: 'old', deletedAt: new Date() }),
      );
      repo.revive.mockResolvedValue(makeJournal({ id: 'old', content: 'new text' }));
      const res = await service.create(userId, {
        date: '2026-01-15',
        content: 'new text',
      });
      expect(repo.revive).toHaveBeenCalledWith('old', 'new text', null);
      expect(repo.create).not.toHaveBeenCalled();
      expect(res.id).toBe('old');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'journal.revive' }),
      );
    });
  });

  describe('getByDate', () => {
    it('throws 404 when no entry exists for the date', async () => {
      repo.findByDateScoped.mockResolvedValue(null);
      await expect(service.getByDate(userId, '2026-01-20')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('get', () => {
    it('throws 404 when not in user scope', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.get(userId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
