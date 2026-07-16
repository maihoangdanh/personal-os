import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** PATCH /habits/{id} — every field optional. */
export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

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
