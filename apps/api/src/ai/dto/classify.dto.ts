import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Classify an (unsaved or existing) task by title/description — runtime, not stored. */
export class ClassifyTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
