import type { Task } from "@/features/tasks/types/task.types";
import type { CalendarEvent } from "../types/calendar.types";

export type RangeMode = "day" | "week";

export interface DateRange {
  from: string; // ISO-8601 (đầu khoảng, local midnight)
  to: string; // ISO-8601 (cuối khoảng, local 23:59:59.999)
}

/** Đầu ngày (local) của `d`. */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Cuối ngày (local) của `d`. */
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Khoảng from/to cho anchor + mode. Tuần bắt đầu Thứ Hai (chuẩn VN).
 * Trả ISO string để truyền thẳng vào query `?from=&to=`.
 */
export function computeRange(anchor: Date, mode: RangeMode): DateRange {
  if (mode === "day") {
    return {
      from: startOfDay(anchor).toISOString(),
      to: endOfDay(anchor).toISOString(),
    };
  }
  // week: Thứ Hai → Chủ Nhật
  const day = anchor.getDay(); // 0 = CN, 1 = T2, ...
  const diffToMonday = (day + 6) % 7;
  const monday = startOfDay(anchor);
  monday.setDate(monday.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString(),
    to: endOfDay(sunday).toISOString(),
  };
}

/** Dịch anchor tới/lui theo mode (±1 ngày hoặc ±7 ngày). */
export function shiftAnchor(anchor: Date, mode: RangeMode, dir: 1 | -1): Date {
  const x = new Date(anchor);
  x.setDate(x.getDate() + (mode === "day" ? dir : dir * 7));
  return x;
}

/** Nhãn hiển thị cho khoảng đang xem. */
export function formatRangeLabel(range: DateRange, mode: RangeMode): string {
  const from = new Date(range.from);
  const to = new Date(range.to);
  const fmt = (d: Date) =>
    d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return mode === "day" ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
}

/** Key ngày local "YYYY-MM-DD" từ ISO string hoặc Date (để nhóm theo ngày). */
export function dayKey(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type CalendarAgendaItem =
  | { kind: "task"; id: string; time: string; task: Task }
  | { kind: "event"; id: string; time: string; event: CalendarEvent };

export interface CalendarDayGroup {
  key: string; // "YYYY-MM-DD"
  date: Date;
  label: string; // nhãn ngày local, v.d. "Thứ Hai, 22/07"
  items: CalendarAgendaItem[];
}

/**
 * Gộp Task (có deadline) + CalendarEvent thành nhóm theo từng ngày trong `weekDays` — LUÔN trả
 * đủ 7 ngày kể cả rỗng (Agenda cần hiện "· không có task" cho ngày trống, không thể suy ra ngày
 * từ dữ liệu vì ngày không có gì sẽ không xuất hiện trong `events`/`tasks`).
 * Task không có `deadline` bị bỏ qua hẳn (Agenda chỉ hiện việc có thời điểm cụ thể).
 */
export function groupByDay(
  weekDays: Date[],
  events: CalendarEvent[],
  tasks: Task[],
): CalendarDayGroup[] {
  const buckets = new Map<string, CalendarAgendaItem[]>();
  for (const d of weekDays) buckets.set(dayKey(d), []);

  for (const ev of events) {
    buckets.get(dayKey(ev.startTime))?.push({
      kind: "event",
      id: ev.id,
      time: ev.startTime,
      event: ev,
    });
  }
  for (const t of tasks) {
    if (!t.deadline) continue;
    buckets.get(dayKey(t.deadline))?.push({
      kind: "task",
      id: t.id,
      time: t.deadline,
      task: t,
    });
  }

  return weekDays.map((d) => {
    const key = dayKey(d);
    const items = (buckets.get(key) ?? []).sort((a, b) => a.time.localeCompare(b.time));
    return {
      key,
      date: d,
      label: d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }),
      items,
    };
  });
}
