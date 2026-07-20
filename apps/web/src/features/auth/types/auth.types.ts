/**
 * Auth types — copy CHÍNH XÁC từ _workspace/02_backend_auth-task.md (AuthResultDto).
 * Không suy diễn field. Mọi thời gian là ISO string qua wire (không phải Date object).
 */

export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  workspaceId: string;
  timezone: string;
  createdAt: string; // ISO
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string; // "15m"
}

/** data trả về cho POST /auth/register và POST /auth/login */
export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

// --- Request payloads ---
// (RegisterPayload đã gỡ — đăng ký bị khoá vĩnh viễn ở backend.)

export interface LoginPayload {
  email: string;
  password: string;
}

/** PATCH /auth/me */
export interface UpdateProfilePayload {
  name?: string; // 1..200
  timezone?: string; // <=64
}

/** POST /auth/change-password */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string; // 8..72
}
