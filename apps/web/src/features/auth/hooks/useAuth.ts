"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearAccessToken, setAccessToken } from "@/lib/auth-storage";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/useAuthStore";
import type {
  ChangePasswordPayload,
  LoginPayload,
  UpdateProfilePayload,
} from "../types/auth.types";

/** Đăng nhập → lưu token + user → điều hướng dashboard. */
export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (result) => {
      // accessToken giữ in-memory; refreshToken do backend set qua httpOnly cookie.
      setAccessToken(result.tokens.accessToken);
      setUser(result.user);
      router.replace("/dashboard");
    },
  });
}

/** Cập nhật hồ sơ (name/timezone) → đồng bộ store để Sidebar hiện tên mới ngay. */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authService.updateProfile(payload),
    onSuccess: (user) => setUser(user),
  });
}

/** Đổi mật khẩu (verify currentPassword ở backend). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
}

/**
 * Đăng xuất → gọi API `/auth/logout` (backend revoke refresh token trong DB + clear cookie)
 * → xoá accessToken in-memory → về /login. Dùng onSettled để dù API lỗi vẫn xoá state local.
 */
export function useLogout() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearAccessToken();
      setUser(null);
      router.replace("/login");
    },
  });
}
