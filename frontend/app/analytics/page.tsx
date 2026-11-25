"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Calendar, CheckCircle2, Clock, Flame, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { DISTRACTION_CATEGORY_META } from "@/lib/utils";
import { analyticsService } from "@/services/analyticsService";
import type { MonthlyAnalytics, WeeklyAnalytics } from "@/types";

export default function AnalyticsPage() {
  const toast = useToast();
  const { dataRefreshTick } = useFocusTimer();

  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [weekly, setWeekly] = useState<WeeklyAnalytics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const [w, m] = await Promise.all([
        analyticsService.weekly(),
        analyticsService.monthly(),
      ]);
      setWeekly(w);
      setMonthly(m);
    } catch (err) {
      toast.error("Failed to load analytics", extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, dataRefreshTick]);

  const activeData = period === "weekly" ? weekly : monthly;
  const taskRatioData = monthly
    ? [
        { name: "Completed", value: monthly.completed_tasks, color: "#48BC2B" },
        { name: "Pending", value: monthly.pending_tasks, color: "#242424" },
      ]
    : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Productivity Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8B8E96]">
              Understand your focus rhythm, completion efficiency, and distraction triggers.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-[#101010]">
            <button
              type="button"
              onClick={() => setPeriod("weekly")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                period === "weekly"
                  ? "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-[#8B8E96] dark:hover:text-white"
              }`}
            >
              Weekly (7 Days)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                period === "monthly"
                  ? "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-[#8B8E96] dark:hover:text-white"
              }`}
            >
              Monthly (30 Days)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="glass-card h-28 animate-pulse bg-slate-200/40 dark:bg-[#101010]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">
                  {period === "weekly" ? "Weekly Focus Hours" : "Monthly Focus Hours"}
                </span>
                <Clock className="h-4 w-4 text-[#48BC2B]" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                {activeData?.total_focus_hours ?? 0}h
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
                {activeData?.total_focus_minutes ?? 0} total minutes focused
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Completion Rate</span>
                <CheckCircle2 className="h-4 w-4 text-[#48BC2B]" />
              </div>
              <p className="mt-3 text-3xl font-bold text-[#3A9A22] dark:text-[#5CD13E] tabular-nums">
                {activeData?.session_completion_rate ?? 0}%
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
                {activeData?.completed_sessions ?? 0} of {activeData?.total_sessions ?? 0} sprints
                completed
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Avg Focus Duration</span>
                <Flame className="h-4 w-4 text-[#FC3803] fill-current" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                {activeData?.average_focus_duration ?? 0}m
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
                Per completed session
              </p>
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <span className="micro-label">Most Productive Day</span>
                <Award className="h-4 w-4 text-[#7FE066]" />
              </div>
              <p className="mt-3 truncate text-2xl font-bold text-slate-900 dark:text-white">
                {activeData?.most_productive_day || "No sessions yet"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
                {activeData?.total_distraction_count ?? 0} distractions (
                {activeData?.total_distraction_minutes ?? 0}m)
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Daily Focus Time
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Minutes focused vs daily target
                </p>
              </div>
              <Calendar className="h-4 w-4 text-[#48BC2B]" />
            </div>

            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeData?.daily_series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" stroke="#8B8E96" fontSize={11} />
                  <YAxis stroke="#8B8E96" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#101010",
                      borderColor: "rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="focus_minutes"
                    name="Focus Minutes"
                    fill="#48BC2B"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="goal_target_minutes"
                    name="Goal Target"
                    fill="rgba(255,255,255,0.14)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Productivity Score Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                Composite daily score (0–100) across focus, tasks, and interruptions
              </p>
            </div>

            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeData?.daily_series ?? []}>
                  <defs>
                    <linearGradient id="scoreTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7FE066" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7FE066" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="label" stroke="#8B8E96" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#8B8E96" fontSize={11} />
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
                    dataKey="productivity_score"
                    name="Productivity Score"
                    stroke="#48BC2B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#scoreTrendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Completed vs Pending Tasks
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
              Current workspace task distribution
            </p>

            {!monthly || (monthly.completed_tasks === 0 && monthly.pending_tasks === 0) ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                Create tasks to visualize completion progress.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskRatioData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {taskRatioData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#101010",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "14px",
                          color: "#FFFFFF",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#48BC2B]/25 bg-[#48BC2B]/10 p-4">
                    <p className="text-xs font-semibold text-[#3A9A22] dark:text-[#5CD13E]">
                      Completed Tasks
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {monthly.completed_tasks}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-white/[0.08] dark:bg-[#141414]">
                    <p className="text-xs font-semibold text-slate-500 dark:text-[#8B8E96]">
                      Pending Tasks
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {monthly.pending_tasks}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Distraction Frequency
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Episodes and minutes by category ({period})
                </p>
              </div>
              <ShieldAlert className="h-4 w-4 text-[#FC3803]" />
            </div>

            {!activeData?.distraction_by_category?.length ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                No distractions logged in this period.
              </div>
            ) : (
              <div className="mt-5 h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeData.distraction_by_category}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis dataKey="label" stroke="#8B8E96" fontSize={11} />
                    <YAxis stroke="#8B8E96" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#101010",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "14px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="Occurrences" radius={[6, 6, 0, 0]}>
                      {activeData.distraction_by_category.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={DISTRACTION_CATEGORY_META[entry.category]?.color || "#FC3803"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
