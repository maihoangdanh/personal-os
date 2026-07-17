import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /milestones. isCompleted is backend-maintained, never accepted here. */
export class CreateMilestoneDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
