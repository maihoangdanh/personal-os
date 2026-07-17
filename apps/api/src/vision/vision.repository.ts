import { Injectable } from '@nestjs/common';
import { prisma, Prisma, Vision } from '@personal-os/database';

/** Only place that touches prisma for the vision domain. Filters deletedAt: null. */
@Injectable()
export class VisionRepository {
  create(data: Prisma.VisionUncheckedCreateInput): Promise<Vision> {
    return prisma.vision.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Vision | null> {
    return prisma.vision.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<{ items: Vision[]; total: number }> {
    const where: Prisma.VisionWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.vision.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vision.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.VisionUncheckedUpdateInput): Promise<Vision> {
    return prisma.vision.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Vision> {
    return prisma.vision.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Active goals under a vision — blocks deletion when non-empty. */
  countActiveGoals(visionId: string): Promise<number> {
    return prisma.goal.count({ where: { visionId, deletedAt: null } });
  }
}
