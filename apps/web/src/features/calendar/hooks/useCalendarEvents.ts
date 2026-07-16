"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarService } from "../services/calendar.service";
import type {
  CalendarEventQuery,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from "../types/calendar.types";

export const calendarKeys = {
  all: ["calendar-events"] as const,
  list: (query: CalendarEventQuery) =>
    ["calendar-events", "list", query] as const,
  detail: (id: string) => ["calendar-events", "detail", id] as const,
};

export function useCalendarEventList(query: CalendarEventQuery) {
  return useQuery({
    queryKey: calendarKeys.list(query),
    queryFn: () => calendarService.list(query),
    staleTime: 30_000,
  });
}

function useInvalidateCalendar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: calendarKeys.all });
}

export function useCreateCalendarEvent() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      calendarService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCalendarEvent() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCalendarEventPayload;
    }) => calendarService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCalendarEvent() {
  const invalidate = useInvalidateCalendar();
  return useMutation({
    mutationFn: (id: string) => calendarService.remove(id),
    onSuccess: invalidate,
  });
}
