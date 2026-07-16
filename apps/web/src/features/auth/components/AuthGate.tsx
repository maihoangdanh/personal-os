"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hasTokens } from "@/lib/auth-storage";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/useAuthStore";

/**
 * Bảo vệ route: chưa có token → redirect /login.
 * Có token → gọi /auth/me để hydrate user (interceptor tự refresh nếu accessToken hết hạn;
 * nếu refresh thất bại interceptor tự đẩy về /login).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [checkedToken, setCheckedToken] = React.useState(false);

  React.useEffect(() => {
    if (!hasTokens()) {
      router.replace("/login");
      return;
    }
    setCheckedToken(true);
  }, [router]);

  const { data, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled: checkedToken && !user,
    retry: false,
  });

  React.useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  React.useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (!checkedToken || (!user && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang xác thực...
      </div>
    );
  }

  return <>{children}</>;
}
