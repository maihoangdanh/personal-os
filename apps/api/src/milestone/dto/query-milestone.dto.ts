import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

/** GET /milestones query params. */
export class QueryMilestoneDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
