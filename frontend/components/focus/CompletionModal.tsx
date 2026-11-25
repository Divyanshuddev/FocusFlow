"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Coffee, Flame, Sparkles, X } from "lucide-react";
import { useFocusTimer } from "@/hooks";

export function CompletionModal() {
  const {
    completionModalOpen,
    mode,
    totalSeconds,
    remainingSeconds,
    selectedTaskId,
    selectedTaskTitle,
    isSubmitting,
    completeSessionRecord,
    dismissCompletionModal,
    switchMode,
  } = useFocusTimer();

  const elapsedSecs =
    remainingSeconds === 0 ? totalSeconds : Math.max(60, totalSeconds - remainingSeconds);
  const completedMinutes = Math.max(1, Math.round(elapsedSecs / 60));

  const handleSaveAndSwitchBreak = async (
    taskCompleted: boolean,
    nextBreak?: "short_break" | "long_break"
  ) => {
    await completeSessionRecord(taskCompleted);
    if (nextBreak) {
      await switchMode(nextBreak);
    }
  };

  return (
    <AnimatePresence>
      {completionModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={dismissCompletionModal}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-[#121212] dark:to-[#0A0A0A]"
          >
            <button
              type="button"
              onClick={dismissCompletionModal}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"
              aria-label="Dismiss completion dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#48BC2B]/15 text-[#3A9A22] ring-1 ring-[#48BC2B]/35 dark:text-[#5CD13E]">
                {mode === "focus" ? (
                  <Sparkles className="h-8 w-8" />
                ) : (
                  <Coffee className="h-8 w-8 text-[#FF6A2B]" />
                )}
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
                {mode === "focus" ? "Focus Session Complete!" : "Break Complete!"}
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-[#8B8E96]">
                {mode === "focus"
                  ? `You logged ${completedMinutes} minutes of focused deep work.`
                  : `Your ${completedMinutes}-minute recharge is complete.`}
              </p>

              {mode === "focus" && selectedTaskId && selectedTaskTitle ? (
                <div className="mt-5 w-full rounded-2xl border border-[#48BC2B]/25 bg-[#48BC2B]/[0.07] p-4 text-left">
                  <p className="micro-label text-[#3A9A22] dark:text-[#5CD13E]">Active Task</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">
                    {selectedTaskTitle}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                    Did you complete this task during your session?
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => completeSessionRecord(true)}
                      className="btn-primary w-full"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Yes, Complete Task
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => completeSessionRecord(false)}
                      className="btn-secondary w-full"
                    >
                      Still In Progress
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex w-full flex-col gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => completeSessionRecord(false)}
                    className="btn-primary w-full"
                  >
                    <Flame className="h-4 w-4" />
                    {mode === "focus" ? "Save Focus Session" : "Finish Break"}
                  </button>
                </div>
              )}

              {mode === "focus" && (
                <div className="mt-4 flex w-full items-center justify-center gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveAndSwitchBreak(false, "short_break")}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-[#3A9A22] transition hover:bg-[#48BC2B]/10 dark:text-[#5CD13E]"
                  >
                    Save & Short Break
                  </button>
                  <span className="text-slate-300 dark:text-[#343740]">•</span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveAndSwitchBreak(false, "long_break")}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium text-[#FF6A2B] transition hover:bg-[#FC3803]/10"
                  >
                    Save & Long Break
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
