import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
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

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Dùng axios raw (không qua apiClient) để tránh đệ quy interceptor.
    const res = await axios.post<ApiEnvelope<{ tokens: RefreshedTokens }>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const tokens = res.data?.data?.tokens;
    if (tokens?.accessToken && tokens?.refreshToken) {
      setTokens(tokens.accessToken, tokens.refreshToken);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;

    const isAuthEndpoint =
      typeof original?.url === "string" &&
      original.url.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthEndpoint &&
      getRefreshToken()
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
      clearTokens();
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
