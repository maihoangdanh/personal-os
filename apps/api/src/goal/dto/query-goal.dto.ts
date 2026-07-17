import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { GoalStatus } from '@personal-os/database';
import { PaginationQueryDto } from '../../common/http/pagination-query.dto';

/** GET /goals query params. */
export class QueryGoalDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  visionId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
