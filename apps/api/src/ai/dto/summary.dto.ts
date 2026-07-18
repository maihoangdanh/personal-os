import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { AiSummaryType } from '@personal-os/database';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const SUMMARY_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

/** Uppercase enum input case-insensitively (project convention). */
const toUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;

export class GenerateSummaryDto {
  @Transform(toUpper)
  @IsIn(SUMMARY_TYPES)
  type!: AiSummaryType;

  /** Any date within the target period; defaults to today (UTC). "YYYY-MM-DD". */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}

export class ListSummaryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toUpper)
  @IsIn(SUMMARY_TYPES)
  type?: AiSummaryType;
}
