import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** PATCH /auth/me — email/role/password are NOT changeable here. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
