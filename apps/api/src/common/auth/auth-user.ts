import { UserRole } from '@personal-os/database';

/** Shape attached to req.user after a valid access token is verified. */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  workspaceId: string;
}

/** JWT access-token payload. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId: string;
}

/** JWT refresh-token payload. */
export interface RefreshTokenPayload {
  sub: string;
}
