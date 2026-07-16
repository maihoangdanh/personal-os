import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * POST /habits
 *
 * frequency is a free String (schema: VarChar(20), default "DAILY") — kept open
 * on purpose (not one of the 7 mandated enums). targetPerPeriod is a SmallInt.
 */
export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  targetPerPeriod?: number;
}
