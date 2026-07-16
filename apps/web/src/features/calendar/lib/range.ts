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

/** Key ngày local "YYYY-MM-DD" từ ISO string (để nhóm theo ngày). */
function dayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface EventDayGroup {
  key: string; // "YYYY-MM-DD"
  label: string; // nhãn ngày local
  events: CalendarEvent[];
}

/** Nhóm event theo ngày `startTime` (local), giữ thứ tự thời gian tăng dần. */
export function groupByDay(events: CalendarEvent[]): EventDayGroup[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = dayKey(ev.startTime);
    const bucket = map.get(key);
    if (bucket) bucket.push(ev);
    else map.set(key, [ev]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, evs]) => ({
      key,
      label: new Date(evs[0].startTime).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      }),
      events: evs,
    }));
}
