"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { hasTokens } from "@/lib/auth-storage";

/** Trang gốc: điều hướng theo trạng thái đăng nhập. */
export default function Home() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace(hasTokens() ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Đang tải...
    </div>
  );
}
