"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { milestoneService, projectService } from "../services/projects.service";
import type {
  CreateMilestonePayload,
  CreateProjectPayload,
  ProjectStatus,
  UpdateMilestonePayload,
  UpdateProjectPayload,
} from "../types/projects.types";

export const projectKeys = {
  all: ["projects"] as const,
  // Phải đưa CẢ goalId lẫn status vào key — nếu chỉ goalId, hai chỗ gọi useProjects() với filter
  // khác nhau (vd. useProjects() lấy tất cả vs useProjects({status:"ACTIVE"})) sẽ ra CÙNG một
  // queryKey, React Query coi là cùng 1 query và trộn lẫn/ghi đè kết quả của nhau (bug thật đã gặp:
  // Dashboard "Hôm nay" hiện sai tên Project vì bị đụng key với ProjectsProgressWidget — cùng loại
  // bug đã sửa cho Goals, xem goalKeys.goals trong features/goals/hooks/useGoals.ts).
  list: (filter?: { goalId?: string; status?: ProjectStatus }) =>
    ["projects", "list", { goalId: filter?.goalId, status: filter?.status }] as const,
  detail: (id: string) => ["projects", "detail", id] as const,
  milestones: (projectId: string) => ["milestones", { projectId }] as const,
};

// ---------- PROJECT ----------
export function useProjects(filter?: { goalId?: string; status?: ProjectStatus }) {
  return useQuery({
    queryKey: projectKeys.list(filter),
    queryFn: () => projectService.list(filter),
  });
}
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectService.get(id),
    enabled: !!id,
  });
}
function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: projectKeys.all });
}
export function useCreateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (p: CreateProjectPayload) => projectService.create(p),
    onSuccess: invalidate,
  });
}
export function useUpdateProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProjectPayload }) =>
      projectService.update(id, payload),
    onSuccess: invalidate,
  });
}
export function useDeleteProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: string) => projectService.remove(id),
    onSuccess: invalidate,
  });
}

// ---------- MILESTONE ----------
export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: projectKeys.milestones(projectId),
    queryFn: () => milestoneService.list({ projectId }),
    enabled: !!projectId,
  });
}
function useInvalidateMilestones() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["milestones"] });
}
export function useCreateMilestone() {
  const invalidate = useInvalidateMilestones();
  return useMutation({
    mutationFn: (p: CreateMilestonePayload) => milestoneService.create(p),
    onSuccess: invalidate,
  });
}
export function useUpdateMilestone() {
  const invalidate = useInvalidateMilestones();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMilestonePayload }) =>
      milestoneService.update(id, payload),
    onSuccess: invalidate,
  });
}
export function useDeleteMilestone() {
  const invalidate = useInvalidateMilestones();
  return useMutation({
    mutationFn: (id: string) => milestoneService.remove(id),
    onSuccess: invalidate,
  });
}
