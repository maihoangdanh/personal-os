import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class PlanScheduleDto {
  /** Day to start planning from; defaults to today (UTC). "YYYY-MM-DD". */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  /** How many consecutive days to plan (default 3). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  horizonDays: number = 3;
}
