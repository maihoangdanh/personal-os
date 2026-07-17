import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GoalStatus } from '@personal-os/database';

/** POST /goals */
export class CreateGoalDto {
  @IsUUID()
  visionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  /** Business validation (doc 04): Goal.targetValue > 0. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetValue?: number;

  /** Manually entered by the user (no auto-rollup — see BACKLOG.md). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue?: number;

  /** Date-only (YYYY-MM-DD). */
  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
