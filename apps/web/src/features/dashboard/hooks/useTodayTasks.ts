"use client";

import { useQuery } from "@tanstack/react-query";
import { isOverdue, isToday } from "@/lib/format";
import { taskService } from "@/features/tasks/services/task.service";
import type { Task } from "@/features/tasks/types/task.types";

/**
 * "Today's Tasks" = hợp của:
 *  - Task đang mở (chưa Done/Archived) VÀ (deadline hôm nay HOẶC quá hạn HOẶC chưa có deadline).
 *  - Task đã Done nhưng hoàn thành HÔM NAY (completedAt hôm nay) — kể cả task cũ (deadline đã qua
 *    từ trước), vì "xử lý xong hôm nay" vẫn tính là việc của hôm nay. Task Done hoàn thành hôm khác
 *    thì rớt khỏi danh sách (đã xong từ trước, không còn liên quan tới hôm nay).
 *
 * Bao gồm task QUÁ HẠN (deadline đã trôi qua) để không bỏ sót việc cần xử lý ngay.
 *
 * Backend không có endpoint riêng cho tiêu chí này (filter dateFrom/dateTo chỉ bắt task CÓ deadline
 * trong khoảng). Nên ta lấy trang lớn task (mọi status) rồi lọc client-side. Đủ cho MVP Phase 1; khi
 * số task lớn nên bổ sung endpoint dashboard chuyên biệt ở backend.
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
      return items.filter((t) => {
        if (t.status === "ARCHIVED") return false;
        if (t.status === "DONE") return isToday(t.completedAt);
        return t.deadline === null || isToday(t.deadline) || isOverdue(t.deadline);
      });
    },
    staleTime: 60_000,
  });
}
