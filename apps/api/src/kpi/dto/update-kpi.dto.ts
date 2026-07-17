import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

/** PATCH /kpis/{id} — goalId is not reassignable here. */
export class UpdateKpiDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  targetValue?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue?: number;
}
