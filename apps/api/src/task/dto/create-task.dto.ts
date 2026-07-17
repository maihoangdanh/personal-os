import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TaskStatus } from '@personal-os/database';
import { IsAfterNow } from '../validators/is-after-now.validator';

/** Accept status case-insensitively (wire "doing" -> enum DOING); responses stay UPPER. */
const toUpperStatus = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;

/**
 * POST /tasks
 *
 * impact / urgency: 1..5 (CHECK is enforced here, not in the DB — see
 * 01_database_phase1.md note #4). priorityScore is computed server-side
 * (impact × urgency), never accepted from the client.
 */
export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  urgency!: number;

  /** Estimated effort in minutes; must not be negative (Business Rule doc 02). */
  @IsOptional()
  @IsInt()
  @Min(0)
  estimateMinute?: number;

  @IsOptional()
  @Transform(toUpperStatus)
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  /** ISO-8601 datetime string; must be in the future. */
  @IsOptional()
  @IsString()
  @IsAfterNow()
  deadline?: string;

  /** Defaults to the user's "Inbox" project when omitted. */
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  /** Optional grouping under a Milestone; must belong to the same project. */
  @IsOptional()
  @IsUUID()
  milestoneId?: string;
}
