import { api } from "@/lib/api";
import type { Task, TaskListResponse, TaskPriority, TaskStatus } from "@/types";

export interface TaskFormPayload {
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status?: TaskStatus;
  importance?: number;
  deadline?: string | null;
  estimated_duration: number;
}

export const taskService = {
  async list(params?: {
    status?: string;
    priority?: string;
    search?: string;
    sort_by?: string;
  }): Promise<TaskListResponse> {
    const { data } = await api.get<TaskListResponse>("/api/tasks", { params });
    return data;
  },

  async recommended(): Promise<Task | null> {
    const { data } = await api.get<Task | null>("/api/tasks/recommended");
    return data;
  },

  async create(payload: TaskFormPayload): Promise<Task> {
    const { data } = await api.post<Task>("/api/tasks", payload);
    return data;
  },

  async update(taskId: number, payload: Partial<TaskFormPayload>): Promise<Task> {
    const { data } = await api.put<Task>(`/api/tasks/${taskId}`, payload);
    return data;
  },

  async remove(taskId: number): Promise<void> {
    await api.delete(`/api/tasks/${taskId}`);
  },

  async setCompleted(taskId: number, completed = true): Promise<Task> {
    const { data } = await api.patch<Task>(`/api/tasks/${taskId}/complete`, { completed });
    return data;
  },
};
