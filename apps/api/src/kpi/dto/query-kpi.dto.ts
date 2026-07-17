import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

/** GET /kpis query params. */
export class QueryKpiDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  goalId?: string;
}
