import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GoalStatus } from '@personal-os/database';

/** PATCH /goals/{id} — visionId is not reassignable here. */
export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
