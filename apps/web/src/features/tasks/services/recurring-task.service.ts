import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CreateRecurringTaskPayload,
  RecurringTaskTemplate,
} from "../types/task.types";

/** Lớp DUY NHẤT gọi API recurring-tasks. */
export const recurringTaskService = {
  async create(payload: CreateRecurringTaskPayload): Promise<RecurringTaskTemplate> {
    const res = await apiClient.post<ApiEnvelope<RecurringTaskTemplate>>(
      "/recurring-tasks",
      payload,
    );
    return res.data.data;
  },

  async stop(id: string): Promise<RecurringTaskTemplate> {
    const res = await apiClient.post<ApiEnvelope<RecurringTaskTemplate>>(
      `/recurring-tasks/${id}/stop`,
    );
    return res.data.data;
  },
};
