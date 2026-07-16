import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CalendarEvent,
  CalendarEventDeleteResult,
  CalendarEventQuery,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from "../types/calendar.types";

/** Lớp DUY NHẤT gọi API calendar. Unwrap envelope; list trả mảng thuần trong `data`. */
export const calendarService = {
  async list(query: CalendarEventQuery = {}): Promise<CalendarEvent[]> {
    const res = await apiClient.get<ApiEnvelope<CalendarEvent[]>>(
      "/calendar-events",
      { params: cleanParams(query) },
    );
    return res.data.data;
  },

  async get(id: string): Promise<CalendarEvent> {
    const res = await apiClient.get<ApiEnvelope<CalendarEvent>>(
      `/calendar-events/${id}`,
    );
    return res.data.data;
  },

  async create(payload: CreateCalendarEventPayload): Promise<CalendarEvent> {
    const res = await apiClient.post<ApiEnvelope<CalendarEvent>>(
      "/calendar-events",
      payload,
    );
    return res.data.data;
  },

  async update(
    id: string,
    payload: UpdateCalendarEventPayload,
  ): Promise<CalendarEvent> {
    const res = await apiClient.patch<ApiEnvelope<CalendarEvent>>(
      `/calendar-events/${id}`,
      payload,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<CalendarEventDeleteResult> {
    const res = await apiClient.delete<ApiEnvelope<CalendarEventDeleteResult>>(
      `/calendar-events/${id}`,
    );
    return res.data.data;
  },
};

function cleanParams(query: CalendarEventQuery): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}
