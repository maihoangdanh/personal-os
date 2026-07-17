import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, TransactionType } from '@personal-os/database';
import { TransactionService } from '../transaction.service';

const makeTxn = (over: Partial<any> = {}) => ({
  id: 'txn-1',
  walletId: 'w1',
  type: TransactionType.EXPENSE,
  amount: new Prisma.Decimal(100),
  category: 'Food',
  description: null,
  transactionDate: new Date('2026-01-10T00:00:00Z'),
  transferGroupId: null,
  createdAt: new Date('2026-01-10T00:00:00Z'),
  updatedAt: new Date('2026-01-10T00:00:00Z'),
  deletedAt: null,
  ...over,
});

describe('TransactionService', () => {
  let service: TransactionService;
  let repo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };
  const userId = 'u1';

  beforeEach(() => {
    repo = {
      findOwnedWalletId: jest.fn(),
      findByIdScoped: jest.fn(),
      findManyScoped: jest.fn(),
      create: jest.fn(),
      transfer: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new TransactionService(repo as any, audit as any);
  });

  describe('create', () => {
    it('rejects amount <= 0 with 422', async () => {
      await expect(
        service.create(userId, { walletId: 'w1', type: 'EXPENSE', amount: 0 } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a wallet not owned with 404', async () => {
      repo.findOwnedWalletId.mockResolvedValue(null);
      await expect(
        service.create(userId, { walletId: 'wX', type: 'INCOME', amount: 10 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a valid transaction', async () => {
      repo.findOwnedWalletId.mockResolvedValue('w1');
      repo.create.mockResolvedValue(makeTxn());
      const res = await service.create(userId, {
        walletId: 'w1',
        type: 'EXPENSE',
        amount: 100,
        category: 'Food',
      } as any);
      expect(res.amount).toBe(100);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'transaction.create' }),
      );
    });
  });

  describe('transfer', () => {
    it('rejects same source and destination (422)', async () => {
      await expect(
        service.transfer(userId, { fromWalletId: 'w1', toWalletId: 'w1', amount: 10 } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects amount <= 0 (422)', async () => {
      await expect(
        service.transfer(userId, { fromWalletId: 'w1', toWalletId: 'w2', amount: -5 } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects when a wallet is not owned (404)', async () => {
      repo.findOwnedWalletId.mockResolvedValueOnce('w1').mockResolvedValueOnce(null);
      await expect(
        service.transfer(userId, { fromWalletId: 'w1', toWalletId: 'wX', amount: 10 } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates two linked legs on a valid transfer', async () => {
      repo.findOwnedWalletId.mockResolvedValue('ok');
      repo.transfer.mockResolvedValue({
        from: makeTxn({ id: 'a', walletId: 'w1', type: 'EXPENSE', transferGroupId: 'g1' }),
        to: makeTxn({ id: 'b', walletId: 'w2', type: 'INCOME', transferGroupId: 'g1' }),
      });
      const res = await service.transfer(userId, {
        fromWalletId: 'w1',
        toWalletId: 'w2',
        amount: 50,
      } as any);
      expect(res.transferGroupId).toBe('g1');
      expect(res.from.type).toBe('EXPENSE');
      expect(res.to.type).toBe('INCOME');
    });
  });

  describe('update', () => {
    it('blocks editing a transfer leg (422)', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTxn({ transferGroupId: 'g1' }));
      await expect(
        service.update(userId, 'txn-1', { amount: 20 } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });
});
