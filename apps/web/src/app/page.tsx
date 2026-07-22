"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { refreshAccessToken } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-storage";

/**
 * Trang gốc: điều hướng theo trạng thái đăng nhập.
 * accessToken chỉ in-memory (mất khi F5) → thử /auth/refresh bằng cookie httpOnly.
 * Có token → /dashboard (AuthGate thấy token sẵn, không refresh lại). Không → /login.
 */
export default function Home() {
  const router = useRouter();
  React.useEffect(() => {
    let active = true;
    (async () => {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (!active) return;
      router.replace(token ? "/dashboard" : "/login");
    })();
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Đang tải...
    </div>
  );
}
