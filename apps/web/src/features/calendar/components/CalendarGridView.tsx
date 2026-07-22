"use client";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { Task } from "@/features/tasks/types/task.types";
import type { CalendarEvent } from "../types/calendar.types";
import { dayKey } from "../lib/range";

const HOUR_START = 6; // 6:00 — tránh mảng trắng 6 tiếng đêm gần như luôn rỗng
const HOUR_END = 24; // 24:00
const HOUR_PX = 44; // chiều cao 1 giờ trên trục
const TIMELINE_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX;
const MIN_BLOCK_MINUTE = 30; // Task không estimateMinute / Event không endTime → quy đổi khối tối thiểu này

interface CalendarGridViewProps {
  weekDays: { date: Date; name: string }[];
  today: Date;
  events: CalendarEvent[];
  tasksWithDeadline: Task[];
  tasksNoDeadline: Task[];
  onEditTask: (task: Task) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** top (px) tính từ giờ bắt đầu trục, kẹp trong [0, TIMELINE_HEIGHT]. */
function topPx(d: Date): number {
  const minutesFromStart = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
  const clamped = Math.max(0, Math.min((HOUR_END - HOUR_START) * 60, minutesFromStart));
  return (clamped / 60) * HOUR_PX;
}

/**
 * top + height (px) cho 1 khối, LUÔN kẹp trong biên [0, TIMELINE_HEIGHT] — event/task có
 * `endTime`/`estimateMinute` bất thường (rất dài, hoặc lệch qua tận đêm hôm sau) sẽ không còn
 * tràn khỏi khung 18 giờ, phá layout/kéo dài trang (bug thật gặp trên dữ liệu production).
 */
function blockGeometry(start: Date, durationMinute: number | null): { top: number; height: number } {
  const top = topPx(start);
  const rawMinute = durationMinute && durationMinute > 0 ? durationMinute : MIN_BLOCK_MINUTE;
  const rawHeight = Math.max((rawMinute / 60) * HOUR_PX, (MIN_BLOCK_MINUTE / 60) * HOUR_PX);
  const height = Math.min(rawHeight, TIMELINE_HEIGHT - top);
  return { top, height };
}

export function CalendarGridView({
  weekDays,
  today,
  events,
  tasksWithDeadline,
  tasksNoDeadline,
  onEditTask,
  onEditEvent,
}: CalendarGridViewProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="space-y-2.5">
      {tasksNoDeadline.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card px-3.5 py-3 shadow-card">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Không giờ · task đang mở chưa có deadline
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tasksNoDeadline.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onEditTask(task)}
                className="rounded-full border-l-[3px] border-primary bg-secondary py-1 pl-2.5 pr-3 text-[11.5px] font-medium text-foreground transition-colors hover:bg-secondary/70"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2.5 overflow-x-auto">
        {/* Trục giờ dùng chung, canh cùng chiều cao với 7 cột ngày. */}
        <div className="w-11 shrink-0" style={{ paddingTop: 32 }}>
          <div style={{ height: TIMELINE_HEIGHT }} className="relative">
            {hours.map((h) => (
              <div
                key={h}
                style={{ top: (h - HOUR_START) * HOUR_PX }}
                className="absolute -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {weekDays.map(({ date, name }) => {
          const key = dayKey(date);
          const isToday = isSameDay(date, today);
          const dayEvents = events.filter((ev) => dayKey(ev.startTime) === key);
          const dayTasks = tasksWithDeadline.filter(
            (t) => t.deadline && dayKey(t.deadline) === key,
          );

          return (
            <div key={key} className="min-w-[128px] flex-1">
              <div
                className={cn(
                  "mb-1 rounded-[10px] px-2 py-1 text-center",
                  isToday ? "bg-foreground" : "",
                )}
              >
                <div
                  className={cn(
                    "font-mono text-[10px] tracking-[0.14em]",
                    isToday ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {name}
                </div>
                <div
                  className={cn(
                    "font-serif text-[15px] font-semibold",
                    isToday ? "text-background" : "text-foreground",
                  )}
                >
                  {date.getDate()}
                </div>
              </div>

              <div
                style={{ height: TIMELINE_HEIGHT }}
                className="relative overflow-hidden rounded-[10px] border border-border bg-card"
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ top: (h - HOUR_START) * HOUR_PX }}
                    className="absolute left-0 right-0 border-t border-border/60"
                    aria-hidden
                  />
                ))}

                {dayEvents.map((ev) => {
                  const start = new Date(ev.startTime);
                  const duration = ev.endTime
                    ? (new Date(ev.endTime).getTime() - start.getTime()) / 60_000
                    : null;
                  const { top, height } = blockGeometry(start, duration);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEditEvent(ev)}
                      style={{ top, height }}
                      className="absolute left-1 right-1 overflow-hidden rounded-[0_6px_6px_0] border-l-[3px] border-accent-2 bg-accent-2/[0.12] px-1.5 py-0.5 text-left transition-colors hover:bg-accent-2/[0.2]"
                    >
                      <div className="truncate font-mono text-[9px] text-accent-2">
                        {ev.allDay ? "Cả ngày" : formatTime(ev.startTime)}
                      </div>
                      <div className="truncate text-[10.5px] font-medium leading-tight text-foreground">
                        {ev.title}
                      </div>
                    </button>
                  );
                })}

                {dayTasks.map((t) => {
                  const start = new Date(t.deadline as string);
                  const isDone = t.status === "DONE";
                  const { top, height } = blockGeometry(start, t.estimateMinute);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onEditTask(t)}
                      style={{ top, height }}
                      className={cn(
                        "absolute left-1 right-1 overflow-hidden rounded-[0_6px_6px_0] border-l-[3px] border-primary bg-primary/[0.1] px-1.5 py-0.5 text-left transition-colors hover:bg-primary/[0.18]",
                        isDone && "opacity-60",
                      )}
                    >
                      <div className="truncate font-mono text-[9px] text-primary">
                        {formatTime(t.deadline)}
                      </div>
                      <div
                        className={cn(
                          "truncate text-[10.5px] font-medium leading-tight text-foreground",
                          isDone && "line-through",
                        )}
                      >
                        {t.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
