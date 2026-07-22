/**
 * Access token storage cho SPA gọi API riêng (apps/api).
 *
 * accessToken được giữ **in-memory** (biến module-level, KHÔNG localStorage) để:
 * - axios interceptor đọc được ngoài React (getAccessToken).
 * - chống XSS: script độc không đọc được token từ localStorage.
 *
 * refreshToken KHÔNG còn ở frontend — backend phát hành qua httpOnly cookie
 * (tên `refreshToken`, path `/api/v1/auth`), tự gửi kèm khi gọi `/auth/*`. Frontend
 * không cần và không thể biết giá trị refreshToken.
 *
 * Hệ quả: accessToken mất khi F5/mở tab mới (chỉ in-memory). Bootstrap lại phiên
 * bằng cách gọi `POST /auth/refresh` lúc mount (cookie tự gửi) — xem AuthGate / app/page.tsx.
 */

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
