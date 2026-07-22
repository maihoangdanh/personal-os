"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskList } from "@/features/tasks/hooks/useTasks";
import { TaskFormDialog } from "@/features/tasks/components/TaskFormDialog";
import type { Task } from "@/features/tasks/types/task.types";
import { useCalendarEventList } from "../hooks/useCalendarEvents";
import { computeRange, formatRangeLabel, groupByDay, shiftAnchor } from "../lib/range";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarEventFormDialog } from "./CalendarEventFormDialog";
import { CalendarGridView } from "./CalendarGridView";
import { CalendarAgendaView } from "./CalendarAgendaView";

const WEEKDAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VIEW_STORAGE_KEY = "personal-os:calendar-view";

type CalendarViewMode = "grid" | "agenda";

function readStoredView(): CalendarViewMode {
  if (typeof window === "undefined") return "grid";
  const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return v === "agenda" ? "agenda" : "grid";
}

export function CalendarView() {
  const [view, setView] = React.useState<CalendarViewMode>("grid");
  React.useEffect(() => setView(readStoredView()), []);
  function changeView(v: CalendarViewMode) {
    setView(v);
    window.localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  const range = React.useMemo(() => computeRange(anchor, "week"), [anchor]);
  const {
    data: events,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorObj,
  } = useCalendarEventList(range);
  const {
    data: taskPage,
    isLoading: tasksLoading,
    isError: tasksError,
    error: tasksErrorObj,
  } = useTaskList({
    dateFrom: range.from,
    dateTo: range.to,
    pageSize: 100,
    sortBy: "deadline",
    sortOrder: "asc",
  });

  const isLoading = eventsLoading || tasksLoading;
  const isError = eventsError || tasksError;

  function openCreateEvent() {
    setEditingEvent(null);
    setEventDialogOpen(true);
  }
  function openEditEvent(event: CalendarEvent) {
    setEditingEvent(event);
    setEventDialogOpen(true);
  }
  function openEditTask(task: Task) {
    setEditingTask(task);
    setTaskDialogOpen(true);
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

  const allTasks = taskPage?.items ?? [];
  const tasksWithDeadline = React.useMemo(
    () => allTasks.filter((t) => t.deadline),
    [allTasks],
  );
  // Task đang mở, không deadline → dải "không giờ" (Lưới) / bỏ qua hẳn (Agenda).
  const tasksNoDeadline = React.useMemo(
    () =>
      allTasks.filter(
        (t) => !t.deadline && t.status !== "DONE" && t.status !== "ARCHIVED",
      ),
    [allTasks],
  );

  const dayGroups = React.useMemo(
    () => groupByDay(weekDays.map((w) => w.date), events ?? [], tasksWithDeadline),
    [weekDays, events, tasksWithDeadline],
  );

  const today = new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="LỊCH"
        title="Calendar"
        description={`Tuần ${formatRangeLabel(range, "week")}`}
        actions={
          <>
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => changeView("grid")}
              >
                <CalendarDays className="h-4 w-4" /> Lưới
              </Button>
              <Button
                variant={view === "agenda" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => changeView("agenda")}
              >
                <List className="h-4 w-4" /> Agenda
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setAnchor((a) => shiftAnchor(a, "week", -1))}
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
                onClick={() => setAnchor((a) => shiftAnchor(a, "week", 1))}
                title="Tuần sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={openCreateEvent}>
              <Plus className="h-4 w-4" /> Tạo sự kiện
            </Button>
          </>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được dữ liệu: {extractApiErrorMessage(eventsErrorObj ?? tasksErrorObj)}
        </div>
      )}

      {isLoading && !isError && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[300px] animate-pulse rounded-[14px] bg-muted"
              aria-hidden
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && view === "grid" && (
        <CalendarGridView
          weekDays={weekDays}
          today={today}
          events={events ?? []}
          tasksWithDeadline={tasksWithDeadline}
          tasksNoDeadline={tasksNoDeadline}
          onEditTask={openEditTask}
          onEditEvent={openEditEvent}
        />
      )}

      {!isLoading && !isError && view === "agenda" && (
        <CalendarAgendaView
          days={dayGroups}
          onEditTask={openEditTask}
          onEditEvent={openEditEvent}
        />
      )}

      <CalendarEventFormDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={editingEvent}
      />
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
      />
    </div>
  );
}
