import { User, UserRole } from '@personal-os/database';

/** Public user profile (never exposes passwordHash). */
export class UserProfileDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  workspaceId!: string;
  timezone!: string;
  createdAt!: Date;

  static from(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }
}

export class TokensDto {
  accessToken!: string;
  refreshToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
}

/** Returned by /auth/register and /auth/login. */
export class AuthResultDto {
  user!: UserProfileDto;
  tokens!: TokensDto;
}
