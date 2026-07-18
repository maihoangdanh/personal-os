"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiService } from "../services/ai.service";
import type { SummaryType } from "../types/ai.types";

export const aiKeys = {
  conversations: ["ai", "conversations"] as const,
  conversation: (id: string) => ["ai", "conversation", id] as const,
  summaries: (type?: SummaryType) => ["ai", "summaries", type ?? "all"] as const,
};

// ---- Chat ----
export function useConversations() {
  return useQuery({ queryKey: aiKeys.conversations, queryFn: () => aiService.listConversations() });
}
export function useConversation(id: string) {
  return useQuery({
    queryKey: aiKeys.conversation(id),
    queryFn: () => aiService.getConversation(id),
    enabled: !!id,
  });
}
export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) => aiService.createConversation(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.conversations }),
  });
}
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiService.deleteConversation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKeys.conversations }),
  });
}
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => aiService.sendMessage(conversationId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiKeys.conversation(conversationId) });
      qc.invalidateQueries({ queryKey: aiKeys.conversations });
    },
  });
}

// ---- Summary ----
export function useSummaries(type?: SummaryType) {
  return useQuery({ queryKey: aiKeys.summaries(type), queryFn: () => aiService.listSummaries(type) });
}
export function useGenerateSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, date }: { type: SummaryType; date?: string }) =>
      aiService.generateSummary(type, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai", "summaries"] }),
  });
}

// ---- Classify (runtime, không cache) ----
export function useClassifyTask() {
  return useMutation({
    mutationFn: ({ title, description }: { title: string; description?: string }) =>
      aiService.classifyTask(title, description),
  });
}

// ---- Plan ----
export function usePlanSchedule() {
  return useMutation({
    mutationFn: ({ horizonDays, date }: { horizonDays: number; date?: string }) =>
      aiService.planSchedule(horizonDays, date),
  });
}

// ---- Forecast ----
export function useForecast() {
  return useMutation({ mutationFn: () => aiService.forecast() });
}
