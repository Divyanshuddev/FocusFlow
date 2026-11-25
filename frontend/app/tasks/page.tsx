"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { formatRelativeDeadline } from "@/lib/utils";
import { taskService, type TaskFormPayload } from "@/services/taskService";
import type { Task } from "@/types";

export default function TasksPage() {
  const router = useRouter();
  const toast = useToast();
  const { startTimer, dataRefreshTick, bumpRefreshTick } = useFocusTimer();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommended, setRecommended] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("smart");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const res = await taskService.list({
        status: statusFilter,
        priority: priorityFilter,
        search: search.trim() || undefined,
        sort_by: sortBy,
      });
      setTasks(res.items);
      setRecommended(res.recommended_task);
    } catch (err) {
      toast.error("Failed to fetch tasks", extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, search, sortBy, statusFilter, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTasks();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadTasks, dataRefreshTick]);

  const handleSaveTask = async (payload: TaskFormPayload) => {
    try {
      if (editingTask) {
        await taskService.update(editingTask.id, payload);
        toast.success("Task updated", payload.title);
      } else {
        await taskService.create(payload);
        toast.success("Task created", payload.title);
      }
      setEditingTask(null);
      bumpRefreshTick();
    } catch (err) {
      toast.error("Could not save task", extractApiError(err));
      throw err;
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const nextCompleted = task.status !== "completed";
      await taskService.setCompleted(task.id, nextCompleted);
      toast.success(nextCompleted ? "Task completed!" : "Task reopened", task.title);
      bumpRefreshTick();
    } catch (err) {
      toast.error("Update failed", extractApiError(err));
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await taskService.remove(task.id);
      toast.info("Task deleted", task.title);
      bumpRefreshTick();
    } catch (err) {
      toast.error("Delete failed", extractApiError(err));
    }
  };

  const handleFocusTask = async (task: Task) => {
    await startTimer({ task, mode: "focus" });
    router.push("/focus");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Smart Task Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8B8E96]">
              Prioritize by urgency, deadline, importance, and estimated effort.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>

        {/* Recommended Focus Next Banner */}
        {recommended && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card border-[#48BC2B]/25 p-5"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#3A9A22] dark:text-[#5CD13E]">
                  <Zap className="h-4 w-4" />
                  Focus Next Recommendation · Score {recommended.smart_score}
                </div>
                <h2 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                  {recommended.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recommended.recommendation_reasons.map((reason) => (
                    <span
                      key={reason}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-white/[0.08] dark:bg-[#141414] dark:text-[#B5B8C0]"
                    >
                      <Sparkles className="h-3 w-3 text-[#48BC2B]" />
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleFocusTask(recommended)}
                className="btn-primary shrink-0"
              >
                <Play className="h-4 w-4" />
                Start Focus Block
              </button>
            </div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <div className="glass-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B8E96]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title or description..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field w-auto"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field w-auto"
              aria-label="Sort tasks"
            >
              <option value="smart">Sort: Smart Priority</option>
              <option value="deadline">Sort: Deadline</option>
              <option value="priority">Sort: Priority Level</option>
              <option value="newest">Sort: Newest</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card h-24 animate-pulse bg-slate-200/40 dark:bg-[#101010]"
              />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#48BC2B]" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              No tasks match your view
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-[#8B8E96]">
              Create a new task or adjust your filters to see your full backlog.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setModalOpen(true);
              }}
              className="btn-primary mt-4"
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const dl = formatRelativeDeadline(task.deadline);
              const isRecommended = recommended?.id === task.id;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-card-hover flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center ${
                    isRecommended ? "ring-1 ring-[#48BC2B]/45" : ""
                  } ${isCompleted ? "opacity-65" : ""}`}
                >
                  <div className="flex min-w-0 items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(task)}
                      className="mt-0.5 shrink-0 text-[#8B8E96] transition hover:text-[#48BC2B]"
                      aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-[#48BC2B]" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            isCompleted
                              ? "line-through text-[#6E717A]"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {task.title}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            task.priority === "high"
                              ? "bg-[#FC3803]/15 text-[#FF5A26]"
                              : task.priority === "medium"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/10 text-[#8B8E96]"
                          }`}
                        >
                          {task.priority}
                        </span>

                        {task.status === "in_progress" && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                            In Progress
                          </span>
                        )}

                        {isRecommended && (
                          <span className="rounded-full bg-[#48BC2B]/20 px-2 py-0.5 text-[10px] font-semibold text-[#3A9A22] dark:text-[#5CD13E]">
                            Focus Next
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-[#8B8E96]">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {task.estimated_duration}m
                        </span>
                        <span
                          className={
                            dl.isOverdue && !isCompleted
                              ? "font-semibold text-[#FF5A26]"
                              : dl.isUrgent && !isCompleted
                                ? "text-amber-400"
                                : ""
                          }
                        >
                          {dl.label}
                        </span>
                        {!isCompleted && task.smart_score !== null && (
                          <span className="font-mono text-[#3A9A22] dark:text-[#5CD13E]">
                            Score: {task.smart_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleFocusTask(task)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#48BC2B]/15 px-3 py-1.5 text-xs font-semibold text-[#3A9A22] transition hover:bg-[#48BC2B]/25 dark:text-[#5CD13E]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Focus
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setModalOpen(true);
                      }}
                      className="rounded-xl p-2 text-[#8B8E96] transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white"
                      aria-label="Edit task"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(task)}
                      className="rounded-xl p-2 text-[#8B8E96] transition hover:bg-[#FC3803]/10 hover:text-[#FF5A26]"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <TaskFormModal
        open={modalOpen}
        initialTask={editingTask}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
      />
    </AppShell>
  );
}
