import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** POST /journals. One entry per user per day (unique [userId, date]). */
export class CreateJournalDto {
  /** Date-only YYYY-MM-DD. */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  /** Free-text mood (e.g. great/good/neutral/bad); no fixed enum. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mood?: string;
}
