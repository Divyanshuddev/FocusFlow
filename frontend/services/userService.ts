import { api } from "@/lib/api";
import type { ThemePreference, User } from "@/types";

export const userService = {
  async getProfile(): Promise<User> {
    const { data } = await api.get<User>("/api/users/me");
    return data;
  },

  async updateProfile(payload: {
    name?: string;
    email?: string;
    default_focus_minutes?: number;
    default_short_break_minutes?: number;
    default_long_break_minutes?: number;
    daily_focus_goal_minutes?: number;
    notifications_enabled?: boolean;
    theme_preference?: ThemePreference;
    timezone?: string;
  }): Promise<User> {
    const { data } = await api.put<User>("/api/users/me", payload);
    return data;
  },

  async changePassword(payload: {
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> {
    const { data } = await api.put<{ message: string }>("/api/users/me/password", payload);
    return data;
  },
};
