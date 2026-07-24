"use client";

import type { DailyHabitStats } from "@/features/habit/types/habit.types";

export function HabitHeatmap({
  data,
  isLoading,
}: {
  data?: DailyHabitStats;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-md bg-muted" />;
  }
  if (!data || data.habits.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có habit nào.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col gap-1.5">
        {data.habits.map((h) => {
          const checked = new Set(h.checkedDates);
          return (
            <div key={h.habitId} className="flex items-center gap-2">
              <div className="w-28 shrink-0 truncate text-[12px] font-medium" title={h.name}>
                {h.name}
              </div>
              <div className="flex gap-[3px]">
                {data.days.map((day) => (
                  <div
                    key={day}
                    title={`${h.name} · ${day}${checked.has(day) ? " · đã check-in" : ""}`}
                    className={
                      "h-3 w-3 shrink-0 rounded-sm " +
                      (checked.has(day) ? "bg-primary" : "bg-muted")
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
