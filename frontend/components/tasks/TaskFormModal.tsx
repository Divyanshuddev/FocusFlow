"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import type { Task } from "@/types";
import type { TaskFormPayload } from "@/services/taskService";

const taskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["todo", "in_progress", "completed"]),
  importance: z.coerce.number().min(1).max(5),
  estimated_duration: z.coerce
    .number()
    .min(5, "Minimum 5 minutes")
    .max(480, "Maximum 480 minutes"),
  deadline_local: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  initialTask?: Task | null;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskFormModal({ open, initialTask, onClose, onSubmit }: TaskFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      importance: 3,
      estimated_duration: 25,
      deadline_local: "",
    },
  });

  const estDuration = watch("estimated_duration");

  useEffect(() => {
    if (open) {
      if (initialTask) {
        reset({
          title: initialTask.title,
          description: initialTask.description || "",
          priority: initialTask.priority,
          status: initialTask.status,
          importance: initialTask.importance,
          estimated_duration: initialTask.estimated_duration,
          deadline_local: toDatetimeLocalValue(initialTask.deadline),
        });
      } else {
        reset({
          title: "",
          description: "",
          priority: "medium",
          status: "todo",
          importance: 3,
          estimated_duration: 25,
          deadline_local: "",
        });
      }
    }
  }, [open, initialTask, reset]);

  const handleFormSubmit = async (values: TaskFormValues) => {
    const deadlineIso = values.deadline_local
      ? new Date(values.deadline_local).toISOString()
      : null;

    await onSubmit({
      title: values.title,
      description: values.description?.trim() || null,
      priority: values.priority,
      status: values.status,
      importance: values.importance,
      estimated_duration: values.estimated_duration,
      deadline: deadlineIso,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative z-10 w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-[#121212] dark:to-[#0A0A0A]"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {initialTask ? "Edit Task" : "Create New Task"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Priority, deadline, and effort power FocusFlow&apos;s smart recommendation engine.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                  Task Title *
                </label>
                <input
                  {...register("title")}
                  placeholder="e.g., Implement OAuth token refresh flow"
                  className="input-field"
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-[#FF5A26]">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Optional acceptance criteria or focus notes..."
                  className="input-field resize-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                    Priority
                  </label>
                  <select {...register("priority")} className="input-field">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                    Importance (1–5)
                  </label>
                  <select {...register("importance")} className="input-field">
                    <option value={5}>5 — Critical</option>
                    <option value={4}>4 — High</option>
                    <option value={3}>3 — Normal</option>
                    <option value={2}>2 — Minor</option>
                    <option value={1}>1 — Optional</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                    Status
                  </label>
                  <select {...register("status")} className="input-field">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                    Deadline
                  </label>
                  <input
                    type="datetime-local"
                    {...register("deadline_local")}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                    Estimated Duration (mins)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    {...register("estimated_duration")}
                    className="input-field"
                  />
                  {errors.estimated_duration && (
                    <p className="mt-1 text-xs text-[#FF5A26]">
                      {errors.estimated_duration.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#8B8E96]">
                  Quick presets:
                </span>
                {[15, 25, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setValue("estimated_duration", mins)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      Number(estDuration) === mins
                        ? "bg-[#48BC2B]/20 text-[#3A9A22] ring-1 ring-[#48BC2B]/40 dark:text-[#5CD13E]"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1E2025] dark:text-[#8B8E96]"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting
                    ? "Saving..."
                    : initialTask
                      ? "Save Changes"
                      : "Create Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
