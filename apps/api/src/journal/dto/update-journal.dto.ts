import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** PATCH /journals/{id}. date is not reassignable here (avoids unique collisions). */
export class UpdateJournalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mood?: string;
}
