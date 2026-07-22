"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { refreshAccessToken } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-storage";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/useAuthStore";

/**
 * Bảo vệ route + bootstrap phiên.
 *
 * accessToken chỉ ở in-memory nên mất khi F5/mở tab mới. Lúc mount:
 * - Nếu đã có accessToken (vừa login xong, cùng phiên tab) → dùng luôn.
 * - Nếu chưa có → gọi POST /auth/refresh (cookie httpOnly tự gửi kèm). Có cookie hợp lệ
 *   → nhận accessToken mới, set in-memory. Không có / hết hạn (401) → về /login.
 *
 * Chỉ khi có accessToken mới render children + gọi /auth/me hydrate user (interceptor
 * tự refresh nếu access hết hạn giữa phiên).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  // null = đang bootstrap; true = có phiên; false = chưa đăng nhập (đang redirect).
  const [authed, setAuthed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      // Đã có token trong memory (vừa login) → khỏi refresh.
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (!active) return;
      if (token) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace("/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const { data, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.me(),
    enabled: authed === true && !user,
    retry: false,
  });

  React.useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  React.useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (authed !== true || (!user && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang xác thực...
      </div>
    );
  }

  return <>{children}</>;
}
