"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart3, FolderKanban, ListChecks, Repeat, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardLink } from "@/components/layout/CardLink";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskMonthlyStats } from "@/features/tasks/hooks/useTasks";
import { useHabitMonthlyStats } from "@/features/habit/hooks/useHabits";
import { useFinanceReport } from "@/features/finance/hooks/useFinance";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useTaskDailyStats } from "@/features/tasks/hooks/useTasks";
import { useHabitDailyStats } from "@/features/habit/hooks/useHabits";
import { useFinanceDailyReport } from "@/features/finance/hooks/useFinance";
import { TaskDailyChart } from "./TaskDailyChart";
import { FinanceDailyChart } from "./FinanceDailyChart";
import { HabitHeatmap } from "./HabitHeatmap";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Dịch "YYYY-MM" tới/lui theo số tháng. */
function shiftMonth(m: string, dir: 1 | -1): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Nhãn "Tháng M, YYYY" từ "YYYY-MM". */
function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `Tháng ${mo}, ${y}`;
}

interface AnalyticsCard {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  sub: string;
  changeLabel: string | null; // null = ẩn hẳn badge (Goal/Project không so tháng trước)
  changePositive: boolean;
  href: string;
  isLoading: boolean;
}

export function AnalyticsView() {
  const [month, setMonth] = React.useState(() => currentMonth());
  const isCurrent = month === currentMonth();
  const prevMonthLabel = shiftMonth(month, -1);

  const taskStats = useTaskMonthlyStats(month);
  const habitStats = useHabitMonthlyStats(month);
  const report = useFinanceReport(month);
  const prevReport = useFinanceReport(prevMonthLabel);
  const goals = useGoals({ status: "ACTIVE" });
  const projects = useProjects({ status: "ACTIVE" });
  const taskDaily = useTaskDailyStats(month);
  const habitDaily = useHabitDailyStats(month);
  const financeDaily = useFinanceDailyReport(month);

  const goalAvgProgress = React.useMemo(() => {
    if (!goals.data || goals.data.length === 0) return 0;
    return Math.round(
      goals.data.reduce((sum, g) => sum + g.progress, 0) / goals.data.length,
    );
  }, [goals.data]);

  const projectAvgProgress = React.useMemo(() => {
    if (!projects.data || projects.data.length === 0) return 0;
    return Math.round(
      projects.data.reduce((sum, p) => sum + p.progress, 0) / projects.data.length,
    );
  }, [projects.data]);

  const savingRateChange =
    report.data && prevReport.data && !isNaN(prevReport.data.savingRatePercent)
      ? Math.round((report.data.savingRatePercent - prevReport.data.savingRatePercent) * 10) / 10
      : null;

  const cards: AnalyticsCard[] = [
    {
      key: "task",
      icon: ListChecks,
      title: "Task hoàn thành",
      value: taskStats.data ? `${taskStats.data.completedCount}/${taskStats.data.totalCount}` : "—",
      sub: taskStats.data ? `${taskStats.data.completionPercent}% hoàn thành` : "",
      changeLabel:
        taskStats.data?.changePercent != null
          ? `${taskStats.data.changePercent >= 0 ? "▲" : "▼"} ${taskStats.data.changePercent >= 0 ? "+" : ""}${taskStats.data.changePercent}% so với tháng trước`
          : null,
      changePositive: (taskStats.data?.changePercent ?? 0) >= 0,
      href: "/tasks",
      isLoading: taskStats.isLoading,
    },
    {
      key: "habit",
      icon: Repeat,
      title: "Check-in thói quen",
      value: habitStats.data ? `${habitStats.data.checkinCount}` : "—",
      sub: habitStats.data?.longestCurrentStreak
        ? `Streak dài nhất: ${habitStats.data.longestCurrentStreak.currentStreak} ngày (${habitStats.data.longestCurrentStreak.habitName})`
        : `${habitStats.data?.habitCount ?? 0} habit`,
      changeLabel:
        habitStats.data?.changePercent != null
          ? `${habitStats.data.changePercent >= 0 ? "▲" : "▼"} ${habitStats.data.changePercent >= 0 ? "+" : ""}${habitStats.data.changePercent}% so với tháng trước`
          : null,
      changePositive: (habitStats.data?.changePercent ?? 0) >= 0,
      href: "/habits",
      isLoading: habitStats.isLoading,
    },
    {
      key: "finance",
      icon: Wallet,
      title: "Tỷ lệ tiết kiệm",
      value: report.data ? `${report.data.savingRatePercent.toFixed(1)}%` : "—",
      sub: report.data ? `Thu ${report.data.income.toLocaleString("vi-VN")}₫` : "",
      changeLabel:
        savingRateChange != null
          ? `${savingRateChange >= 0 ? "▲" : "▼"} ${savingRateChange >= 0 ? "+" : ""}${savingRateChange}% so với tháng trước`
          : null,
      changePositive: (savingRateChange ?? 0) >= 0,
      href: "/finance",
      isLoading: report.isLoading,
    },
    {
      key: "goal",
      icon: Target,
      title: "Goal đang chạy",
      value: goals.data ? `${goals.data.length}` : "—",
      sub: goals.data ? `Trung bình ${goalAvgProgress}% tiến độ` : "",
      changeLabel: null,
      changePositive: true,
      href: "/goals",
      isLoading: goals.isLoading,
    },
    {
      key: "project",
      icon: FolderKanban,
      title: "Project đang chạy",
      value: projects.data ? `${projects.data.length}` : "—",
      sub: projects.data ? `Trung bình ${projectAvgProgress}% tiến độ` : "",
      changeLabel: null,
      changePositive: true,
      href: "/projects",
      isLoading: projects.isLoading,
    },
  ];

  const anyError =
    taskStats.isError || habitStats.isError || report.isError || goals.isError || projects.isError;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="ĐO LƯỜNG"
        title="Analytics"
        description="Tổng hợp hiệu suất cá nhân theo tháng — Task, Habit, Finance, Goal, Project."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[130px] text-center font-mono text-[12.5px] font-semibold tracking-[0.04em]">
              {monthLabel(month)}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrent}
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrent && (
              <Button variant="outline" size="sm" onClick={() => setMonth(currentMonth())}>
                Tháng này
              </Button>
            )}
          </div>
        }
      />

      {anyError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(
            taskStats.error ?? habitStats.error ?? report.error ?? goals.error ?? projects.error,
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[15px] font-bold">
                <c.icon className="h-4 w-4 text-primary" />
                {c.title}
              </div>
              <CardLink href={c.href}>Xem chi tiết →</CardLink>
            </div>
            {c.isLoading ? (
              <div className="h-14 animate-pulse rounded-md bg-muted" />
            ) : (
              <>
                <div className="font-serif text-[26px] font-semibold">{c.value}</div>
                {c.sub && <div className="mt-0.5 text-[12px] text-muted-foreground">{c.sub}</div>}
                {c.changeLabel && (
                  <div
                    className={
                      "mt-1.5 text-[11.5px] font-medium " +
                      (c.changePositive ? "text-success" : "text-destructive")
                    }
                  >
                    {c.changeLabel}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="mb-1 text-[15px] font-bold">Task hoàn thành theo ngày</div>
          <TaskDailyChart data={taskDaily.data} isLoading={taskDaily.isLoading} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="mb-1 text-[15px] font-bold">Thu chi theo ngày</div>
          <FinanceDailyChart data={financeDaily.data} isLoading={financeDaily.isLoading} />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="mb-1 text-[15px] font-bold">Check-in thói quen theo ngày</div>
          <HabitHeatmap data={habitDaily.data} isLoading={habitDaily.isLoading} />
        </div>
      </div>
    </div>
  );
}
