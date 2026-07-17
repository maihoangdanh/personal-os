import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '@personal-os/database';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

/** GET /transactions query params. Lists ALL transactions (transfer legs included). */
export class QueryTransactionDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  walletId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}
