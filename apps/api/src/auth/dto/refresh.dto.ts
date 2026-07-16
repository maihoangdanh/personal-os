import { IsString } from 'class-validator';

/** POST /auth/refresh */
export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
