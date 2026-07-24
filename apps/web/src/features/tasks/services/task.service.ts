import { apiClient, type ApiEnvelope, type ApiMeta } from "@/lib/api-client";
import type {
  CreateTaskPayload,
  Task,
  TaskDeleteResult,
  TaskListMeta,
  TaskListResult,
  TaskQuery,
  MonthlyTaskStats,
  TimeLog,
  UpdateTaskPayload,
  WeeklyTaskStats,
} from "../types/task.types";

/** Lớp DUY NHẤT gọi API task. Unwrap envelope; list lấy cả `data` (mảng) + `meta` (phân trang). */
export const taskService = {
  async list(query: TaskQuery = {}): Promise<TaskListResult> {
    const res = await apiClient.get<ApiEnvelope<Task[]>>("/tasks", {
      params: cleanParams(query),
    });
    return {
      items: res.data.data,
      meta: normalizeMeta(res.data.meta, res.data.data.length),
    };
  },

  async get(id: string): Promise<Task> {
    const res = await apiClient.get<ApiEnvelope<Task>>(`/tasks/${id}`);
    return res.data.data;
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const res = await apiClient.post<ApiEnvelope<Task>>("/tasks", payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const res = await apiClient.patch<ApiEnvelope<Task>>(`/tasks/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<TaskDeleteResult> {
    const res = await apiClient.delete<ApiEnvelope<TaskDeleteResult>>(`/tasks/${id}`);
    return res.data.data;
  },

  async complete(id: string): Promise<Task> {
    const res = await apiClient.post<ApiEnvelope<Task>>(`/tasks/${id}/complete`);
    return res.data.data;
  },

  async startTimer(id: string): Promise<TimeLog> {
    const res = await apiClient.post<ApiEnvelope<TimeLog>>(`/tasks/${id}/timer/start`);
    return res.data.data;
  },

  async stopTimer(id: string): Promise<TimeLog> {
    const res = await apiClient.post<ApiEnvelope<TimeLog>>(`/tasks/${id}/timer/stop`);
    return res.data.data;
  },

  async weeklyStats(): Promise<WeeklyTaskStats> {
    const res = await apiClient.get<ApiEnvelope<WeeklyTaskStats>>("/tasks/weekly-stats");
    return res.data.data;
  },

  async monthlyStats(month?: string): Promise<MonthlyTaskStats> {
    const res = await apiClient.get<ApiEnvelope<MonthlyTaskStats>>(
      "/tasks/monthly-stats",
      { params: month ? { month } : undefined },
    );
    return res.data.data;
  },
};

/** Loại bỏ field rỗng khỏi query để không gửi `?keyword=` trống. */
function cleanParams(query: TaskQuery): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

function normalizeMeta(meta: ApiMeta, fallbackCount: number): TaskListMeta {
  return {
    page: typeof meta.page === "number" ? meta.page : 1,
    pageSize: typeof meta.pageSize === "number" ? meta.pageSize : 20,
    total: typeof meta.total === "number" ? meta.total : fallbackCount,
    totalPages: typeof meta.totalPages === "number" ? meta.totalPages : 1,
  };
}
