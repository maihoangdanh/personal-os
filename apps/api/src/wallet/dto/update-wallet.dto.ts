import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { WalletType } from '@personal-os/database';

/** PATCH /wallets/{id}. balance is backend-maintained, never accepted here. */
export class UpdateWalletDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(WalletType)
  type?: WalletType;
}
