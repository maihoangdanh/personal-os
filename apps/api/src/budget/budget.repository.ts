import { Injectable } from '@nestjs/common';
import { Budget, prisma, Prisma } from '@personal-os/database';
import { sumRealized } from '../common/finance';

/** Only place that touches prisma for the budget domain. Filters deletedAt: null. */
@Injectable()
export class BudgetRepository {
  create(data: Prisma.BudgetUncheckedCreateInput): Promise<Budget> {
    return prisma.budget.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Budget | null> {
    return prisma.budget.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
    category?: string,
  ): Promise<{ items: Budget[]; total: number }> {
    const where: Prisma.BudgetWhereInput = { userId, deletedAt: null };
    if (category) where.category = { equals: category, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.budget.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.BudgetUncheckedUpdateInput): Promise<Budget> {
    return prisma.budget.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Budget> {
    return prisma.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Actual spending against a budget: Σ EXPENSE in [from,to], excluding transfers.
   * category null => overall spending (all categories).
   */
  async computeActual(
    userId: string,
    category: string | null,
    from: Date,
    to: Date,
  ): Promise<number> {
    const total = await sumRealized(prisma, {
      userId,
      type: 'EXPENSE',
      from,
      to,
      category: category ?? undefined,
    });
    return total.toNumber();
  }
}
