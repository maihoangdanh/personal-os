import { CalendarEvent } from '@personal-os/database';

/** Exact shape returned for a CalendarEvent. Copy this when building the frontend type. */
export class CalendarEventResponseDto {
  id!: string;
  userId!: string;
  title!: string;
  description!: string | null;
  startTime!: string; // ISO-8601
  endTime!: string | null; // ISO-8601
  location!: string | null;
  allDay!: boolean;
  createdAt!: string; // ISO-8601
  updatedAt!: string; // ISO-8601

  static from(e: CalendarEvent): CalendarEventResponseDto {
    return {
      id: e.id,
      userId: e.userId,
      title: e.title,
      description: e.description,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime ? e.endTime.toISOString() : null,
      location: e.location,
      allDay: e.allDay,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }
}
