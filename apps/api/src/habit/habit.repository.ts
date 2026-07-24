import { Injectable } from '@nestjs/common';
import { Habit, HabitLog, Prisma, prisma } from '@personal-os/database';

/** Only place that touches prisma for the habit domain. Always filters deletedAt: null. */
@Injectable()
export class HabitRepository {
  create(data: Prisma.HabitUncheckedCreateInput): Promise<Habit> {
    return prisma.habit.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Habit | null> {
    return prisma.habit.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  findManyScoped(userId: string): Promise<Habit[]> {
    return prisma.habit.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: string, data: Prisma.HabitUncheckedUpdateInput): Promise<Habit> {
    return prisma.habit.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Habit> {
    return prisma.habit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---- HabitLog (check-in) ----

  /**
   * Any log for this habit on the given calendar date, including soft-deleted
   * ones. Used to guard the check-in against the @@unique([habitId, logDate])
   * constraint so a duplicate check-in surfaces as a clean 409, never a P2002.
   */
  findLogForDate(habitId: string, logDate: Date): Promise<HabitLog | null> {
    return prisma.habitLog.findFirst({
      where: { habitId, logDate },
    });
  }

  createLog(data: Prisma.HabitLogUncheckedCreateInput): Promise<HabitLog> {
    return prisma.habitLog.create({ data });
  }

  /** logDate list (desc) for streak counting; active logs only. */
  findLogDates(habitId: string): Promise<{ logDate: Date }[]> {
    return prisma.habitLog.findMany({
      where: { habitId, deletedAt: null },
      orderBy: { logDate: 'desc' },
      select: { logDate: true },
    });
  }

  /** Tổng số HabitLog (mọi habit của user) có logDate trong khoảng [from, to]. */
  countLogsInRange(userId: string, from: Date, to: Date): Promise<number> {
    return prisma.habitLog.count({
      where: {
        deletedAt: null,
        logDate: { gte: from, lte: to },
        habit: { userId, deletedAt: null },
      },
    });
  }

  /** Mọi HabitLog (mọi habit của user) trong khoảng [from, to] — cho heatmap Analytics. */
  findLogsInRangeForUser(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ habitId: string; logDate: Date }[]> {
    return prisma.habitLog.findMany({
      where: {
        deletedAt: null,
        logDate: { gte: from, lte: to },
        habit: { userId, deletedAt: null },
      },
      select: { habitId: true, logDate: true },
    });
  }
}
