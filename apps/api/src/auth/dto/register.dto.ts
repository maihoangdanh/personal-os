import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * POST /auth/register  (MVP bootstrap endpoint — see notes; not in 04_API_Spec,
 * added to create the first user + their Workspace).
 */
export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  /** Optional workspace name; defaults to "<name>'s Workspace". */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workspaceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
