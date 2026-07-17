import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '@personal-os/database';

/**
 * PATCH /projects/{id}. goalId is not reassignable here. `progress` is
 * backend-maintained (computed from Tasks) — never accepted from the client.
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
