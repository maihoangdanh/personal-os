/**
 * Vision / Goal / KPI types — copy CHÍNH XÁC từ _workspace/09_backend_goal-project.md.
 *
 * Ranh giới:
 * - Mọi list trả MẢNG trong `data` + phân trang trong `meta`. Query nhận page/pageSize(1..100)/
 *   sortOrder(asc|desc) + filter riêng (visionId/goalId/status). KHÔNG có sortBy.
 * - Enum nhận input không phân biệt hoa/thường; response LUÔN CHỮ HOA.
 * - Goal.deadline = "YYYY-MM-DD" (date-only). Vision/Goal/KPI createdAt/updatedAt = ISO datetime.
 * - Goal.progress / Project.progress do BACKEND tính — frontend chỉ đọc, KHÔNG tự tính lại.
 * - Goal.currentValue nhập TAY (không auto rollup từ KPI/Project — theo chốt Phase 2).
 */

// ---------- VISION ----------
export interface Vision {
  id: string;
  userId: string;
  title: string;
  targetYear: number | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateVisionPayload {
  title: string; // 1..255
  targetYear?: number; // 1900..3000
}
export type UpdateVisionPayload = Partial<CreateVisionPayload>;

// ---------- GOAL ----------
export const GOAL_STATUSES = ["ACTIVE", "ACHIEVED", "MISSED", "ARCHIVED"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface Goal {
  id: string;
  visionId: string;
  title: string;
  targetValue: number | null;
  currentValue: number;
  progress: number; // computed = min(100, current/target*100); 0 nếu target null/<=0
  deadline: string | null; // "YYYY-MM-DD"
  status: GoalStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number | null;
  progress: number;
}

export interface CreateGoalPayload {
  visionId: string; // bắt buộc
  title: string; // 1..255
  targetValue?: number; // > 0
  currentValue?: number; // >= 0
  deadline?: string; // "YYYY-MM-DD"
  status?: GoalStatus; // default ACTIVE
}
/** UpdateGoalDto KHÔNG đổi visionId. */
export type UpdateGoalPayload = Partial<Omit<CreateGoalPayload, "visionId">>;

// ---------- KPI ----------
export interface Kpi {
  id: string;
  goalId: string;
  name: string;
  unit: string | null;
  targetValue: number | null;
  currentValue: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateKpiPayload {
  goalId: string; // bắt buộc
  name: string; // 1..255
  unit?: string; // <= 50
  targetValue?: number;
  currentValue?: number; // >= 0
}
/** UpdateKpiDto KHÔNG đổi goalId. */
export type UpdateKpiPayload = Partial<Omit<CreateKpiPayload, "goalId">>;

// ---------- shared list query ----------
export interface PaginationQuery {
  page?: number;
  pageSize?: number; // 1..100
  sortOrder?: "asc" | "desc";
}
