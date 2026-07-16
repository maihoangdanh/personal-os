/**
 * Token storage cho SPA gọi API riêng (apps/api).
 *
 * TRADE-OFF (đọc kỹ): token lưu ở localStorage.
 * - Ưu: đơn giản, hoạt động ngay với API cross-origin (localhost:3001) mà không cần
 *   server-side session/cookie same-site; đủ cho MVP Phase 1.
 * - Nhược: dễ bị đánh cắp qua XSS (script độc đọc được localStorage). Backend hiện phát hành
 *   JWT stateless không revoke được (Gap #6 trong 02_backend_auth-task.md) nên token bị lộ chỉ
 *   hết hiệu lực khi hết hạn (access 15m, refresh 7d).
 * - Hướng nâng cấp khi lên production: chuyển refreshToken sang httpOnly Secure SameSite cookie
 *   do backend set, chỉ giữ accessToken trong memory. Cần backend hỗ trợ cookie + CSRF.
 */

const ACCESS_KEY = "personal_os.accessToken";
const REFRESH_KEY = "personal_os.refreshToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return !!getAccessToken();
}
