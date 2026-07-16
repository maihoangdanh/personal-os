import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * POST /habits/{id}/checkin — body is optional. The log date is always "today"
 * (server UTC calendar day); the client cannot back-date a check-in in Phase 1.
 */
export class CheckinHabitDto {
  /** How many times toward targetPerPeriod this check-in counts. Defaults to 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
