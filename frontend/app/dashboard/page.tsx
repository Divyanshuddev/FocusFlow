"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Pause,
  Play,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CircularTimer } from "@/components/focus/CircularTimer";
import { StreakProgressCard } from "@/components/dashboard/StreakProgressCard";
import { TaskFormModal } from "@/components/tasks/TaskFormModal";
import { useAuth, useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { formatMinutes, formatRelativeDeadline } from "@/lib/utils";
import { analyticsService } from "@/services/analyticsService";
import { goalService } from "@/services/goalService";
import { taskService, type TaskFormPayload } from "@/services/taskService";
import type { DailyAnalytics, GoalsOverview, Task, WeeklyAnalytics } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const {
    mode,
    status,
    totalSeconds,
    remainingSeconds,
    progressPct,
    selectedTaskTitle,
    startTimer,
    pauseTimer,
    resumeTimer,
    dataRefreshTick,
    bumpRefreshTick,
  } = useFocusTimer();

  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [goalsOverview, setGoalsOverview] = useState<GoalsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dailyData, weeklyData, goalsData] = await Promise.all([
        analyticsService.daily(),
        analyticsService.weekly(),
        goalService.overview(),
      ]);
      setDaily(dailyData);
      setWeekly(weeklyData);
      setGoalsOverview(goalsData);
    } catch (err) {
      toast.error("Failed to load dashboard", extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData, dataRefreshTick]);

  const handleQuickComplete = async (task: Task) => {
    try {
      await taskService.setCompleted(task.id, true);
      toast.success("Task completed!", task.title);
      bumpRefreshTick();
    } catch (err) {
      toast.error("Could not update task", extractApiError(err));
    }
  };

  const handleStartFocusOnTask = async (task: Task) => {
    await startTimer({ task, mode: "focus" });
    router.push("/focus");
  };

  const handleCreateTask = async (payload: TaskFormPayload) => {
    await taskService.create(payload);
    toast.success("Task added", payload.title);
    bumpRefreshTick();
  };

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative overflow-hidden p-6 sm:p-7"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#48BC2B]/[0.1] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#48BC2B]/30 bg-[#48BC2B]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#3A9A22] dark:text-[#5CD13E]">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Focus Overview
              </span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {greeting}, {user?.name?.split(" ")[0]}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-[#8B8E96]">
                {daily?.motivational_message ||
                  "Pick your highest-leverage task and protect a single uninterrupted focus block."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="btn-secondary"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
              <Link href="/focus" className="btn-primary">
                <Play className="h-4 w-4" />
                Enter Focus Mode
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 4 Key KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass-card h-32 animate-pulse bg-slate-200/40 dark:bg-[#101010]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Productivity Score</span>
                <Award className="h-4 w-4 text-[#48BC2B]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {daily?.productivity_score ?? 0}
                </span>
                <span className="font-mono text-xs text-slate-400 dark:text-[#8B8E96]">/ 100</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#10210C]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3B9E23] to-[#5CD13E] shadow-[0_0_10px_rgba(72,188,43,0.45)]"
                  style={{ width: `${daily?.productivity_score ?? 0}%` }}
                />
              </div>
            </div>

            <div className="glass-card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Today&apos;s Focus</span>
                <Clock className="h-4 w-4 text-[#7FE066]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {formatMinutes(daily?.focus_minutes ?? 0)}
                </span>
                <span className="font-mono text-xs text-slate-400 dark:text-[#8B8E96]">
                  ({daily?.sessions_completed_today ?? 0} sessions)
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                {daily?.distraction_minutes ?? 0}m distractions logged today
              </p>
            </div>

            <div className="glass-card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Tasks Completed</span>
                <CheckCircle2 className="h-4 w-4 text-[#48BC2B]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {daily?.completed_tasks_today ?? 0}
                </span>
                <span className="font-mono text-xs text-slate-400 dark:text-[#8B8E96]">today</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                {daily?.pending_tasks_count ?? 0} active tasks remaining
              </p>
            </div>

            <div className="glass-card-hover p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Current Streak</span>
                <Flame className="h-4 w-4 text-[#FC3803] fill-current" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {daily?.current_streak ?? 0}
                </span>
                <span className="font-mono text-xs uppercase text-slate-400 dark:text-[#8B8E96]">
                  days
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                Personal best: {daily?.best_streak ?? 0} days
              </p>
            </div>
          </div>
        )}

        {/* Focus Next + Obsidian Streak Card + Quick Timer */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="glass-card flex flex-col justify-between p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#48BC2B]/15 text-[#3A9A22] dark:text-[#48BC2B]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      Focus Next — Recommended
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                      Ranked by urgency, deadline & effort fit
                    </p>
                  </div>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs font-semibold text-[#3A9A22] hover:underline dark:text-[#5CD13E]"
                >
                  All Tasks →
                </Link>
              </div>

              {daily?.recommended_task ? (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/[0.08] dark:bg-[#141414]/90">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            daily.recommended_task.priority === "high"
                              ? "bg-[#FC3803]/15 text-[#FF5A26]"
                              : daily.recommended_task.priority === "medium"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-white/10 text-[#8B8E96]"
                          }`}
                        >
                          {daily.recommended_task.priority} priority
                        </span>
                        <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-[#B5B8C0]">
                          Est. {daily.recommended_task.estimated_duration}m
                        </span>
                        {daily.recommended_task.smart_score !== null && (
                          <span className="rounded-full bg-[#48BC2B]/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#3A9A22] dark:text-[#5CD13E]">
                            Score {daily.recommended_task.smart_score}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                        {daily.recommended_task.title}
                      </h3>
                      {daily.recommended_task.description && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-[#8B8E96]">
                          {daily.recommended_task.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartFocusOnTask(daily.recommended_task!)}
                      className="btn-primary shrink-0"
                    >
                      <Play className="h-4 w-4" />
                      Focus on This
                    </button>
                  </div>

                  {daily.recommended_task.recommendation_reasons.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {daily.recommended_task.recommendation_reasons.map((reason) => (
                        <span
                          key={reason}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-white/[0.08] dark:bg-[#0A0A0A] dark:text-[#B5B8C0]"
                        >
                          • {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
                  <p className="text-sm font-medium text-slate-600 dark:text-[#8B8E96]">
                    No pending tasks yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(true)}
                    className="btn-primary mt-3"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Task
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-white/[0.08]">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-[#8B8E96]">
                  <Target className="h-4 w-4 text-[#48BC2B]" />
                  Completion Momentum
                </span>
                <span className="font-mono font-semibold text-[#3A9A22] dark:text-[#5CD13E]">
                  {daily?.session_completion_rate ?? 0}% session rate
                </span>
              </div>
            </div>
          </div>

          {/* Signature Obsidian Streak & Focus Minutes Card */}
          <div className="lg:col-span-4">
            <StreakProgressCard
              streak={daily?.current_streak ?? 0}
              achievedMinutes={daily?.focus_minutes ?? 0}
              targetMinutes={daily?.daily_goal_minutes ?? 120}
              todayDate={daily?.date}
              calendar={goalsOverview?.calendar}
            />
          </div>

          {/* Embedded Focus Timer Widget */}
          <div className="glass-card flex flex-col items-center justify-between p-6 lg:col-span-3">
            <div className="flex w-full items-center justify-between">
              <h2 className="micro-label">Quick Timer</h2>
              <Link
                href="/focus"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3A9A22] hover:underline dark:text-[#5CD13E]"
              >
                Fullscreen <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="my-4">
              <CircularTimer
                totalSeconds={totalSeconds}
                remainingSeconds={remainingSeconds}
                progressPct={progressPct}
                mode={mode}
                status={status}
                size={185}
                strokeWidth={8}
                compact
              />
            </div>

            <div className="w-full text-center">
              <p className="truncate text-xs text-slate-500 dark:text-[#8B8E96]">
                {selectedTaskTitle || daily?.recommended_task?.title || "Free focus session"}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                {status === "running" ? (
                  <button type="button" onClick={pauseTimer} className="btn-secondary w-full">
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                ) : status === "paused" ? (
                  <button type="button" onClick={resumeTimer} className="btn-primary w-full">
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      startTimer({
                        task: daily?.recommended_task ?? undefined,
                        mode: "focus",
                      })
                    }
                    className="btn-primary w-full"
                  >
                    <Play className="h-4 w-4" />
                    Start Focus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Weekly Chart + Upcoming Tasks */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="glass-card p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Weekly Productivity Overview
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Focus minutes across the last 7 days
                </p>
              </div>
              <Link
                href="/analytics"
                className="text-xs font-semibold text-[#3A9A22] hover:underline dark:text-[#5CD13E]"
              >
                Full Analytics →
              </Link>
            </div>

            <div className="mt-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly?.daily_series ?? []}>
                  <defs>
                    <linearGradient id="focusArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#48BC2B" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="#48BC2B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" stroke="#8B8E96" fontSize={12} tickLine={false} />
                  <YAxis stroke="#8B8E96" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#101010",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="focus_minutes"
                    name="Focus (min)"
                    stroke="#48BC2B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#focusArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Tasks
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Next deadlines in your queue
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="rounded-xl bg-[#48BC2B]/15 p-1.5 text-[#3A9A22] hover:bg-[#48BC2B]/25 dark:text-[#5CD13E]"
                aria-label="Add task"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {!daily?.upcoming_tasks?.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                  No pending tasks. Enjoy the clear deck or create a new goal!
                </div>
              ) : (
                daily.upcoming_tasks.map((task) => {
                  const dl = formatRelativeDeadline(task.deadline);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/[0.06] dark:bg-[#141414]/80"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuickComplete(task)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 text-transparent transition hover:border-[#48BC2B] hover:text-[#48BC2B] dark:border-white/20"
                          title="Mark completed"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                            {task.title}
                          </p>
                          <p
                            className={`text-[11px] ${
                              dl.isOverdue
                                ? "font-semibold text-[#FF5A26]"
                                : dl.isUrgent
                                  ? "text-amber-400"
                                  : "text-slate-500 dark:text-[#8B8E96]"
                            }`}
                          >
                            {dl.label} · {task.estimated_duration}m
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartFocusOnTask(task)}
                        className="shrink-0 rounded-xl bg-[#48BC2B]/15 px-2.5 py-1 text-xs font-semibold text-[#3A9A22] hover:bg-[#48BC2B]/25 dark:text-[#5CD13E]"
                      >
                        Focus
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </AppShell>
  );
}
