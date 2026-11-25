import { api } from "@/lib/api";
import type { Goal, GoalsOverview } from "@/types";

export const goalService = {
  async overview(): Promise<GoalsOverview> {
    const { data } = await api.get<GoalsOverview>("/api/goals");
    return data;
  },

  async setGoal(payload: { target_focus_minutes: number; goal_date?: string }): Promise<Goal> {
    const { data } = await api.post<Goal>("/api/goals", payload);
    return data;
  },

  async updateGoal(goalId: number, payload: { target_focus_minutes: number }): Promise<Goal> {
    const { data } = await api.put<Goal>(`/api/goals/${goalId}`, payload);
    return data;
  },
};
