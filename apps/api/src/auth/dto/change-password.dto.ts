import { IsString, MaxLength, MinLength } from 'class-validator';

/** POST /auth/change-password */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
