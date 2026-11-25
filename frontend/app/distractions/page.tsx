"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Info, Plus, ShieldAlert, Trash2, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DistractionModal } from "@/components/distractions/DistractionModal";
import { useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { DISTRACTION_CATEGORY_META, formatMinutes } from "@/lib/utils";
import { distractionService } from "@/services/distractionService";
import type { DistractionCategory, DistractionSummary } from "@/types";

export default function DistractionsPage() {
  const toast = useToast();
  const { sessionId, dataRefreshTick, bumpRefreshTick } = useFocusTimer();

  const [summary, setSummary] = useState<DistractionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeFilter, setRangeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const loadDistractions = useCallback(async () => {
    try {
      const data = await distractionService.list({
        range: rangeFilter,
        category: categoryFilter,
      });
      setSummary(data);
    } catch (err) {
      toast.error("Failed to load distractions", extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, rangeFilter, toast]);

  useEffect(() => {
    loadDistractions();
  }, [loadDistractions, dataRefreshTick]);

  const handleLog = async (payload: {
    category: DistractionCategory;
    duration: number;
    description?: string | null;
    focus_session_id?: number | null;
  }) => {
    await distractionService.create(payload);
    toast.success("Distraction logged", "Pattern analytics updated.");
    bumpRefreshTick();
  };

  const handleDelete = async (id: number) => {
    try {
      await distractionService.remove(id);
      toast.info("Distraction entry removed");
      bumpRefreshTick();
    } catch (err) {
      toast.error("Could not delete entry", extractApiError(err));
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Distraction Tracking
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#8B8E96]">
              Manually record interruptions to spot patterns and protect deep work.
            </p>
          </div>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Log Distraction
          </button>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100/70 p-4 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-[#101010] dark:text-[#B5B8C0]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#48BC2B]" />
          <p>
            FocusFlow uses manual distraction logging so your focus data stays private and
            transparent. Automatic site/tab tracking is not performed without an explicit browser
            extension.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Today&apos;s Distractions</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatMinutes(summary?.today_minutes ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
              {summary?.today_count ?? 0} logged interruption(s)
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Weekly Total</span>
              <TrendingDown className="h-4 w-4 text-[#FC3803]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatMinutes(summary?.week_minutes ?? 0)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#8B8E96]">
              {summary?.week_count ?? 0} episodes over 7 days
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between">
              <span className="micro-label">Most Common Category</span>
              <ShieldAlert className="h-4 w-4 text-[#FC3803]" />
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {summary?.most_common_label || "None yet"}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-[#8B8E96]">
              {summary?.insight}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="glass-card p-6 lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Breakdown by Category
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
              Minutes lost per distraction type
            </p>

            {!summary?.category_breakdown?.length ? (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                No distractions logged in this range.
              </div>
            ) : (
              <div className="mt-5 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.category_breakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis type="number" stroke="#8B8E96" fontSize={12} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      stroke="#8B8E96"
                      fontSize={12}
                      width={95}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#101010",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "14px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="total_minutes" name="Minutes" radius={[0, 8, 8, 0]}>
                      {summary.category_breakdown.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={DISTRACTION_CATEGORY_META[entry.category]?.color || "#48BC2B"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="glass-card p-6 lg:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Distraction History
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Filter by timeframe or category
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                  className="input-field w-auto py-1.5 text-xs"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-field w-auto py-1.5 text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="social_media">Social Media</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="notifications">Notifications</option>
                  <option value="multitasking">Multitasking</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {loading ? (
                <div className="h-32 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-[#141414]" />
              ) : !summary?.items?.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                  No distractions logged yet. Stay focused!
                </div>
              ) : (
                summary.items.map((item) => {
                  const meta = DISTRACTION_CATEGORY_META[item.category];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-[#141414]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                              meta?.bg || ""
                            }`}
                          >
                            {meta?.label || item.category}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-white">
                            {item.duration}m
                          </span>
                          <span className="text-[11px] text-[#8B8E96]">
                            {new Date(item.created_at).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {item.description && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-[#B5B8C0]">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-xl p-2 text-[#8B8E96] transition hover:bg-[#FC3803]/10 hover:text-[#FF5A26]"
                        aria-label="Delete distraction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <DistractionModal
        open={modalOpen}
        focusSessionId={sessionId}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLog}
      />
    </AppShell>
  );
}
