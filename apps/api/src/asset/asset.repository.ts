import { Injectable } from '@nestjs/common';
import { Asset, prisma, Prisma } from '@personal-os/database';

/** Only place that touches prisma for the asset domain. Filters deletedAt: null. */
@Injectable()
export class AssetRepository {
  create(data: Prisma.AssetUncheckedCreateInput): Promise<Asset> {
    return prisma.asset.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Asset | null> {
    return prisma.asset.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
  ): Promise<{ items: Asset[]; total: number }> {
    const where: Prisma.AssetWhereInput = { userId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.asset.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.AssetUncheckedUpdateInput): Promise<Asset> {
    return prisma.asset.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
