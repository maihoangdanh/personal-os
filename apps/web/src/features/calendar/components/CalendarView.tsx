"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCalendarEventList,
  useDeleteCalendarEvent,
} from "../hooks/useCalendarEvents";
import {
  computeRange,
  formatRangeLabel,
  shiftAnchor,
} from "../lib/range";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarEventFormDialog } from "./CalendarEventFormDialog";

const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Key ngày local "YYYY-MM-DD". */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function CalendarView() {
  // Tuần cố định (Thứ Hai → Chủ Nhật) theo mockup — giữ hook/range/routing.
  const mode = "week" as const;
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEvent | null>(null);

  const range = React.useMemo(() => computeRange(anchor, mode), [anchor]);
  const { data, isLoading, isError, error } = useCalendarEventList(range);
  const deleteMut = useDeleteCalendarEvent();

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setDialogOpen(true);
  }

  // 7 cột T2 → CN dựng từ đầu khoảng (range.from = Thứ Hai).
  const weekDays = React.useMemo(() => {
    const start = new Date(range.from);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, name: WEEKDAY_NAMES[i] };
    });
  }, [range.from]);

  // Gom event theo ngày local của startTime.
  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of data ?? []) {
      const key = dayKey(new Date(ev.startTime));
      const bucket = map.get(key);
      if (bucket) bucket.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [data]);

  const today = new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="LỊCH"
        title="Calendar"
        description={`Tuần ${formatRangeLabel(range, mode)}`}
        actions={
          <>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor((a) => shiftAnchor(a, mode, -1))}
                title="Tuần trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAnchor(new Date())}
                title="Về tuần này"
              >
                Hôm nay
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor((a) => shiftAnchor(a, mode, 1))}
                title="Tuần sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Tạo sự kiện
            </Button>
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được sự kiện: {extractApiErrorMessage(error)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {weekDays.map(({ date, name }) => {
          const isToday = isSameDay(date, today);
          const dayEvents = eventsByDay.get(dayKey(date)) ?? [];
          return (
            <div
              key={dayKey(date)}
              className={
                isToday
                  ? "min-h-[300px] rounded-[14px] border border-foreground bg-foreground px-3 py-3.5 shadow-card"
                  : "min-h-[300px] rounded-[14px] border border-border bg-card px-3 py-3.5 shadow-card"
              }
            >
              <div
                className={
                  "font-mono text-[10px] tracking-[0.14em] " +
                  (isToday ? "text-primary" : "text-muted-foreground")
                }
              >
                {name}
              </div>
              <div
                className={
                  "mb-3 mt-1 font-serif text-[22px] font-semibold " +
                  (isToday ? "text-background" : "text-foreground")
                }
              >
                {date.getDate()}
              </div>
              <div className="flex flex-col gap-1.5">
                {isLoading ? (
                  <>
                    <div className="h-10 animate-pulse rounded-[0_8px_8px_0] bg-muted" aria-hidden />
                    <div className="h-10 animate-pulse rounded-[0_8px_8px_0] bg-muted" aria-hidden />
                  </>
                ) : (
                  dayEvents.map((ev) => (
                    <EventBlock
                      key={ev.id}
                      event={ev}
                      onEdit={openEdit}
                      onDelete={() => deleteMut.mutate(ev.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CalendarEventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
      />
    </div>
  );
}

function EventBlock({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: () => void;
}) {
  const timeLabel = event.allDay
    ? "Cả ngày"
    : new Date(event.startTime).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(event)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit(event);
        }
      }}
      className="group relative cursor-pointer rounded-[0_8px_8px_0] border-l-[3px] border-primary bg-secondary py-1.5 pl-2.5 pr-2 transition-colors hover:bg-secondary/70"
    >
      <div className="font-mono text-[9.5px] text-primary">{timeLabel}</div>
      <div className="mt-0.5 text-[11.5px] font-medium leading-[1.35] text-foreground">
        {event.title}
      </div>
      <button
        type="button"
        title="Xoá sự kiện"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
