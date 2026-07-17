import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CreateGoalPayload,
  CreateKpiPayload,
  CreateVisionPayload,
  Goal,
  GoalProgress,
  GoalStatus,
  Kpi,
  PaginationQuery,
  UpdateGoalPayload,
  UpdateKpiPayload,
  UpdateVisionPayload,
  Vision,
} from "../types/goals.types";

/** Loại field rỗng để tránh gửi query trống (ValidationPipe forbidNonWhitelisted). */
function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

// Lấy tất cả (widget/cây nhỏ) → pageSize tối đa 100.
const ALL: PaginationQuery = { page: 1, pageSize: 100, sortOrder: "asc" };

export const visionService = {
  async list(): Promise<Vision[]> {
    const res = await apiClient.get<ApiEnvelope<Vision[]>>("/visions", { params: ALL });
    return res.data.data;
  },
  async create(payload: CreateVisionPayload): Promise<Vision> {
    const res = await apiClient.post<ApiEnvelope<Vision>>("/visions", payload);
    return res.data.data;
  },
  async update(id: string, payload: UpdateVisionPayload): Promise<Vision> {
    const res = await apiClient.patch<ApiEnvelope<Vision>>(`/visions/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/visions/${id}`);
  },
};

export const goalService = {
  async list(filter?: { visionId?: string; status?: GoalStatus }): Promise<Goal[]> {
    const res = await apiClient.get<ApiEnvelope<Goal[]>>("/goals", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async progress(id: string): Promise<GoalProgress> {
    const res = await apiClient.get<ApiEnvelope<GoalProgress>>(`/goals/${id}/progress`);
    return res.data.data;
  },
  async create(payload: CreateGoalPayload): Promise<Goal> {
    const res = await apiClient.post<ApiEnvelope<Goal>>("/goals", payload);
    return res.data.data;
  },
  async update(id: string, payload: UpdateGoalPayload): Promise<Goal> {
    const res = await apiClient.patch<ApiEnvelope<Goal>>(`/goals/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/goals/${id}`);
  },
};

export const kpiService = {
  async list(filter?: { goalId?: string }): Promise<Kpi[]> {
    const res = await apiClient.get<ApiEnvelope<Kpi[]>>("/kpis", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async create(payload: CreateKpiPayload): Promise<Kpi> {
    const res = await apiClient.post<ApiEnvelope<Kpi>>("/kpis", payload);
    return res.data.data;
  },
  async update(id: string, payload: UpdateKpiPayload): Promise<Kpi> {
    const res = await apiClient.patch<ApiEnvelope<Kpi>>(`/kpis/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/kpis/${id}`);
  },
};
