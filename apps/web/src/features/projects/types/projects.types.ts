/**
 * Project / Milestone types — copy CHÍNH XÁC từ _workspace/09_backend_goal-project.md.
 *
 * Ranh giới:
 * - List trả MẢNG trong `data` + phân trang `meta`. Query: page/pageSize/sortOrder + filter
 *   (goalId/projectId/status). Enum input không phân biệt hoa/thường; response CHỮ HOA.
 * - Project.progress do BACKEND tự tính (% task DONE) — frontend CHỈ đọc, không gửi/không tính lại.
 * - Milestone.isCompleted do BACKEND tự tính (mọi task gán milestone đều DONE) — KHÔNG cho user tick tay.
 * - Milestone.dueDate = ISO datetime | null. createdAt/updatedAt = ISO.
 */

// ---------- PROJECT ----------
export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  goalId: string;
  title: string;
  status: ProjectStatus;
  progress: number; // 0..100, backend-maintained
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface ProjectProgress {
  projectId: string;
  progress: number;
  doneTasks: number;
  totalTasks: number;
}

export interface CreateProjectPayload {
  goalId: string; // bắt buộc
  title: string; // 1..255
  status?: ProjectStatus;
}
/** UpdateProjectDto: chỉ title?, status? (progress KHÔNG nhận từ client). */
export interface UpdateProjectPayload {
  title?: string;
  status?: ProjectStatus;
}

// ---------- MILESTONE ----------
export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string | null; // ISO
  isCompleted: boolean; // backend-maintained, read-only
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateMilestonePayload {
  projectId: string; // bắt buộc
  title: string; // 1..255
  dueDate?: string; // ISO datetime
}
/** UpdateMilestoneDto: title?, dueDate? (isCompleted KHÔNG nhận từ client). */
export interface UpdateMilestonePayload {
  title?: string;
  dueDate?: string;
}
