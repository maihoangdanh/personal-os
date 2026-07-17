import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsString,
} from 'class-validator';
import { ProjectStatus } from '@personal-os/database';

/** POST /projects */
export class CreateProjectDto {
  @IsUUID()
  goalId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
