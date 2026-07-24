"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { habitService } from "../services/habit.service";
import type {
  CheckinHabitPayload,
  CreateHabitPayload,
  DailyHabitStats,
  MonthlyHabitStats,
  UpdateHabitPayload,
} from "../types/habit.types";

export const habitKeys = {
  all: ["habits"] as const,
  list: () => ["habits", "list"] as const,
  detail: (id: string) => ["habits", "detail", id] as const,
  streak: (id: string) => ["habits", "streak", id] as const,
};

export function useHabitList() {
  return useQuery({
    queryKey: habitKeys.list(),
    queryFn: () => habitService.list(),
    staleTime: 30_000,
  });
}

export function useHabitStreak(id: string) {
  return useQuery({
    queryKey: habitKeys.streak(id),
    queryFn: () => habitService.streak(id),
    staleTime: 30_000,
  });
}

function useInvalidateHabits() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: habitKeys.all });
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: (payload: CreateHabitPayload) => habitService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateHabitPayload }) =>
      habitService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabits();
  return useMutation({
    mutationFn: (id: string) => habitService.remove(id),
    onSuccess: invalidate,
  });
}

export function useCheckinHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: CheckinHabitPayload }) =>
      habitService.checkin(id, payload),
    // Sau check-in, làm mới streak của đúng habit đó (currentStreak + checkedInToday).
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: habitKeys.streak(variables.id) }),
  });
}

export function useHabitMonthlyStats(month?: string) {
  return useQuery<MonthlyHabitStats>({
    queryKey: ["habits", "monthlyStats", month ?? "current"],
    queryFn: () => habitService.monthlyStats(month),
    staleTime: 60_000,
  });
}

export function useHabitDailyStats(month?: string) {
  return useQuery<DailyHabitStats>({
    queryKey: ["habits", "dailyStats", month ?? "current"],
    queryFn: () => habitService.dailyStats(month),
    staleTime: 60_000,
  });
}
