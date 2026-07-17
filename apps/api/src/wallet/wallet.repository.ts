import { Injectable } from '@nestjs/common';
import { prisma, Prisma, Wallet } from '@personal-os/database';

/** Only place that touches prisma for the wallet domain. Filters deletedAt: null. */
@Injectable()
export class WalletRepository {
  create(data: Prisma.WalletUncheckedCreateInput): Promise<Wallet> {
    return prisma.wallet.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Wallet | null> {
    return prisma.wallet.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<{ items: Wallet[]; total: number }> {
    const where: Prisma.WalletWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.wallet.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.wallet.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.WalletUncheckedUpdateInput): Promise<Wallet> {
    return prisma.wallet.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Wallet> {
    return prisma.wallet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Active transactions on the wallet — blocks deletion when non-empty. */
  countActiveTransactions(walletId: string): Promise<number> {
    return prisma.transaction.count({ where: { walletId, deletedAt: null } });
  }
}
