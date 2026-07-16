import { IsISO8601, IsOptional } from 'class-validator';

/**
 * GET /calendar-events query params. `from`/`to` filter by startTime so the
 * frontend can load a day or week window. Both optional; omit for all events.
 */
export class QueryCalendarEventDto {
  /** ISO-8601 — include events with startTime >= from. */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** ISO-8601 — include events with startTime <= to. */
  @IsOptional()
  @IsISO8601()
  to?: string;
}
