import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** PATCH /milestones/{id}. projectId not reassignable; isCompleted backend-maintained. */
export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}
