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
 * PATCH /transactions/{id}. Transfer legs (transferGroupId != null) cannot be
 * edited here (service returns 422) — delete/recreate the transfer instead.
 */
export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

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
