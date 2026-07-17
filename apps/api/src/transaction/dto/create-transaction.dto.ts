import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TransactionType } from '@personal-os/database';

/**
 * POST /transactions (single income/expense; use /transactions/transfer for
 * wallet-to-wallet). amount must be > 0 (checked in service -> 422).
 */
export class CreateTransactionDto {
  @IsUUID()
  walletId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType)
  type!: TransactionType;

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

  /** ISO datetime; defaults to now when omitted. */
  @IsOptional()
  @IsISO8601()
  transactionDate?: string;
}
