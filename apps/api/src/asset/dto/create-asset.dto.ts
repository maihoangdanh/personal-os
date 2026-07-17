import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /assets. type is free-text (e.g. Cash, Bank, Crypto, Real Estate, Vehicle). */
export class CreateAssetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;
}
