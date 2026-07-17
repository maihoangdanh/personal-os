import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProjectStatus } from '@personal-os/database';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

/** GET /projects query params. */
export class QueryProjectDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  goalId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
