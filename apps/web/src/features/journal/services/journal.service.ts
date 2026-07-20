import axios from "axios";
import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CreateJournalPayload,
  Journal,
  JournalQuery,
  UpdateJournalPayload,
} from "../types/journal.types";

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

export const journalService = {
  async list(query: JournalQuery = {}): Promise<Journal[]> {
    const res = await apiClient.get<ApiEnvelope<Journal[]>>("/journals", {
      params: clean({ page: 1, pageSize: 100, sortOrder: "desc", ...query }),
    });
    return res.data.data;
  },

  /** GET /journals/date/:date — 404 khi chưa có entry ngày đó → trả null. */
  async getByDate(date: string): Promise<Journal | null> {
    try {
      const res = await apiClient.get<ApiEnvelope<Journal>>(`/journals/date/${date}`);
      return res.data.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  },

  async create(payload: CreateJournalPayload): Promise<Journal> {
    return (await apiClient.post<ApiEnvelope<Journal>>("/journals", payload)).data.data;
  },

  async update(id: string, payload: UpdateJournalPayload): Promise<Journal> {
    return (await apiClient.patch<ApiEnvelope<Journal>>(`/journals/${id}`, payload)).data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/journals/${id}`);
  },
};
