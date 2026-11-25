"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldAlert, X } from "lucide-react";
import type { DistractionCategory } from "@/types";

const distractionSchema = z.object({
  category: z.enum([
    "social_media",
    "entertainment",
    "notifications",
    "multitasking",
    "other",
  ]),
  duration: z.coerce.number().min(1, "At least 1 minute").max(480, "Max 480 minutes"),
  description: z.string().max(500).optional(),
});

type DistractionFormValues = z.infer<typeof distractionSchema>;

interface DistractionModalProps {
  open: boolean;
  focusSessionId?: number | null;
  onClose: () => void;
  onSubmit: (payload: {
    category: DistractionCategory;
    duration: number;
    description?: string | null;
    focus_session_id?: number | null;
  }) => Promise<void>;
}

const CATEGORIES: Array<{ value: DistractionCategory; label: string }> = [
  { value: "social_media", label: "Social Media" },
  { value: "entertainment", label: "Entertainment" },
  { value: "notifications", label: "Notifications" },
  { value: "multitasking", label: "Multitasking" },
  { value: "other", label: "Other" },
];

export function DistractionModal({
  open,
  focusSessionId,
  onClose,
  onSubmit,
}: DistractionModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DistractionFormValues>({
    resolver: zodResolver(distractionSchema),
    defaultValues: {
      category: "notifications",
      duration: 5,
      description: "",
    },
  });

  const selectedCat = watch("category");
  const selectedDur = watch("duration");

  const handleFormSubmit = async (values: DistractionFormValues) => {
    await onSubmit({
      category: values.category,
      duration: values.duration,
      description: values.description?.trim() || null,
      focus_session_id: focusSessionId ?? null,
    });
    reset();
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
            className="relative z-10 w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-[#121212] dark:to-[#0A0A0A]"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FC3803]/15 text-[#FC3803]">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Log Distraction
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                    Manual entry to spot what breaks your flow
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setValue("category", cat.value)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                        selectedCat === cat.value
                          ? "border-[#FC3803]/50 bg-[#FC3803]/15 text-[#FC3803] dark:text-[#FF6A2B]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-[#141414] dark:text-[#8B8E96]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  {...register("duration")}
                  className="input-field"
                />
                {errors.duration && (
                  <p className="mt-1 text-xs text-[#FF5A26]">{errors.duration.message}</p>
                )}
                <div className="mt-2 flex gap-2">
                  {[5, 10, 15, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setValue("duration", m)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                        Number(selectedDur) === m
                          ? "bg-[#FC3803]/20 text-[#FF6A2B] ring-1 ring-[#FC3803]/40"
                          : "bg-slate-100 text-slate-500 dark:bg-[#1E2025] dark:text-[#8B8E96]"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                  What happened? (optional)
                </label>
                <textarea
                  {...register("description")}
                  rows={2}
                  placeholder="e.g., Checked phone notifications mid-sprint..."
                  className="input-field resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? "Logging..." : "Log Distraction"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
