import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CheckinHabitPayload,
  CreateHabitPayload,
  Habit,
  HabitDeleteResult,
  HabitLog,
  HabitStreak,
  UpdateHabitPayload,
} from "../types/habit.types";

/** Lớp DUY NHẤT gọi API habit. Unwrap envelope; list trả mảng thuần trong `data`. */
export const habitService = {
  async list(): Promise<Habit[]> {
    const res = await apiClient.get<ApiEnvelope<Habit[]>>("/habits");
    return res.data.data;
  },

  async get(id: string): Promise<Habit> {
    const res = await apiClient.get<ApiEnvelope<Habit>>(`/habits/${id}`);
    return res.data.data;
  },

  async create(payload: CreateHabitPayload): Promise<Habit> {
    const res = await apiClient.post<ApiEnvelope<Habit>>("/habits", payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateHabitPayload): Promise<Habit> {
    const res = await apiClient.patch<ApiEnvelope<Habit>>(`/habits/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<HabitDeleteResult> {
    const res = await apiClient.delete<ApiEnvelope<HabitDeleteResult>>(`/habits/${id}`);
    return res.data.data;
  },

  async checkin(id: string, payload: CheckinHabitPayload = {}): Promise<HabitLog> {
    const res = await apiClient.post<ApiEnvelope<HabitLog>>(
      `/habits/${id}/checkin`,
      payload,
    );
    return res.data.data;
  },

  async streak(id: string): Promise<HabitStreak> {
    const res = await apiClient.get<ApiEnvelope<HabitStreak>>(`/habits/${id}/streak`);
    return res.data.data;
  },
};
