import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export const ACCESS_TOKEN_KEY = "focusflow_access_token";
export const REFRESH_TOKEN_KEY = "focusflow_refresh_token";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data;
    storeTokens(access_token, refresh_token);
    return access_token;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!originalRequest) return Promise.reject(error);

    const status = error.response?.status;
    const isAuthRoute =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh");

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = attemptTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export function extractApiError(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    if (
      !error.response &&
      API_BASE_URL.includes("localhost") &&
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return "Frontend API URL is not configured (NEXT_PUBLIC_API_URL is still pointing to localhost). Set NEXT_PUBLIC_API_URL in Vercel and trigger a fresh Redeploy without build cache.";
    }
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
