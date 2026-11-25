"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CloudRain,
  Coffee,
  Flame,
  Maximize2,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trees,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CircularTimer } from "@/components/focus/CircularTimer";
import { DistractionModal } from "@/components/distractions/DistractionModal";
import { type AmbientBackdrop } from "@/components/providers/FocusTimerProvider";
import { useFocusTimer, useToast } from "@/hooks";
import { extractApiError } from "@/lib/api";
import { formatMinutes } from "@/lib/utils";
import { distractionService } from "@/services/distractionService";
import { focusService } from "@/services/focusService";
import { taskService } from "@/services/taskService";
import type { AmbientSound, DistractionCategory, FocusStats, SessionType, Task } from "@/types";

const AMBIENT_SOUNDS: Array<{ id: AmbientSound; label: string; icon: React.ElementType }> = [
  { id: "none", label: "Silent", icon: VolumeX },
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "brown_noise", label: "Brown Noise", icon: Wind },
  { id: "forest", label: "Forest", icon: Trees },
  { id: "lofi", label: "Lo-Fi Drone", icon: Music },
];

const BACKDROPS: Array<{ id: AmbientBackdrop; label: string; className: string }> = [
  {
    id: "aurora",
    label: "Matte Obsidian",
    className: "from-[#121212] via-[#111215] to-[#000000] border-white/[0.08]",
  },
  {
    id: "midnight",
    label: "Pure Charcoal",
    className: "from-[#0F0F0F] via-[#060606] to-[#000000] border-white/[0.08]",
  },
  {
    id: "forest",
    label: "Bio Canopy",
    className: "from-[#091406] via-[#050B04] to-[#000000] border-[#48BC2B]/20",
  },
  {
    id: "ember",
    label: "Warm Ember",
    className: "from-[#1D1210] via-[#120E0D] to-[#0B0A0A] border-[#FC3803]/20",
  },
];

export default function FocusPage() {
  const toast = useToast();
  const {
    mode,
    status,
    totalSeconds,
    remainingSeconds,
    progressPct,
    sessionId,
    selectedTaskId,
    selectedTaskTitle,
    ambientSound,
    backdrop,
    volume,
    dataRefreshTick,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    finishEarly,
    switchMode,
    setCustomMinutes,
    selectTask,
    setAmbientSound,
    setBackdrop,
    setVolume,
    bumpRefreshTick,
  } = useFocusTimer();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [distractionOpen, setDistractionOpen] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(
    Math.round(totalSeconds / 60)
  );

  const loadFocusData = useCallback(async () => {
    try {
      const [taskRes, statsRes] = await Promise.all([
        taskService.list({ status: "all", sort_by: "smart" }),
        focusService.stats(),
      ]);
      const pending = taskRes.items.filter((t) => t.status !== "completed");
      setTasks(pending);
      setStats(statsRes);

      if (!selectedTaskId && taskRes.recommended_task && status === "idle") {
        selectTask({
          id: taskRes.recommended_task.id,
          title: taskRes.recommended_task.title,
        });
      }
    } catch (err) {
      toast.error("Failed to load focus context", extractApiError(err));
    }
  }, [selectedTaskId, selectTask, status, toast]);

  useEffect(() => {
    loadFocusData();
  }, [loadFocusData, dataRefreshTick]);

  useEffect(() => {
    setCustomMinutesInput(Math.round(totalSeconds / 60));
  }, [totalSeconds]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (status === "running") pauseTimer();
        else if (status === "paused") resumeTimer();
        else startTimer();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isFullscreen, pauseTimer, resumeTimer, startTimer]);

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // Overlay fallback still provides distraction-free fullscreen
      }
    } else {
      await exitFullscreen();
    }
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore exit error
    }
  };

  const handleLogDistraction = async (payload: {
    category: DistractionCategory;
    duration: number;
    description?: string | null;
    focus_session_id?: number | null;
  }) => {
    await distractionService.create(payload);
    toast.info("Distraction logged", "Keep going — back to deep work.");
    bumpRefreshTick();
  };

  const activeBackdropClass =
    BACKDROPS.find((b) => b.id === backdrop)?.className ?? BACKDROPS[0].className;

  const FocusStage = (
    <div
      className={`relative overflow-hidden rounded-[30px] border bg-gradient-to-b p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_48px_-16px_rgba(0,0,0,0.8)] transition-all duration-500 sm:p-10 ${activeBackdropClass} ${
        isFullscreen ? "flex min-h-screen w-full flex-col justify-between rounded-none border-none" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-2xl border border-white/[0.08] bg-[#141414] p-1">
          {(
            [
              { id: "focus", label: "Focus", icon: Flame },
              { id: "short_break", label: "Short Break", icon: Coffee },
              { id: "long_break", label: "Long Break", icon: Sparkles },
            ] as Array<{ id: SessionType; label: string; icon: React.ElementType }>
          ).map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchMode(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? tab.id === "focus"
                      ? "bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-sm"
                      : "bg-[#FC3803] text-white shadow-sm"
                    : "text-[#8B8E96] hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDistractionOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#FC3803]/30 bg-[#FC3803]/10 px-3 py-2 text-xs font-medium text-[#FF6A2B] transition hover:bg-[#FC3803]/20"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Log Distraction
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#141414] px-3 py-2 text-xs font-medium text-[#B5B8C0] transition hover:bg-[#1E1E1E] hover:text-white"
            title="Toggle distraction-free fullscreen (Shortcut: F)"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                Fullscreen
              </>
            )}
          </button>
        </div>
      </div>

      <div className="my-8 flex flex-col items-center">
        {mode === "focus" && (
          <div className="mb-7 w-full max-w-md">
            <label className="micro-label mb-1.5 block text-center">Current Focus Task</label>
            <select
              value={selectedTaskId ?? ""}
              disabled={status === "running"}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  selectTask(null);
                  return;
                }
                const found = tasks.find((t) => t.id === Number(val));
                if (found) selectTask({ id: found.id, title: found.title });
              }}
              className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-2.5 text-center text-sm font-medium text-white focus:border-[#48BC2B] focus:outline-none disabled:opacity-70"
            >
              <option value="" className="bg-[#101010] text-[#B5B8C0]">
                Free Deep Work (No specific task linked)
              </option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id} className="bg-[#101010] text-white">
                  {task.title} ({task.estimated_duration}m · {task.priority})
                </option>
              ))}
            </select>
            {selectedTaskTitle && (
              <p className="mt-2 text-center text-xs text-[#8B8E96]">
                Locked onto: <span className="font-semibold text-white">{selectedTaskTitle}</span>
              </p>
            )}
          </div>
        )}

        <CircularTimer
          totalSeconds={totalSeconds}
          remainingSeconds={remainingSeconds}
          progressPct={progressPct}
          mode={mode}
          status={status}
          size={isFullscreen ? 340 : 300}
          strokeWidth={11}
        />

        {status === "idle" && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {(mode === "focus" ? [15, 25, 45, 60, 90] : [5, 10, 15, 20]).map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setCustomMinutes(mins)}
                className={`rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition ${
                  Math.round(totalSeconds / 60) === mins
                    ? "bg-[#48BC2B] text-[#040F02] shadow-[0_0_12px_rgba(72,188,43,0.4)]"
                    : "border border-white/10 bg-[#141414] text-[#B5B8C0] hover:bg-[#1E1E1E]"
                }`}
              >
                {mins}m
              </button>
            ))}

            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#141414] px-2.5 py-1">
              <input
                type="number"
                min={1}
                max={180}
                value={customMinutesInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomMinutesInput(val);
                  if (val >= 1 && val <= 180) setCustomMinutes(val);
                }}
                className="w-12 bg-transparent text-center font-mono text-xs font-semibold text-white focus:outline-none"
                aria-label="Custom minutes"
              />
              <span className="text-[11px] text-[#8B8E96]">min</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {status === "running" ? (
            <button
              type="button"
              onClick={pauseTimer}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-[#000000] shadow-lg transition hover:bg-slate-200"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          ) : status === "paused" ? (
            <button
              type="button"
              onClick={resumeTimer}
              className="btn-primary rounded-2xl px-7 py-3.5 text-sm font-bold"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => startTimer()}
              className="btn-primary rounded-2xl px-8 py-3.5 text-sm font-bold"
            >
              <Play className="h-4 w-4" />
              Start {mode === "focus" ? "Focus" : "Break"}
            </button>
          )}

          {(status === "running" || status === "paused") && (
            <button
              type="button"
              onClick={finishEarly}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#48BC2B]/35 bg-[#48BC2B]/15 px-5 py-3.5 text-sm font-semibold text-[#5CD13E] transition hover:bg-[#48BC2B]/25"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Now
            </button>
          )}

          <button
            type="button"
            onClick={resetTimer}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#141414] px-5 py-3.5 text-sm font-semibold text-[#B5B8C0] transition hover:bg-[#1E1E1E] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 border-t border-white/[0.08] pt-5 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span className="micro-label mr-1">Sound:</span>
          {AMBIENT_SOUNDS.map((sound) => {
            const Icon = sound.icon;
            const active = ambientSound === sound.id;
            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => setAmbientSound(sound.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-[#48BC2B]/20 text-[#5CD13E] ring-1 ring-[#48BC2B]/40"
                    : "bg-[#141414] text-[#8B8E96] hover:bg-[#1E1E1E] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {sound.label}
              </button>
            );
          })}
          {ambientSound !== "none" && (
            <div className="ml-2 flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-[#8B8E96]" />
              <input
                type="range"
                min={0.05}
                max={0.8}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-20 accent-[#48BC2B]"
                aria-label="Ambient volume"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="micro-label mr-1">Surface:</span>
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBackdrop(b.id)}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition ${
                backdrop === b.id
                  ? "bg-white/15 text-white ring-1 ring-white/25"
                  : "bg-[#141414] text-[#8B8E96] hover:text-white"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[70] bg-[#000000]">
        {FocusStage}
        <DistractionModal
          open={distractionOpen}
          focusSessionId={sessionId}
          onClose={() => setDistractionOpen(false)}
          onSubmit={handleLogDistraction}
        />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {FocusStage}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="glass-card p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Focus Performance
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
              Timer persists seamlessly as you switch pages or refresh.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.07] dark:bg-[#141414]">
                <p className="micro-label">Today Focus</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatMinutes(stats?.today_focus_minutes ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.07] dark:bg-[#141414]">
                <p className="micro-label">Completion</p>
                <p className="mt-1.5 text-xl font-bold text-[#3A9A22] dark:text-[#48BC2B] tabular-nums">
                  {stats?.completion_rate ?? 0}%
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.07] dark:bg-[#141414]">
                <p className="micro-label">Avg Session</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {stats?.average_focus_duration ?? 0}m
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.07] dark:bg-[#141414]">
                <p className="micro-label">Completed</p>
                <p className="mt-1.5 text-xl font-bold text-[#FC3803] dark:text-[#FF6A2B] tabular-nums">
                  {stats?.total_sessions_completed ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Focus Session History
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                  Recent completed and interrupted sprints
                </p>
              </div>
              <span className="font-mono text-[11px] text-[#8B8E96]">
                Shortcuts: Space (Play/Pause) · F (Fullscreen)
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {!stats?.recent_sessions?.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-white/10 dark:text-[#8B8E96]">
                  No focus sessions logged yet. Start your first Pomodoro above!
                </div>
              ) : (
                stats.recent_sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/[0.06] dark:bg-[#141414]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {sess.task_title ||
                          (sess.session_type === "focus"
                            ? "Free Deep Work"
                            : sess.session_type === "short_break"
                              ? "Short Break"
                              : "Long Break")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#8B8E96]">
                        {new Date(sess.start_time).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-white">
                        {sess.duration}m / {sess.planned_duration}m
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          sess.status === "completed"
                            ? "bg-[#48BC2B]/15 text-[#3A9A22] dark:text-[#5CD13E]"
                            : sess.status === "active"
                              ? "bg-white/15 text-white"
                              : "bg-[#FC3803]/15 text-[#FF6A2B]"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <DistractionModal
        open={distractionOpen}
        focusSessionId={sessionId}
        onClose={() => setDistractionOpen(false)}
        onSubmit={handleLogDistraction}
      />
    </AppShell>
  );
}
