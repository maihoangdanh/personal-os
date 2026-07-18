import { Injectable } from '@nestjs/common';
import { Journal, prisma, Prisma } from '@personal-os/database';

/** Only place that touches prisma for the journal domain. */
@Injectable()
export class JournalRepository {
  /** Find the (userId, date) row INCLUDING soft-deleted — used for revive-on-recreate. */
  findByDateAny(userId: string, date: Date): Promise<Journal | null> {
    return prisma.journal.findUnique({
      where: { userId_date: { userId, date } },
    });
  }

  create(data: Prisma.JournalUncheckedCreateInput): Promise<Journal> {
    return prisma.journal.create({ data });
  }

  /** Revive a soft-deleted entry (clear deletedAt) and overwrite its content/mood. */
  revive(id: string, content: string, mood: string | null): Promise<Journal> {
    return prisma.journal.update({
      where: { id },
      data: { deletedAt: null, content, mood },
    });
  }

  findByIdScoped(id: string, userId: string): Promise<Journal | null> {
    return prisma.journal.findFirst({ where: { id, userId, deletedAt: null } });
  }

  findByDateScoped(userId: string, date: Date): Promise<Journal | null> {
    return prisma.journal.findFirst({ where: { userId, date, deletedAt: null } });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<{ items: Journal[]; total: number }> {
    const where: Prisma.JournalWhereInput = { userId, deletedAt: null };
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    const [items, total] = await Promise.all([
      prisma.journal.findMany({
        where,
        orderBy: { date: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.journal.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.JournalUncheckedUpdateInput): Promise<Journal> {
    return prisma.journal.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Journal> {
    return prisma.journal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
