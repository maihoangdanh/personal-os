import { Injectable } from '@nestjs/common';
import {
  CalendarEvent,
  Goal,
  Habit,
  Journal,
  KPI,
  prisma,
  Prisma,
  Task,
} from '@personal-os/database';
import { computeNetWorth, sumRealized } from '../common/finance';

/**
 * Read-only access to the user's REAL data for AI grounding. Per doc 07 §11
 * ("Context lấy từ DB qua Service Layer — không truy cập DB trực tiếp từ LLM"),
 * this is the only place the AI module touches prisma, always scoped to the
 * asking user and filtered `deletedAt: null`. Money totals reuse the shared
 * finance helpers so numbers match /finance/report and /finance/net-worth exactly.
 */

/** Task ownership chain: Task -> Project -> Goal -> Vision -> userId. */
function taskOwnedBy(userId: string): Prisma.TaskWhereInput {
  return { deletedAt: null, project: { goal: { vision: { userId } } } };
}

const OPEN_TASK_STATUSES = ['INBOX', 'TODO', 'DOING', 'REVIEW'] as const;

@Injectable()
export class AiContextRepository {
  // ---- Tasks ----

  /** Open (not DONE/ARCHIVED) tasks, most urgent first. */
  openTasks(userId: string, limit = 50): Promise<Task[]> {
    return prisma.task.findMany({
      where: { ...taskOwnedBy(userId), status: { in: [...OPEN_TASK_STATUSES] } },
      orderBy: [{ priorityScore: 'desc' }, { deadline: 'asc' }],
      take: limit,
    });
  }

  /** Open tasks with a deadline strictly before `now`. */
  overdueTasks(userId: string, now: Date): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        ...taskOwnedBy(userId),
        status: { in: [...OPEN_TASK_STATUSES] },
        deadline: { lt: now, not: null },
      },
      orderBy: { deadline: 'asc' },
    });
  }

  /** Tasks completed (status DONE) within [from,to] by completedAt. */
  tasksCompletedBetween(userId: string, from: Date, to: Date): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        ...taskOwnedBy(userId),
        status: 'DONE',
        completedAt: { gte: from, lte: to },
      },
      orderBy: { completedAt: 'asc' },
    });
  }

  /** Open tasks that have a deadline (for schedule planning). */
  openTasksWithDeadline(userId: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: {
        ...taskOwnedBy(userId),
        status: { in: [...OPEN_TASK_STATUSES] },
        deadline: { not: null },
      },
      orderBy: [{ priorityScore: 'desc' }, { deadline: 'asc' }],
    });
  }

  /** Total tracked minutes (from stopped TimeLogs) within [from,to]. */
  async trackedMinutesBetween(userId: string, from: Date, to: Date): Promise<number> {
    const agg = await prisma.timeLog.aggregate({
      where: {
        deletedAt: null,
        startTime: { gte: from, lte: to },
        task: { project: { goal: { vision: { userId } } } },
      },
      _sum: { durationMinutes: true },
    });
    return agg._sum.durationMinutes ?? 0;
  }

  // ---- Habits ----

  habits(userId: string): Promise<Habit[]> {
    return prisma.habit.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Active log dates for a habit (desc), for streak counting. */
  async habitLogDates(habitId: string): Promise<Date[]> {
    const rows = await prisma.habitLog.findMany({
      where: { habitId, deletedAt: null },
      orderBy: { logDate: 'desc' },
      select: { logDate: true },
    });
    return rows.map((r) => r.logDate);
  }

  /** Habit check-in count within [from,to]. */
  async habitCheckinsBetween(userId: string, from: Date, to: Date): Promise<number> {
    return prisma.habitLog.count({
      where: {
        deletedAt: null,
        logDate: { gte: from, lte: to },
        habit: { userId, deletedAt: null },
      },
    });
  }

  // ---- Goals / KPIs ----

  activeGoals(userId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: { deletedAt: null, status: 'ACTIVE', vision: { userId } },
      orderBy: { deadline: 'asc' },
    });
  }

  kpis(userId: string): Promise<KPI[]> {
    return prisma.kPI.findMany({
      where: { deletedAt: null, goal: { deletedAt: null, vision: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ---- Calendar ----

  calendarEventsBetween(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    return prisma.calendarEvent.findMany({
      where: { userId, deletedAt: null, startTime: { gte: from, lte: to } },
      orderBy: { startTime: 'asc' },
    });
  }

  // ---- Journal ----

  journalsBetween(userId: string, from: Date, to: Date): Promise<Journal[]> {
    return prisma.journal.findMany({
      where: { userId, deletedAt: null, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
  }

  // ---- Finance (reuse shared single-source helpers) ----

  /** Realized income/expense in [from,to]; transfers excluded via sumRealized. */
  async realizedTotals(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ income: number; expense: number }> {
    const [income, expense] = await Promise.all([
      sumRealized(prisma, { userId, type: 'INCOME', from, to }),
      sumRealized(prisma, { userId, type: 'EXPENSE', from, to }),
    ]);
    return { income: income.toNumber(), expense: expense.toNumber() };
  }

  /** Realized EXPENSE grouped by category in [from,to] (transfers excluded). */
  async expenseByCategory(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ category: string; amount: number }[]> {
    const rows = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        deletedAt: null,
        transferGroupId: null,
        type: 'EXPENSE',
        transactionDate: { gte: from, lte: to },
        wallet: { userId },
      },
      _sum: { amount: true },
    });
    return rows
      .map((r) => ({
        category: r.category ?? 'Uncategorized',
        amount: (r._sum.amount ?? new Prisma.Decimal(0)).toNumber(),
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  netWorth(userId: string) {
    return computeNetWorth(prisma, userId);
  }
}
