import { Injectable } from '@nestjs/common';
import { AiSummary, AiSummaryType, Prisma, prisma } from '@personal-os/database';

/** Only place the AI summary domain touches prisma. Filters deletedAt: null on reads. */
@Injectable()
export class AiSummaryRepository {
  /**
   * One summary per (user, type, periodStart) — regenerate = upsert (schema
   * @@unique). Also clears deletedAt so a regenerated summary revives cleanly.
   */
  upsert(
    userId: string,
    type: AiSummaryType,
    periodStart: Date,
    periodEnd: Date,
    content: string,
    metadata: Prisma.InputJsonValue,
  ): Promise<AiSummary> {
    return prisma.aiSummary.upsert({
      where: { userId_type_periodStart: { userId, type, periodStart } },
      update: { periodEnd, content, metadata, deletedAt: null },
      create: { userId, type, periodStart, periodEnd, content, metadata },
    });
  }

  findScoped(id: string, userId: string): Promise<AiSummary | null> {
    return prisma.aiSummary.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async list(
    userId: string,
    type: AiSummaryType | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ items: AiSummary[]; total: number }> {
    const where: Prisma.AiSummaryWhereInput = { userId, deletedAt: null };
    if (type) where.type = type;
    const [items, total] = await Promise.all([
      prisma.aiSummary.findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.aiSummary.count({ where }),
    ]);
    return { items, total };
  }
}
