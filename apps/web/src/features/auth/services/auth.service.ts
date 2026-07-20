import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  AuthResult,
  AuthUser,
  ChangePasswordPayload,
  LoginPayload,
  UpdateProfilePayload,
} from "../types/auth.types";

/**
 * Lớp DUY NHẤT gọi API auth. Component/hook không tự fetch.
 * Unwrap envelope `{ success, data, meta, error }` → trả `.data`.
 * (register đã gỡ — đăng ký bị khoá vĩnh viễn ở backend.)
 */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const res = await apiClient.post<ApiEnvelope<AuthResult>>(
      "/auth/login",
      payload,
    );
    return res.data.data;
  },

  async me(): Promise<AuthUser> {
    const res = await apiClient.get<ApiEnvelope<AuthUser>>("/auth/me");
    return res.data.data;
  },

  /** PATCH /auth/me — cập nhật hồ sơ (name/timezone). Trả object user như /auth/me. */
  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const res = await apiClient.patch<ApiEnvelope<AuthUser>>("/auth/me", payload);
    return res.data.data;
  },

  /** POST /auth/change-password — verify currentPassword rồi đổi. */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post<ApiEnvelope<unknown>>("/auth/change-password", payload);
  },

  async logout(): Promise<void> {
    // Stateless (Gap #6): server chỉ trả { loggedOut: true }, client tự huỷ token.
    await apiClient.post<ApiEnvelope<{ loggedOut: boolean }>>("/auth/logout");
  },
};
