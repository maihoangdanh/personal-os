import { create } from "zustand";
import type { AuthUser } from "../types/auth.types";

/**
 * Client state cho auth: chỉ giữ thông tin user hiện tại + trạng thái hydrate.
 * Token KHÔNG giữ ở đây — accessToken nằm in-memory (lib/auth-storage.ts) để interceptor
 * axios đọc được ngoài React; refreshToken do backend quản qua httpOnly cookie.
 * Server state (task, dashboard) đi qua React Query.
 */
interface AuthState {
  user: AuthUser | null;
  /** đã kiểm tra localStorage / gọi /me xong lần đầu chưa */
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (v) => set({ isHydrated: v }),
}));
