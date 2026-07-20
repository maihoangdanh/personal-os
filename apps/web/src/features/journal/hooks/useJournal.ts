"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { journalService } from "../services/journal.service";
import type {
  CreateJournalPayload,
  JournalQuery,
  UpdateJournalPayload,
} from "../types/journal.types";

export const journalKeys = {
  all: ["journals"] as const,
  list: (q: JournalQuery) => ["journals", "list", q] as const,
  byDate: (date: string) => ["journals", "date", date] as const,
};

export function useJournals(query: JournalQuery = {}) {
  return useQuery({ queryKey: journalKeys.list(query), queryFn: () => journalService.list(query) });
}

export function useJournalByDate(date: string) {
  return useQuery({
    queryKey: journalKeys.byDate(date),
    queryFn: () => journalService.getByDate(date),
    enabled: !!date,
  });
}

function useInvalidateJournals() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: journalKeys.all });
}

export function useCreateJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (payload: CreateJournalPayload) => journalService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateJournalPayload }) =>
      journalService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteJournal() {
  const invalidate = useInvalidateJournals();
  return useMutation({
    mutationFn: (id: string) => journalService.remove(id),
    onSuccess: invalidate,
  });
}
