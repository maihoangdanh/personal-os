import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * POST /calendar-events
 *
 * Single-occurrence only (no recurrence in Phase 1). endTime is optional; when
 * present it must be after startTime — that cross-field rule is enforced in the
 * service (works uniformly for create and partial PATCH).
 */
export class CreateCalendarEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** ISO-8601 datetime. Required. */
  @IsISO8601()
  startTime!: string;

  /** ISO-8601 datetime. Optional (open-ended / all-day events). */
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;
}
