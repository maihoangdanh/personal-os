"use client";

import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCalendarEventList,
  useDeleteCalendarEvent,
} from "../hooks/useCalendarEvents";
import {
  computeRange,
  formatRangeLabel,
  groupByDay,
  shiftAnchor,
  type RangeMode,
} from "../lib/range";
import type { CalendarEvent } from "../types/calendar.types";
import { CalendarEventFormDialog } from "./CalendarEventFormDialog";

export function CalendarView() {
  const [mode, setMode] = React.useState<RangeMode>("week");
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEvent | null>(null);

  const range = React.useMemo(() => computeRange(anchor, mode), [anchor, mode]);
  const { data, isLoading, isError, error } = useCalendarEventList(range);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setDialogOpen(true);
  }

  const groups = data ? groupByDay(data) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            variant={mode === "day" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("day")}
          >
            Ngày
          </Button>
          <Button
            variant={mode === "week" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("week")}
          >
            Tuần
          </Button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tạo sự kiện
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAnchor((a) => shiftAnchor(a, mode, -1))}
          title="Trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          {formatRangeLabel(range, mode)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAnchor(new Date())}
            title="Về hôm nay"
          >
            Hôm nay
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAnchor((a) => shiftAnchor(a, mode, 1))}
          title="Sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <CalendarSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được sự kiện: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {groups.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Không có sự kiện trong khoảng này. Nhấn{" "}
              <span className="font-medium">Tạo sự kiện</span> để thêm.
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.key} className="space-y-2">
                  <h3 className="text-sm font-semibold capitalize text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.events.map((ev) => (
                      <EventCard key={ev.id} event={ev} onEdit={openEdit} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <CalendarEventFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
      />
    </div>
  );
}

function EventCard({
  event,
  onEdit,
}: {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
}) {
  const deleteMut = useDeleteCalendarEvent();
  const [error, setError] = React.useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteMut.mutateAsync(event.id);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{event.title}</span>
            {event.allDay && <Badge variant="secondary">Cả ngày</Badge>}
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {formatDateTime(event.startTime)}
              {event.endTime ? ` → ${formatDateTime(event.endTime)}` : ""}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {event.location}
              </span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Sửa"
            disabled={deleteMut.isPending}
            onClick={() => onEdit(event)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá (soft delete)"
            disabled={deleteMut.isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg bg-muted"
          aria-hidden
        />
      ))}
    </div>
  );
}
