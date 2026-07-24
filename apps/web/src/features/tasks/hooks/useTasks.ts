"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { taskService } from "../services/task.service";
import type {
  CreateTaskPayload,
  MonthlyTaskStats,
  Task,
  TaskQuery,
  UpdateTaskPayload,
} from "../types/task.types";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (query: TaskQuery) => ["tasks", "list", query] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

const DASHBOARD_TODAY_TASKS_KEY = ["dashboard", "todayTasks"] as const;

/**
 * Cập nhật lạc quan (optimistic) cache ["dashboard","todayTasks"] TRƯỚC khi API trả lời, để nút
 * tích/gỡ tích ở Dashboard phản hồi tức thì thay vì đợi round-trip + invalidate + refetch (cảm
 * giác giật/chậm). onError sẽ rollback lại snapshot cũ nếu API thất bại.
 */
async function patchTodayTaskOptimistic(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<Task>,
) {
  await qc.cancelQueries({ queryKey: DASHBOARD_TODAY_TASKS_KEY });
  const previous = qc.getQueryData<Task[]>(DASHBOARD_TODAY_TASKS_KEY);
  qc.setQueryData<Task[]>(DASHBOARD_TODAY_TASKS_KEY, (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
  return previous;
}

export function useTaskList(query: TaskQuery) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => taskService.list(query),
    staleTime: 30_000,
  });
}

export function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: taskKeys.all });
    // Dashboard "Hôm nay" đọc task qua queryKey riêng (["dashboard", "todayTasks"]) — không nằm
    // trong taskKeys.all nên phải invalidate riêng, nếu không nút Hoàn thành trên Dashboard bấm
    // xong list không refetch, nhìn như không có gì xảy ra.
    qc.invalidateQueries({ queryKey: ["dashboard", "todayTasks"] });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      taskService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      if (!payload.status) return undefined;
      const previous = await patchTodayTaskOptimistic(qc, id, {
        status: payload.status,
        completedAt: payload.status === "DONE" ? new Date().toISOString() : null,
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(DASHBOARD_TODAY_TASKS_KEY, ctx.previous);
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.remove(id),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.complete(id),
    onMutate: async (id) => {
      const previous = await patchTodayTaskOptimistic(qc, id, {
        status: "DONE",
        completedAt: new Date().toISOString(),
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(DASHBOARD_TODAY_TASKS_KEY, ctx.previous);
    },
    onSuccess: invalidate,
  });
}

export function useStartTimer() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.startTimer(id),
    onSuccess: invalidate,
  });
}

export function useStopTimer() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.stopTimer(id),
    onSuccess: invalidate,
  });
}

export function useTaskMonthlyStats(month?: string) {
  return useQuery<MonthlyTaskStats>({
    queryKey: ["tasks", "monthlyStats", month ?? "current"],
    queryFn: () => taskService.monthlyStats(month),
    staleTime: 60_000,
  });
}
