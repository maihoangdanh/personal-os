import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./auth-storage";

/**
 * Response envelope thật của backend (02_backend_auth-task.md).
 * MỌI endpoint đều trả về shape này — services phải unwrap `.data`.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta: ApiMeta;
  error: ApiError | null;
}

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiError {
  code: number;
  message: string | string[];
  details?: unknown;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Gửi kèm cookie httpOnly `refreshToken` (backend set) cho mọi request auth
  // (`/auth/refresh`, `/auth/logout`). Backend đã bật CORS credentials: true.
  withCredentials: true,
});

// --- Request interceptor: gắn Bearer accessToken ---
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

// --- Response interceptor: tự refresh khi accessToken hết hạn (401) ---
// AccessToken TTL 15m. Khi hết hạn backend trả 401; ta gọi /auth/refresh một lần rồi retry.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Đổi cookie httpOnly `refreshToken` lấy accessToken mới, lưu in-memory, trả token mới.
 * KHÔNG gửi body — backend đọc refreshToken từ cookie (gửi body sẽ bị 400). Response chỉ
 * còn `data.tokens.accessToken` (refreshToken nằm trong cookie mới do backend rotate).
 * Thất bại (không cookie / cookie hết hạn / revoked → 401) → trả null.
 * Export để bootstrap phiên lúc F5 (AuthGate / app/page.tsx).
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    // Dùng axios raw (không qua apiClient) để tránh đệ quy interceptor.
    // withCredentials để cookie refreshToken được gửi kèm.
    const res = await axios.post<ApiEnvelope<{ tokens: RefreshedTokens }>>(
      `${API_BASE_URL}/auth/refresh`,
      undefined,
      { withCredentials: true },
    );
    const tokens = res.data?.data?.tokens;
    if (tokens?.accessToken) {
      setAccessToken(tokens.accessToken);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

interface RefreshedTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    // /auth/refresh: tránh đệ quy. /auth/login: 401 là sai mật khẩu, không phải
    // access token hết hạn → không thử refresh (giữ nguyên lỗi cho form login).
    const skipRefreshRetry =
      typeof original?.url === "string" &&
      (original.url.includes("/auth/refresh") ||
        original.url.includes("/auth/login"));

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !skipRefreshRetry
    ) {
      original._retried = true;
      // Gộp nhiều request 401 đồng thời vào một lần refresh.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        const headers = AxiosHeaders.from(original.headers);
        headers.set("Authorization", `Bearer ${newToken}`);
        original.headers = headers;
        return apiClient(original);
      }
      // Refresh thất bại → session hết hạn thật sự.
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Rút message lỗi dạng người-đọc-được từ AxiosError theo envelope backend. */
export function extractApiErrorMessage(err: unknown, fallback = "Đã có lỗi xảy ra"): string {
  if (axios.isAxiosError(err)) {
    const apiError = (err.response?.data as ApiEnvelope<unknown> | undefined)?.error;
    if (apiError) {
      const msg = apiError.message;
      return Array.isArray(msg) ? msg.join(", ") : msg;
    }
    return err.message ?? fallback;
  }
  return fallback;
}
