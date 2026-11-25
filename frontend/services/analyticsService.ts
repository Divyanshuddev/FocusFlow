import { api } from "@/lib/api";
import type { DailyAnalytics, MonthlyAnalytics, WeeklyAnalytics } from "@/types";

export const analyticsService = {
  async daily(): Promise<DailyAnalytics> {
    const { data } = await api.get<DailyAnalytics>("/api/analytics/daily");
    return data;
  },

  async weekly(): Promise<WeeklyAnalytics> {
    const { data } = await api.get<WeeklyAnalytics>("/api/analytics/weekly");
    return data;
  },

  async monthly(): Promise<MonthlyAnalytics> {
    const { data } = await api.get<MonthlyAnalytics>("/api/analytics/monthly");
    return data;
  },
};
