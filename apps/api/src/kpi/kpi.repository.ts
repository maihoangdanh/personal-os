import { Injectable } from '@nestjs/common';
import { KPI, prisma, Prisma } from '@personal-os/database';

/** Scopes KPIs to the owning user via KPI -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.KPIWhereInput {
  return { goal: { vision: { userId } } };
}

/** Only place that touches prisma for the KPI domain. Filters deletedAt: null. */
@Injectable()
export class KpiRepository {
  async isGoalOwned(goalId: string, userId: string): Promise<boolean> {
    const g = await prisma.goal.findFirst({
      where: { id: goalId, deletedAt: null, vision: { userId } },
      select: { id: true },
    });
    return g !== null;
  }

  create(data: Prisma.KPIUncheckedCreateInput): Promise<KPI> {
    return prisma.kPI.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<KPI | null> {
    return prisma.kPI.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
    goalId?: string,
  ): Promise<{ items: KPI[]; total: number }> {
    const where: Prisma.KPIWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (goalId) where.goalId = goalId;

    const [items, total] = await Promise.all([
      prisma.kPI.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.kPI.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.KPIUncheckedUpdateInput): Promise<KPI> {
    return prisma.kPI.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<KPI> {
    return prisma.kPI.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
