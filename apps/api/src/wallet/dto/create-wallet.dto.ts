import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { WalletType } from '@personal-os/database';

/** POST /wallets. balance is backend-maintained, never accepted here. */
export class CreateWalletDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(WalletType)
  type!: WalletType;
}
