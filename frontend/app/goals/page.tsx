"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Award, Flame, Sparkles, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StreakProgressCard } from "@/components/dashboard/StreakProgressCard";
import { useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import { goalService } from "@/services/goalService";
import type { GoalsOverview } from "@/types";

const goalSchema = z.object({
  target_focus_minutes: z.coerce
    .number()
    .min(15, "Minimum daily goal is 15 minutes")
    .max(720, "Maximum daily goal is 720 minutes"),
});

type GoalValues = z.infer<typeof goalSchema>;

const INTENSITY_STYLES = [
  "bg-slate-200/70 dark:bg-[#1A1A1A] text-slate-400 dark:text-[#6E717A]",
  "bg-[#142E0E] text-[#7FE066] border border-[#48BC2B]/20",
  "bg-[#214F16] text-white border border-[#48BC2B]/35",
  "bg-[#347E21] text-white border border-[#48BC2B]/45",
  "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-[0_0_12px_rgba(72,188,43,0.45)]",
];

export default function GoalsPage() {
  const toast = useToast();
  const { dataRefreshTick, bumpRefreshTick } = useFocusTimer();

  const [overview, setOverview] = useState<GoalsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { target_focus_minutes: 120 },
  });

  const watchedTarget = watch("target_focus_minutes");

  const loadGoals = useCallback(async () => {
    try {
      const data = await goalService.overview();
      setOverview(data);
      setValue("target_focus_minutes", data.today_goal.target_focus_minutes);
    } catch (err) {
      toast.error("Failed to load goals", extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [setValue, toast]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals, dataRefreshTick]);

  const onSubmit = async (values: GoalValues) => {
    try {
      await goalService.setGoal({ target_focus_minutes: values.target_focus_minutes });
      toast.success(
        "Daily goal updated!",
        `Target set to ${formatMinutes(values.target_focus_minutes)} for today.`
      );
      bumpRefreshTick();
    } catch (err) {
      toast.error("Could not update goal", extractApiError(err));
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daily Goals & Streaks
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8B8E96]">
            Build sustainable daily focus habits and track your multi-week consistency.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#48BC2B]/15 text-[#48BC2B]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="micro-label text-[#3A9A22] dark:text-[#5CD13E]">Daily Coaching Note</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-white">
                {overview?.motivational_message ||
                  "Consistency beats intensity — hit today's target to extend your streak."}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Current Streak</span>
              <Flame className="h-4 w-4 text-[#FC3803] fill-current" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {overview?.current_streak ?? 0} days
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
              Consecutive days meeting goal
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Best Streak</span>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {overview?.best_streak ?? 0} days
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">All-time record</p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Goals Met</span>
              <Award className="h-4 w-4 text-[#48BC2B]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#3A9A22] dark:text-[#5CD13E] tabular-nums">
              {overview?.total_goal_days_met ?? 0} days
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
              Total daily targets reached
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <StreakProgressCard
              streak={overview?.current_streak ?? 0}
              achievedMinutes={overview?.today_goal.achieved_minutes ?? 0}
              targetMinutes={overview?.today_goal.target_focus_minutes ?? 120}
              todayDate={overview?.today_goal.goal_date}
              calendar={overview?.calendar}
            />

            <div className="glass-card p-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#48BC2B]" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Configure Today&apos;s Focus Goal
                </h2>
              </div>

              {loading || !overview ? (
                <div className="mt-6 h-32 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-[#141414]" />
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#B5B8C0]">
                      Set Daily Focus Target (minutes)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={720}
                      {...register("target_focus_minutes")}
                      className="input-field"
                    />
                    {errors.target_focus_minutes && (
                      <p className="mt-1 text-xs text-[#FF5A26]">
                        {errors.target_focus_minutes.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[60, 90, 120, 150, 180].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setValue("target_focus_minutes", mins)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                          Number(watchedTarget) === mins
                            ? "bg-[#48BC2B]/20 text-[#3A9A22] ring-1 ring-[#48BC2B]/40 dark:text-[#5CD13E]"
                            : "bg-slate-100 text-slate-600 dark:bg-[#141414] dark:text-[#8B8E96]"
                        }`}
                      >
                        {formatMinutes(mins)}
                      </button>
                    ))}
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                    {isSubmitting ? "Saving Goal..." : "Update Daily Goal"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="glass-card p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  35-Day Progress Calendar
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Daily focus intensity relative to your goal target
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8B8E96]">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((lvl) => (
                  <span
                    key={lvl}
                    className={`h-3 w-3 rounded ${INTENSITY_STYLES[lvl]}`}
                  />
                ))}
                <span>Goal</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2.5">
              {(overview?.calendar ?? []).map((day) => {
                const dateObj = new Date(`${day.date}T00:00:00`);
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.focus_minutes}m / ${day.target_minutes}m`}
                    className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition hover:scale-105 ${
                      INTENSITY_STYLES[day.intensity] || INTENSITY_STYLES[0]
                    }`}
                  >
                    <span>{dateObj.getDate()}</span>
                    {day.focus_minutes > 0 && (
                      <span className="text-[9px] opacity-85">{day.focus_minutes}m</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-white/[0.08]">
              <h3 className="micro-label">Recent Goal Logs</h3>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                {(overview?.recent_goals ?? []).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-2 text-xs dark:border-white/[0.06] dark:bg-[#141414]"
                  >
                    <span className="font-medium text-slate-700 dark:text-white">
                      {g.goal_date}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 dark:text-[#8B8E96]">
                        {g.achieved_minutes} / {g.target_focus_minutes}m ({g.progress_pct}%)
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          g.completed
                            ? "bg-[#48BC2B]/15 text-[#3A9A22] dark:text-[#5CD13E]"
                            : "bg-white/10 text-[#8B8E96]"
                        }`}
                      >
                        {g.completed ? "Met" : "In Progress"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
