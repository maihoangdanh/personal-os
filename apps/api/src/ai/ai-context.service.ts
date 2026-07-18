import { Injectable } from '@nestjs/common';
import { computeStreak } from '../habit/habit-date.util';
import { AiContextRepository } from './ai-context.repository';
import {
  computeFreeSlots,
  FreeSlot,
  Interval,
  periodRange,
  projectTarget,
  round2,
  toUtcDateOnly,
  workingWindows,
} from './ai-math';
import { AiSummaryType } from '@personal-os/database';

/**
 * The DETERMINISTIC half of every AI feature: query the user's real data and
 * compute every number in code here. The feature services then hand these
 * snapshots to the LLM purely for prose — the model never computes or invents
 * a figure. All money reuses the shared finance helpers (single source).
 */

function savingRatePercent(income: number, expense: number): number {
  if (income === 0) return 0;
  return round2(((income - expense) / income) * 100);
}

function monthLabel(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class AiContextService {
  constructor(private readonly repo: AiContextRepository) {}

  /** Compact snapshot of recent data for AI Chat grounding. */
  async buildChatSnapshot(userId: string, now = new Date()) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      openTasks,
      overdue,
      habits,
      goals,
      events,
      journals,
      finance,
      netWorth,
    ] = await Promise.all([
      this.repo.openTasks(userId, 50),
      this.repo.overdueTasks(userId, now),
      this.repo.habits(userId),
      this.repo.activeGoals(userId),
      this.repo.calendarEventsBetween(userId, now, in7Days),
      this.repo.journalsBetween(userId, toUtcDateOnly(last7Days), toUtcDateOnly(now)),
      this.repo.realizedTotals(userId, monthStart, monthEnd),
      this.repo.netWorth(userId),
    ]);

    const habitStreaks = await this.habitStreaks(userId, habits, now);

    return {
      now: now.toISOString(),
      openTaskCount: openTasks.length,
      openTasks: openTasks.slice(0, 15).map((t) => ({
        title: t.title,
        status: t.status,
        priorityScore: t.priorityScore,
        deadline: t.deadline ? t.deadline.toISOString() : null,
        estimateMinute: t.estimateMinute,
      })),
      overdueCount: overdue.length,
      overdueTasks: overdue.slice(0, 10).map((t) => ({
        title: t.title,
        deadline: t.deadline ? t.deadline.toISOString() : null,
      })),
      habits: habitStreaks,
      financeThisMonth: {
        month: monthLabel(now),
        income: round2(finance.income),
        expense: round2(finance.expense),
        profit: round2(finance.income - finance.expense),
        savingRatePercent: savingRatePercent(finance.income, finance.expense),
      },
      netWorth: {
        netWorth: round2(netWorth.netWorth),
        walletTotal: round2(netWorth.walletTotal),
        investmentTotal: round2(netWorth.investmentTotal),
        assetTotal: round2(netWorth.assetTotal),
      },
      activeGoals: goals.map((g) => {
        const target = g.targetValue ? g.targetValue.toNumber() : null;
        const current = g.currentValue.toNumber();
        return {
          title: g.title,
          currentValue: current,
          targetValue: target,
          progressPercent: target && target > 0 ? Math.min(100, round2((current / target) * 100)) : 0,
          deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : null,
        };
      }),
      upcomingEvents: events.slice(0, 10).map((e) => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
      })),
      recentJournalMoods: journals.map((j) => ({
        date: j.date.toISOString().slice(0, 10),
        mood: j.mood,
      })),
    };
  }

  /** Deterministic metrics for a DAILY/WEEKLY/MONTHLY summary. */
  async buildPeriodMetrics(userId: string, type: AiSummaryType, anchor: Date) {
    const { from, to, periodStart, periodEnd } = periodRange(type, anchor);

    const [completed, trackedMinutes, checkins, habits, finance, categories, goals, journals] =
      await Promise.all([
        this.repo.tasksCompletedBetween(userId, from, to),
        this.repo.trackedMinutesBetween(userId, from, to),
        this.repo.habitCheckinsBetween(userId, from, to),
        this.repo.habits(userId),
        this.repo.realizedTotals(userId, from, to),
        this.repo.expenseByCategory(userId, from, to),
        this.repo.activeGoals(userId),
        this.repo.journalsBetween(userId, toUtcDateOnly(from), toUtcDateOnly(to)),
      ]);

    const habitStreaks = await this.habitStreaks(userId, habits, to);

    return {
      type,
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      tasksCompletedCount: completed.length,
      tasksCompleted: completed.map((t) => t.title),
      trackedMinutes,
      trackedHours: round2(trackedMinutes / 60),
      habitCheckins: checkins,
      habitStreaks,
      finance: {
        income: round2(finance.income),
        expense: round2(finance.expense),
        profit: round2(finance.income - finance.expense),
        savingRatePercent: savingRatePercent(finance.income, finance.expense),
        topExpenseCategories: categories.slice(0, 5).map((c) => ({
          category: c.category,
          amount: round2(c.amount),
        })),
      },
      goalsProgress: goals.map((g) => {
        const target = g.targetValue ? g.targetValue.toNumber() : null;
        const current = g.currentValue.toNumber();
        return {
          title: g.title,
          currentValue: current,
          targetValue: target,
          progressPercent: target && target > 0 ? Math.min(100, round2((current / target) * 100)) : 0,
        };
      }),
      journalCount: journals.length,
      journalMoods: journals.map((j) => j.mood).filter((m): m is string => !!m),
    };
  }

  /** Open tasks with deadlines + busy calendar + computed free slots. */
  async buildPlanningData(userId: string, fromDay: Date, horizonDays: number) {
    const windows: Interval[] = workingWindows(fromDay, horizonDays);
    const rangeEnd = windows[windows.length - 1].end;
    const now = new Date();

    const [tasks, events] = await Promise.all([
      this.repo.openTasksWithDeadline(userId),
      this.repo.calendarEventsBetween(userId, toUtcDateOnly(fromDay), rangeEnd),
    ]);

    const busy: Interval[] = events
      .filter((e) => e.endTime) // need an end to block a slot
      .map((e) => ({ start: e.startTime, end: e.endTime as Date }));

    const freeSlots: FreeSlot[] = computeFreeSlots(windows, busy);

    return {
      window: { from: windows[0].start.toISOString(), to: rangeEnd.toISOString() },
      tasks: tasks.map((t) => ({
        title: t.title,
        priorityScore: t.priorityScore,
        deadline: t.deadline ? t.deadline.toISOString() : null,
        estimateMinute: t.estimateMinute,
        overdue: !!(t.deadline && t.deadline < now),
      })),
      busy: events.map((e) => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
      })),
      freeSlots,
    };
  }

  /** Goal/KPI projections + finance trend, all computed in code. */
  async buildForecastData(userId: string, now = new Date()) {
    const [goals, kpis] = await Promise.all([
      this.repo.activeGoals(userId),
      this.repo.kpis(userId),
    ]);

    const goalForecasts = goals.map((g) => {
      const target = g.targetValue ? g.targetValue.toNumber() : null;
      const projection = projectTarget(
        g.currentValue.toNumber(),
        target,
        g.createdAt,
        g.deadline,
        now,
      );
      return {
        title: g.title,
        currentValue: g.currentValue.toNumber(),
        targetValue: target,
        deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : null,
        ...projection,
      };
    });

    const kpiForecasts = kpis.map((k) => {
      const target = k.targetValue ? k.targetValue.toNumber() : null;
      const projection = projectTarget(k.currentValue.toNumber(), target, k.createdAt, null, now);
      return {
        name: k.name,
        unit: k.unit,
        currentValue: k.currentValue.toNumber(),
        targetValue: target,
        progressPercent: projection.progressPercent,
      };
    });

    // Finance trend: last 3 calendar months (oldest -> newest).
    const trend: {
      month: string;
      income: number;
      expense: number;
      savingRatePercent: number;
    }[] = [];
    for (let i = 2; i >= 0; i--) {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const to = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999),
      );
      const totals = await this.repo.realizedTotals(userId, from, to);
      trend.push({
        month: monthLabel(from),
        income: round2(totals.income),
        expense: round2(totals.expense),
        savingRatePercent: savingRatePercent(totals.income, totals.expense),
      });
    }

    return { now: now.toISOString(), goals: goalForecasts, kpis: kpiForecasts, financeTrend: trend };
  }

  private async habitStreaks(
    userId: string,
    habits: { id: string; name: string }[],
    asOf: Date,
  ) {
    const today = toUtcDateOnly(asOf);
    const result = [];
    for (const habit of habits) {
      const dates = await this.repo.habitLogDates(habit.id);
      const streak = computeStreak(dates, today);
      result.push({
        name: habit.name,
        currentStreak: streak.currentStreak,
        checkedInToday: streak.checkedInToday,
        lastLogDate: streak.lastLogDate,
      });
    }
    return result;
  }
}
