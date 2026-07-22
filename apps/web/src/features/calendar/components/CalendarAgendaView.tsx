"use client";

import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { useCompleteTask, useUpdateTask } from "@/features/tasks/hooks/useTasks";
import type { Task } from "@/features/tasks/types/task.types";
import type { CalendarDayGroup } from "../lib/range";
import type { CalendarEvent } from "../types/calendar.types";

interface CalendarAgendaViewProps {
  days: CalendarDayGroup[];
  onEditTask: (task: Task) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

/** Danh sách theo ngày: trộn Task (có deadline) + Event, tick task ngay tại chỗ. */
export function CalendarAgendaView({
  days,
  onEditTask,
  onEditEvent,
}: CalendarAgendaViewProps) {
  return (
    <div className="space-y-3">
      {days.map((day) => (
        <div
          key={day.key}
          className="rounded-[14px] border border-border bg-card px-4 py-3.5 shadow-card"
        >
          <div className="flex items-baseline gap-2">
            <h3 className="font-serif text-[15px] font-semibold capitalize text-foreground">
              {day.label}
            </h3>
            {day.items.length === 0 && (
              <span className="text-[12.5px] text-muted-foreground">
                · không có task
              </span>
            )}
          </div>

          {day.items.length > 0 && (
            <ul className="-mx-2 mt-2 flex flex-col">
              {day.items.map((item) =>
                item.kind === "task" ? (
                  <AgendaTaskRow
                    key={`task-${item.id}`}
                    task={item.task}
                    onEdit={() => onEditTask(item.task)}
                  />
                ) : (
                  <AgendaEventRow
                    key={`event-${item.id}`}
                    event={item.event}
                    onEdit={() => onEditEvent(item.event)}
                  />
                ),
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function AgendaTaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const completeMut = useCompleteTask();
  const updateMut = useUpdateTask();
  const isDone = task.status === "DONE";
  const toggleBusy = completeMut.isPending || updateMut.isPending;

  return (
    <li className="flex items-center gap-3 rounded-[10px] px-2 py-[9px] transition-colors hover:bg-secondary">
      <button
        type="button"
        title={isDone ? "Bỏ hoàn thành" : "Hoàn thành"}
        disabled={toggleBusy}
        onClick={() =>
          isDone
            ? updateMut.mutate({ id: task.id, payload: { status: "TODO" } })
            : completeMut.mutate(task.id)
        }
        className={cn(
          "flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          isDone
            ? "border-primary bg-primary"
            : "border-border bg-transparent hover:border-primary",
        )}
      >
        <Check
          className={cn("h-3 w-3", isDone ? "text-primary-foreground" : "text-transparent")}
          strokeWidth={3}
        />
      </button>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-[13px] font-medium",
          isDone ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {task.title}
      </button>
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {formatTime(task.deadline)}
      </span>
    </li>
  );
}

function AgendaEventRow({
  event,
  onEdit,
}: {
  event: CalendarEvent;
  onEdit: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center gap-3 rounded-[10px] px-2 py-[9px] text-left transition-colors hover:bg-secondary"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">
            {event.title}
          </div>
          {event.location && (
            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {event.location}
            </div>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {event.allDay ? "Cả ngày" : formatTime(event.startTime)}
        </span>
      </button>
    </li>
  );
}
