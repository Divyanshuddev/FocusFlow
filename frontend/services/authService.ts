import { api } from "@/lib/api";
import type { TokenResponse, User } from "@/types";

export const authService = {
  async register(payload: { name: string; email: string; password: string }): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/api/auth/register", payload);
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/api/auth/login", payload);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/api/auth/me");
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Stateless logout fallback
    }
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token_preview?: string | null }> {
    const { data } = await api.post("/api/auth/forgot-password", { email });
    return data;
  },

  async resetPassword(payload: { token: string; new_password: string }): Promise<{ message: string }> {
    const { data } = await api.post("/api/auth/reset-password", payload);
    return data;
  },
};
