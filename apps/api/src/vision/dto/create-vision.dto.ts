import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** POST /visions */
export class CreateVisionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(3000)
  targetYear?: number;
}
