/**
 * Task types — copy CHÍNH XÁC từ _workspace/02_backend_auth-task.md.
 *
 * Lưu ý ranh giới (nguồn lệch phổ biến):
 * - Response status LUÔN CHỮ HOA (giá trị enum). Query/body input backend nhận không phân biệt
 *   hoa/thường, nhưng frontend gửi + nhận CHỮ HOA làm chuẩn.
 * - Mọi thời gian là ISO string qua wire (deadline, completedAt, createdAt, updatedAt), KHÔNG
 *   phải Date object. Parse ở component khi cần hiển thị.
 * - List trả về MẢNG object TaskResponseDto trong `data`, phân trang nằm ở `meta`.
 */

export const TASK_STATUSES = [
  "INBOX",
  "TODO",
  "DOING",
  "REVIEW",
  "DONE",
  "ARCHIVED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** TaskResponseDto */
export interface Task {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  impact: number; // 1..5
  urgency: number; // 1..5
  priorityScore: number | null; // impact × urgency (server tính)
  estimateMinute: number | null; // phút ước lượng >= 0
  status: TaskStatus;
  deadline: string | null; // ISO
  completedAt: string | null; // ISO; set khi DONE
  isTimerRunning: boolean; // true khi có TimeLog đang chạy (endTime null)
  activeTimeLogId: string | null; // id của TimeLog đang chạy, null khi không chạy
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** TimeLogResponseDto (timer/start + timer/stop) */
export interface TimeLog {
  id: string;
  taskId: string;
  startTime: string; // ISO
  endTime: string | null; // null khi đang chạy
  durationMinutes: number | null; // tính khi stop
}

// --- Request payloads ---

/** CreateTaskDto. priorityScore KHÔNG gửi từ client (server tự tính). */
export interface CreateTaskPayload {
  title: string; // 1..255
  description?: string;
  impact: number; // 1..5
  urgency: number; // 1..5
  estimateMinute?: number; // >= 0
  status?: TaskStatus; // default TODO nếu bỏ trống
  deadline?: string; // ISO, PHẢI ở tương lai
  projectId?: string; // uuid; thiếu → Inbox mặc định
  parentTaskId?: string; // uuid
}

/** UpdateTaskDto — mọi field optional */
export type UpdateTaskPayload = Partial<CreateTaskPayload>;

export type TaskSortBy =
  | "createdAt"
  | "updatedAt"
  | "deadline"
  | "priorityScore"
  | "title";

export type SortOrder = "asc" | "desc";

/** QueryTaskDto (query string GET /tasks) */
export interface TaskQuery {
  page?: number; // default 1
  pageSize?: number; // default 20 (1..100)
  sortBy?: TaskSortBy; // default createdAt
  sortOrder?: SortOrder; // default desc
  keyword?: string;
  status?: TaskStatus;
  projectId?: string;
  dateFrom?: string; // ISO8601
  dateTo?: string; // ISO8601
}

/** Phân trang nằm trong `meta` của list response. */
export interface TaskListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TaskListResult {
  items: Task[];
  meta: TaskListMeta;
}

/** DELETE /tasks/{id} response data */
export interface TaskDeleteResult {
  id: string;
  deleted: true;
}
