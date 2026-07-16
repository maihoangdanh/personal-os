"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { clearTokens, setTokens } from "@/lib/auth-storage";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/useAuthStore";
import type { LoginPayload, RegisterPayload } from "../types/auth.types";

/** Đăng ký → lưu token + user → điều hướng dashboard. */
export function useRegister() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (result) => {
      setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      setUser(result.user);
      router.replace("/dashboard");
    },
  });
}

/** Đăng nhập → lưu token + user → điều hướng dashboard. */
export function useLogin() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (result) => {
      setTokens(result.tokens.accessToken, result.tokens.refreshToken);
      setUser(result.user);
      router.replace("/dashboard");
    },
  });
}

/** Đăng xuất → gọi API stateless (best-effort) → xoá token → về /login. */
export function useLogout() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearTokens();
      setUser(null);
      router.replace("/login");
    },
  });
}
