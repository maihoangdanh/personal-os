import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  AiConversation,
  AiConversationDetail,
  AiSummary,
  ClassifyResult,
  ForecastResult,
  PlanResult,
  SendMessageResult,
  SummaryType,
} from "../types/ai.types";

const ALL = { page: 1, pageSize: 100, sortOrder: "desc" as const };

export const aiService = {
  // ---- Chat ----
  async listConversations(): Promise<AiConversation[]> {
    const res = await apiClient.get<ApiEnvelope<AiConversation[]>>("/ai/conversations", {
      params: ALL,
    });
    return res.data.data;
  },
  async getConversation(id: string): Promise<AiConversationDetail> {
    return (await apiClient.get<ApiEnvelope<AiConversationDetail>>(`/ai/conversations/${id}`)).data.data;
  },
  async createConversation(title?: string): Promise<AiConversation> {
    return (
      await apiClient.post<ApiEnvelope<AiConversation>>("/ai/conversations", title ? { title } : {})
    ).data.data;
  },
  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/ai/conversations/${id}`);
  },
  async sendMessage(id: string, content: string): Promise<SendMessageResult> {
    return (
      await apiClient.post<ApiEnvelope<SendMessageResult>>(`/ai/conversations/${id}/messages`, {
        content,
      })
    ).data.data;
  },

  // ---- Summary ----
  async listSummaries(type?: SummaryType): Promise<AiSummary[]> {
    const res = await apiClient.get<ApiEnvelope<AiSummary[]>>("/ai/summaries", {
      params: type ? { ...ALL, type } : ALL,
    });
    return res.data.data;
  },
  async generateSummary(type: SummaryType, date?: string): Promise<AiSummary> {
    return (
      await apiClient.post<ApiEnvelope<AiSummary>>("/ai/summaries", date ? { type, date } : { type })
    ).data.data;
  },

  // ---- Classify ----
  async classifyTask(title: string, description?: string): Promise<ClassifyResult> {
    return (
      await apiClient.post<ApiEnvelope<ClassifyResult>>(
        "/ai/classify-task",
        description ? { title, description } : { title },
      )
    ).data.data;
  },

  // ---- Plan ----
  async planSchedule(horizonDays: number, date?: string): Promise<PlanResult> {
    return (
      await apiClient.post<ApiEnvelope<PlanResult>>(
        "/ai/plan-schedule",
        date ? { horizonDays, date } : { horizonDays },
      )
    ).data.data;
  },

  // ---- Forecast ----
  async forecast(): Promise<ForecastResult> {
    return (await apiClient.get<ApiEnvelope<ForecastResult>>("/ai/forecast")).data.data;
  },
};
