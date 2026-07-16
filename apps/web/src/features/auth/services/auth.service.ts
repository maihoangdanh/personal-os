import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  AuthResult,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "../types/auth.types";

/**
 * Lớp DUY NHẤT gọi API auth. Component/hook không tự fetch.
 * Unwrap envelope `{ success, data, meta, error }` → trả `.data`.
 */
export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResult> {
    const res = await apiClient.post<ApiEnvelope<AuthResult>>(
      "/auth/register",
      payload,
    );
    return res.data.data;
  },

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

  async logout(): Promise<void> {
    // Stateless (Gap #6): server chỉ trả { loggedOut: true }, client tự huỷ token.
    await apiClient.post<ApiEnvelope<{ loggedOut: boolean }>>("/auth/logout");
  },
};
