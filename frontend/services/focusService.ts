import { api } from "@/lib/api";
import type { FocusSession, FocusStats, SessionType } from "@/types";

export const focusService = {
  async start(payload: {
    task_id?: number | null;
    session_type: SessionType;
    planned_duration?: number;
    ambient_sound?: string;
  }): Promise<FocusSession> {
    const { data } = await api.post<FocusSession>("/api/focus/start", payload);
    return data;
  },

  async complete(payload: {
    session_id: number;
    duration?: number;
    duration_seconds?: number;
    status: "completed" | "cancelled" | "interrupted";
    task_completed?: boolean;
  }): Promise<FocusSession> {
    const { data } = await api.post<FocusSession>("/api/focus/complete", payload);
    return data;
  },

  async history(params?: { limit?: number; session_type?: string }): Promise<FocusSession[]> {
    const { data } = await api.get<FocusSession[]>("/api/focus/history", { params });
    return data;
  },

  async stats(): Promise<FocusStats> {
    const { data } = await api.get<FocusStats>("/api/focus/stats");
    return data;
  },

  async active(): Promise<FocusSession | null> {
    const { data } = await api.get<FocusSession | null>("/api/focus/active");
    return data;
  },
};
