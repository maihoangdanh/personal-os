"use client";

import { formatCurrency } from "@/lib/format";
import { useNetWorth } from "@/features/finance/hooks/useFinance";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useHabitList } from "@/features/habit/hooks/useHabits";
import { useTodayTasks } from "../hooks/useTodayTasks";

/**
 * Stat strip 4 ô (mockup). TÁI DÙNG các hook đã có sẵn trên dashboard (cùng queryKey → React Query
 * chia sẻ cache, KHÔNG thêm API call mới). Chỉ hiển thị số dẫn xuất — không đổi logic.
 */
export function StatStrip() {
  const today = useTodayTasks();
  const goals = useGoals({ status: "ACTIVE" });
  const habits = useHabitList();
  const netWorth = useNetWorth();

  const totToday = today.data?.length ?? 0;
  const doneToday = today.data?.filter((t) => t.status === "DONE").length ?? 0;

  const cards = [
    {
      label: "Task hôm nay",
      value: today.isLoading ? "—" : `${doneToday}/${totToday}`,
      sub: today.isLoading ? "cần tập trung" : `${totToday - doneToday} việc còn lại`,
    },
    {
      label: "Mục tiêu đang chạy",
      value: goals.isLoading ? "—" : String(goals.data?.length ?? 0),
      sub: "đang theo dõi",
    },
    {
      label: "Thói quen",
      value: habits.isLoading ? "—" : String(habits.data?.length ?? 0),
      sub: "đang duy trì",
    },
    {
      label: "Tài sản ròng",
      value: netWorth.isLoading ? "—" : formatCurrency(netWorth.data?.netWorth ?? 0),
      sub: "tổng ví · đầu tư · tài sản",
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
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
