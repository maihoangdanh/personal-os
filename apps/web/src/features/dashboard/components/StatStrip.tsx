"use client";

import { useFinanceReport } from "@/features/finance/hooks/useFinance";
import { useLongestHabitStreak } from "../hooks/useLongestHabitStreak";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { useWeeklyStats } from "../hooks/useWeeklyStats";

/** Ngưỡng tham khảo cố định (không phải mục tiêu người dùng tự đặt) — benchmark tỉ lệ tiết kiệm lành mạnh. */
const SAVING_RATE_BENCHMARK = 40;

/**
 * Stat strip 4 ô: Task hôm nay / Streak dài nhất / Hoàn thành tuần / Tỷ lệ tiết kiệm.
 * TÁI DÙNG hook đã có (useTodayTasks, useFinanceReport) + 2 hook mới dùng data thật
 * (useLongestHabitStreak, useWeeklyStats — xem _workspace/33, /34). Không số liệu giả.
 */
export function StatStrip() {
  const today = useTodayTasks();
  const streak = useLongestHabitStreak();
  const weekly = useWeeklyStats();
  const report = useFinanceReport();

  const totToday = today.data?.length ?? 0;
  const doneToday = today.data?.filter((t) => t.status === "DONE").length ?? 0;

  const savingRate = report.data?.savingRatePercent;
  const savingSub =
    savingRate == null
      ? ""
      : savingRate >= SAVING_RATE_BENCHMARK
        ? `vượt mục tiêu ${SAVING_RATE_BENCHMARK}%`
        : `dưới mục tiêu ${SAVING_RATE_BENCHMARK}%`;

  const changePercent = weekly.data?.changePercent;
  const hasChange = changePercent !== null && changePercent !== undefined;

  const cards = [
    {
      label: "Task hôm nay",
      value: today.isLoading ? "—" : `${doneToday}/${totToday}`,
      sub: today.isLoading ? "cần tập trung" : `${totToday - doneToday} việc còn lại`,
      subClass: "text-muted-foreground",
    },
    {
      label: "Streak dài nhất",
      value: streak.isLoading ? "—" : `${streak.data?.currentStreak ?? 0} ngày`,
      sub: streak.isLoading ? "" : (streak.data?.habitName ?? "Chưa có habit nào"),
      subClass: "text-warning",
    },
    {
      label: "Hoàn thành tuần",
      value: weekly.isLoading ? "—" : `${weekly.data?.completionPercent ?? 0}%`,
      sub: hasChange
        ? `${changePercent! >= 0 ? "▲" : "▼"} ${changePercent! >= 0 ? "+" : ""}${changePercent}% so với tuần trước`
        : "",
      subClass: hasChange && changePercent! >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: "Tỷ lệ tiết kiệm",
      value: report.isLoading ? "—" : `${savingRate ?? 0}%`,
      sub: savingSub,
      subClass: savingRate != null && savingRate >= SAVING_RATE_BENCHMARK ? "text-success" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[14px] border border-border bg-card px-[18px] py-4 shadow-sm"
        >
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            {c.label}
          </div>
          <div className="mt-1.5 truncate font-serif text-[26px] font-semibold" title={c.value}>
            {c.value}
          </div>
          <div className={`mt-0.5 text-[11.5px] ${c.subClass}`}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
