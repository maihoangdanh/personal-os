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
  ValidateIf,
} from 'class-validator';
import { TaskStatus } from '@personal-os/database';
import { IsAfterNow } from '../validators/is-after-now.validator';

const toUpperStatus = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toUpperCase() : value;

/**
 * PATCH /tasks/{id} — every field optional. If impact or urgency changes,
 * priorityScore is recomputed server-side.
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  impact?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  urgency?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateMinute?: number;

  @IsOptional()
  @Transform(toUpperStatus)
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  @IsAfterNow()
  deadline?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  /** Set to a uuid to assign (same project), or null to unassign from a Milestone. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  milestoneId?: string | null;
}
