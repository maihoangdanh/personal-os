"use client";

import { useQuery } from "@tanstack/react-query";
import { isToday } from "@/lib/format";
import { taskService } from "@/features/tasks/services/task.service";
import type { Task } from "@/features/tasks/types/task.types";

/**
 * "Today's Tasks" = task chưa Done/Archived VÀ (deadline hôm nay HOẶC chưa có deadline).
 *
 * Backend không có endpoint riêng cho tiêu chí "deadline hôm nay HOẶC null" (filter dateFrom/dateTo
 * chỉ bắt được task CÓ deadline trong khoảng). Nên ta lấy trang lớn task active rồi lọc client-side.
 * Đủ cho MVP Phase 1; khi số task lớn nên bổ sung endpoint dashboard chuyên biệt ở backend.
 */
export function useTodayTasks() {
  return useQuery({
    queryKey: ["dashboard", "todayTasks"],
    queryFn: async (): Promise<Task[]> => {
      const { items } = await taskService.list({
        page: 1,
        pageSize: 100,
        sortBy: "deadline",
        sortOrder: "asc",
      });
      return items.filter(
        (t) =>
          t.status !== "DONE" &&
          t.status !== "ARCHIVED" &&
          (t.deadline === null || isToday(t.deadline)),
      );
    },
    staleTime: 60_000,
  });
}
