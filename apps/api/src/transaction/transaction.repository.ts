import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  prisma,
  Prisma,
  Transaction,
  TransactionType,
} from '@personal-os/database';
import { persistWalletBalance } from '../common/finance';

/** Scopes transactions to the owning user via Transaction -> Wallet. */
function ownedByUser(userId: string): Prisma.TransactionWhereInput {
  return { wallet: { userId } };
}

export interface TransactionListFilter {
  page: number;
  pageSize: number;
  sortOrder: 'asc' | 'desc';
  walletId?: string;
  type?: TransactionType;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TransferInput {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  category: string | null;
  description: string | null;
  transactionDate: Date;
}

/** Only place that touches prisma for the transaction domain. Filters deletedAt: null. */
@Injectable()
export class TransactionRepository {
  async findOwnedWalletId(walletId: string, userId: string): Promise<string | null> {
    const w = await prisma.wallet.findFirst({
      where: { id: walletId, userId, deletedAt: null },
      select: { id: true },
    });
    return w?.id ?? null;
  }

  findByIdScoped(id: string, userId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    filter: TransactionListFilter,
  ): Promise<{ items: Transaction[]; total: number }> {
    const where: Prisma.TransactionWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (filter.walletId) where.walletId = filter.walletId;
    if (filter.type) where.type = filter.type;
    if (filter.category) {
      where.category = { equals: filter.category, mode: 'insensitive' };
    }
    if (filter.dateFrom || filter.dateTo) {
      where.transactionDate = {
        ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
        ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
      };
    }
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { transactionDate: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);
    return { items, total };
  }

  /** Create a single transaction and recompute its wallet balance atomically. */
  create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({ data });
      await persistWalletBalance(tx, created.walletId);
      return created;
    });
  }

  /**
   * Transfer: two linked legs (EXPENSE from source, INCOME to destination)
   * sharing a transferGroupId, plus both wallet balances — all atomic.
   */
  transfer(input: TransferInput): Promise<{ from: Transaction; to: Transaction }> {
    const transferGroupId = randomUUID();
    return prisma.$transaction(async (tx) => {
      const from = await tx.transaction.create({
        data: {
          walletId: input.fromWalletId,
          type: TransactionType.EXPENSE,
          amount: input.amount,
          category: input.category,
          description: input.description,
          transactionDate: input.transactionDate,
          transferGroupId,
        },
      });
      const to = await tx.transaction.create({
        data: {
          walletId: input.toWalletId,
          type: TransactionType.INCOME,
          amount: input.amount,
          category: input.category,
          description: input.description,
          transactionDate: input.transactionDate,
          transferGroupId,
        },
      });
      await persistWalletBalance(tx, input.fromWalletId);
      await persistWalletBalance(tx, input.toWalletId);
      return { from, to };
    });
  }

  /** Update + recompute affected wallet balances (old + new wallet) atomically. */
  update(
    id: string,
    data: Prisma.TransactionUncheckedUpdateInput,
    affectedWalletIds: string[],
  ): Promise<Transaction> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({ where: { id }, data });
      const walletIds = new Set<string>([updated.walletId, ...affectedWalletIds]);
      for (const w of walletIds) await persistWalletBalance(tx, w);
      return updated;
    });
  }

  /**
   * Soft-delete a transaction and recompute balances. If it is a transfer leg,
   * BOTH legs are deleted and both wallets recomputed (atomic).
   */
  softDelete(txn: Transaction): Promise<{ deletedIds: string[] }> {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      if (txn.transferGroupId) {
        const legs = await tx.transaction.findMany({
          where: { transferGroupId: txn.transferGroupId, deletedAt: null },
          select: { id: true, walletId: true },
        });
        await tx.transaction.updateMany({
          where: { transferGroupId: txn.transferGroupId, deletedAt: null },
          data: { deletedAt: now },
        });
        const walletIds = new Set(legs.map((l) => l.walletId));
        for (const w of walletIds) await persistWalletBalance(tx, w);
        return { deletedIds: legs.map((l) => l.id) };
      }
      await tx.transaction.update({ where: { id: txn.id }, data: { deletedAt: now } });
      await persistWalletBalance(tx, txn.walletId);
      return { deletedIds: [txn.id] };
    });
  }
}
