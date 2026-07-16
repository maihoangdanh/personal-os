import { Injectable } from '@nestjs/common';
import { CalendarEvent, Prisma, prisma } from '@personal-os/database';

export interface CalendarListFilter {
  from?: Date;
  to?: Date;
}

/** Only place that touches prisma for the calendar domain. Filters deletedAt: null. */
@Injectable()
export class CalendarRepository {
  create(
    data: Prisma.CalendarEventUncheckedCreateInput,
  ): Promise<CalendarEvent> {
    return prisma.calendarEvent.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<CalendarEvent | null> {
    return prisma.calendarEvent.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  findManyScoped(
    userId: string,
    filter: CalendarListFilter,
  ): Promise<CalendarEvent[]> {
    const where: Prisma.CalendarEventWhereInput = { userId, deletedAt: null };
    if (filter.from || filter.to) {
      where.startTime = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    return prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });
  }

  update(
    id: string,
    data: Prisma.CalendarEventUncheckedUpdateInput,
  ): Promise<CalendarEvent> {
    return prisma.calendarEvent.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<CalendarEvent> {
    return prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
