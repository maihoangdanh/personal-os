import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * POST /transactions/transfer — wallet-to-wallet transfer. Creates two linked
 * legs (EXPENSE on source + INCOME on destination) sharing a transferGroupId,
 * atomically. amount must be > 0 (service -> 422); source != destination.
 */
export class TransferDto {
  @IsUUID()
  fromWalletId!: string;

  @IsUUID()
  toWalletId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsISO8601()
  transactionDate?: string;
}
