"use client";

import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/features/tasks/services/task.service";
import type { WeeklyTaskStats } from "@/features/tasks/types/task.types";

/**
 * Dashboard StatStrip "Hoàn thành tuần". Mỗi lần gọi backend tự upsert snapshot tuần hiện tại
 * (xem _workspace/33_backend_weekly-completion.md) — lịch sử tích luỹ dần, không cần cron.
 */
export function useWeeklyStats() {
  return useQuery<WeeklyTaskStats>({
    queryKey: ["dashboard", "weeklyStats"],
    queryFn: () => taskService.weeklyStats(),
    staleTime: 60_000,
  });
}
