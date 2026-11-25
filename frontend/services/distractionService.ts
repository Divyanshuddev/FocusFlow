import { api } from "@/lib/api";
import type { Distraction, DistractionCategory, DistractionSummary } from "@/types";

export const distractionService = {
  async list(params?: { category?: string; range?: string }): Promise<DistractionSummary> {
    const { data } = await api.get<DistractionSummary>("/api/distractions", { params });
    return data;
  },

  async create(payload: {
    category: DistractionCategory;
    description?: string | null;
    duration: number;
    focus_session_id?: number | null;
  }): Promise<Distraction> {
    const { data } = await api.post<Distraction>("/api/distractions", payload);
    return data;
  },

  async remove(distractionId: number): Promise<void> {
    await api.delete(`/api/distractions/${distractionId}`);
  },
};
