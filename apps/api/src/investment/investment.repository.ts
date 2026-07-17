import { Injectable } from '@nestjs/common';
import { Investment, prisma, Prisma } from '@personal-os/database';

/** Only place that touches prisma for the investment domain. Filters deletedAt: null. */
@Injectable()
export class InvestmentRepository {
  create(data: Prisma.InvestmentUncheckedCreateInput): Promise<Investment> {
    return prisma.investment.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Investment | null> {
    return prisma.investment.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<{ items: Investment[]; total: number }> {
    const where: Prisma.InvestmentWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.investment.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.InvestmentUncheckedUpdateInput): Promise<Investment> {
    return prisma.investment.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Investment> {
    return prisma.investment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
