"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goalService, kpiService, visionService } from "../services/goals.service";
import type {
  CreateGoalPayload,
  CreateKpiPayload,
  CreateVisionPayload,
  GoalStatus,
  UpdateGoalPayload,
  UpdateKpiPayload,
  UpdateVisionPayload,
} from "../types/goals.types";

export const goalKeys = {
  visions: ["visions"] as const,
  goals: (visionId?: string) => ["goals", { visionId }] as const,
  goalProgress: (id: string) => ["goals", "progress", id] as const,
  kpis: (goalId?: string) => ["kpis", { goalId }] as const,
};

// ---------- VISION ----------
export function useVisions() {
  return useQuery({ queryKey: goalKeys.visions, queryFn: () => visionService.list() });
}
export function useCreateVision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateVisionPayload) => visionService.create(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.visions }),
  });
}
export function useUpdateVision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateVisionPayload }) =>
      visionService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.visions }),
  });
}
export function useDeleteVision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visionService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.visions }),
  });
}

// ---------- GOAL ----------
export function useGoals(filter?: { visionId?: string; status?: GoalStatus }) {
  return useQuery({
    queryKey: goalKeys.goals(filter?.visionId),
    queryFn: () => goalService.list(filter),
  });
}
function useInvalidateGoals() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["goals"] });
}
export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (p: CreateGoalPayload) => goalService.create(p),
    onSuccess: invalidate,
  });
}
export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGoalPayload }) =>
      goalService.update(id, payload),
    onSuccess: invalidate,
  });
}
export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: string) => goalService.remove(id),
    onSuccess: invalidate,
  });
}

// ---------- KPI ----------
export function useKpis(goalId: string) {
  return useQuery({
    queryKey: goalKeys.kpis(goalId),
    queryFn: () => kpiService.list({ goalId }),
    enabled: !!goalId,
  });
}
function useInvalidateKpis() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["kpis"] });
}
export function useCreateKpi() {
  const invalidate = useInvalidateKpis();
  return useMutation({
    mutationFn: (p: CreateKpiPayload) => kpiService.create(p),
    onSuccess: invalidate,
  });
}
export function useUpdateKpi() {
  const invalidate = useInvalidateKpis();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateKpiPayload }) =>
      kpiService.update(id, payload),
    onSuccess: invalidate,
  });
}
export function useDeleteKpi() {
  const invalidate = useInvalidateKpis();
  return useMutation({
    mutationFn: (id: string) => kpiService.remove(id),
    onSuccess: invalidate,
  });
}
