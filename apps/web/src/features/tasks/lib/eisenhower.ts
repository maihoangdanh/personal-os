import type { Task } from "../types/task.types";

/**
 * NGƯỠNG EISENHOWER — SUY LUẬN, KHÔNG PHẢI TỪ DOC.
 *
 * Đã đọc 02_Business_Rules_Personal_OS_v1.pdf và 05_UI_UX_Specification_Personal_OS_v1.pdf:
 * KHÔNG tài liệu nào định nghĩa ngưỡng phân loại impact/urgency vào 4 ô Eisenhower.
 * Doc chỉ định nghĩa: Priority Score = Impact × Urgency, Impact & Urgency ∈ 1..5.
 * Doc 05 liệt kê view Task = List/Kanban/Timeline/Calendar (không có "Eisenhower Matrix" tên riêng),
 * Dashboard chỉ nói "Top Priority".
 *
 * => Ngưỡng dưới đây là quy ước hợp lý do frontend-engineer chọn, cần leader/PO xác nhận:
 *   - Thang 1..5, điểm giữa là 3.
 *   - "Cao" (important / urgent) khi giá trị >= 3 (tức 3,4,5).
 *   - "Thấp" khi giá trị <= 2 (tức 1,2).
 *   - impact = trục "Important"; urgency = trục "Urgent".
 *
 * 4 quadrant chuẩn Eisenhower:
 *   important cao + urgent cao  → DO_NOW    (Do First)
 *   important cao + urgent thấp → SCHEDULE  (Decide/Schedule)
 *   important thấp + urgent cao → DELEGATE
 *   important thấp + urgent thấp→ IGNORE    (Delete)
 */
export const EISENHOWER_HIGH_THRESHOLD = 3; // >= 3 là cao

export type EisenhowerQuadrant = "DO_NOW" | "SCHEDULE" | "DELEGATE" | "IGNORE";

export interface QuadrantMeta {
  key: EisenhowerQuadrant;
  title: string;
  subtitle: string;
  accent: string; // tailwind classes cho viền/nền nhẹ
}

export const QUADRANTS: QuadrantMeta[] = [
  {
    key: "DO_NOW",
    title: "Do Now",
    subtitle: "Quan trọng · Khẩn cấp",
    accent: "border-destructive/40 bg-destructive/5",
  },
  {
    key: "SCHEDULE",
    title: "Schedule",
    subtitle: "Quan trọng · Không khẩn cấp",
    accent: "border-primary/40 bg-primary/5",
  },
  {
    key: "DELEGATE",
    title: "Delegate",
    subtitle: "Không quan trọng · Khẩn cấp",
    accent: "border-warning/40 bg-warning/5",
  },
  {
    key: "IGNORE",
    title: "Ignore",
    subtitle: "Không quan trọng · Không khẩn cấp",
    accent: "border-border bg-muted/40",
  },
];

export function classifyTask(task: Pick<Task, "impact" | "urgency">): EisenhowerQuadrant {
  const important = task.impact >= EISENHOWER_HIGH_THRESHOLD;
  const urgent = task.urgency >= EISENHOWER_HIGH_THRESHOLD;
  if (important && urgent) return "DO_NOW";
  if (important && !urgent) return "SCHEDULE";
  if (!important && urgent) return "DELEGATE";
  return "IGNORE";
}

/** Nhóm danh sách task theo quadrant. Bỏ qua task đã DONE/ARCHIVED khỏi ma trận. */
export function groupByQuadrant(tasks: Task[]): Record<EisenhowerQuadrant, Task[]> {
  const groups: Record<EisenhowerQuadrant, Task[]> = {
    DO_NOW: [],
    SCHEDULE: [],
    DELEGATE: [],
    IGNORE: [],
  };
  for (const t of tasks) {
    if (t.status === "DONE" || t.status === "ARCHIVED") continue;
    groups[classifyTask(t)].push(t);
  }
  return groups;
}
