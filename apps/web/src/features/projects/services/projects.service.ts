import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CreateMilestonePayload,
  CreateProjectPayload,
  Milestone,
  Project,
  ProjectProgress,
  ProjectStatus,
  UpdateMilestonePayload,
  UpdateProjectPayload,
} from "../types/projects.types";

function clean(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

const ALL = { page: 1, pageSize: 100, sortOrder: "asc" as const };

export const projectService = {
  async list(filter?: { goalId?: string; status?: ProjectStatus }): Promise<Project[]> {
    const res = await apiClient.get<ApiEnvelope<Project[]>>("/projects", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async get(id: string): Promise<Project> {
    const res = await apiClient.get<ApiEnvelope<Project>>(`/projects/${id}`);
    return res.data.data;
  },
  async progress(id: string): Promise<ProjectProgress> {
    const res = await apiClient.get<ApiEnvelope<ProjectProgress>>(`/projects/${id}/progress`);
    return res.data.data;
  },
  async create(payload: CreateProjectPayload): Promise<Project> {
    const res = await apiClient.post<ApiEnvelope<Project>>("/projects", payload);
    return res.data.data;
  },
  async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const res = await apiClient.patch<ApiEnvelope<Project>>(`/projects/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/projects/${id}`);
  },
};

export const milestoneService = {
  async list(filter?: { projectId?: string }): Promise<Milestone[]> {
    const res = await apiClient.get<ApiEnvelope<Milestone[]>>("/milestones", {
      params: clean({ ...ALL, ...filter }),
    });
    return res.data.data;
  },
  async create(payload: CreateMilestonePayload): Promise<Milestone> {
    const res = await apiClient.post<ApiEnvelope<Milestone>>("/milestones", payload);
    return res.data.data;
  },
  async update(id: string, payload: UpdateMilestonePayload): Promise<Milestone> {
    const res = await apiClient.patch<ApiEnvelope<Milestone>>(`/milestones/${id}`, payload);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(`/milestones/${id}`);
  },
};
