import { IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** GET /journals query params. Optional YYYY-MM-DD date range on `date`. */
export class QueryJournalDto extends PaginationQueryDto {
  @IsOptional()
  @Matches(DATE_RE, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'dateTo must be YYYY-MM-DD' })
  dateTo?: string;
}
