"use client";

import React from "react";
import { motion } from "framer-motion";
import { formatSecondsToClock } from "@/lib/utils";
import type { SessionType } from "@/types";
import type { TimerStatus } from "@/components/providers/FocusTimerProvider";

interface CircularTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  progressPct: number;
  mode: SessionType;
  status: TimerStatus;
  size?: number;
  strokeWidth?: number;
  compact?: boolean;
}

const MODE_LABELS: Record<SessionType, string> = {
  focus: "Deep Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

export function CircularTimer({
  remainingSeconds,
  progressPct,
  mode,
  status,
  size = 300,
  strokeWidth = 10,
  compact = false,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const gradientId = mode === "focus" ? "focusRingGrad" : "breakRingGrad";

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Ambient pulsing glow when timer is running */}
      {status === "running" && (
        <motion.div
          initial={{ opacity: 0.25, scale: 0.94 }}
          animate={{ opacity: [0.25, 0.5, 0.25], scale: [0.95, 1.03, 0.95] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className={`pointer-events-none absolute inset-4 rounded-full blur-2xl ${
            mode === "focus" ? "bg-[#48BC2B]/25" : "bg-[#FC3803]/20"
          }`}
        />
      )}

      <svg width={size} height={size} className="-rotate-90 transform">
        <defs>
          <linearGradient id="focusRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7FE066" />
            <stop offset="45%" stopColor="#48BC2B" />
            <stop offset="100%" stopColor="#3A9A22" />
          </linearGradient>
          <linearGradient id="breakRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A2F" />
            <stop offset="100%" stopColor="#FC3803" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200/90 dark:text-[#1A1A1A]"
        />

        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            filter:
              mode === "focus"
                ? "drop-shadow(0 0 8px rgba(72, 188, 43, 0.45))"
                : "drop-shadow(0 0 8px rgba(252, 56, 3, 0.4))",
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`rounded-full border px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
            mode === "focus"
              ? "border-[#48BC2B]/35 bg-[#48BC2B]/15 text-[#3A9A22] dark:text-[#5CD13E]"
              : "border-[#FC3803]/35 bg-[#FC3803]/15 text-[#FC3803] dark:text-[#FF6A2B]"
          }`}
        >
          {MODE_LABELS[mode]}
        </span>

        <span
          className={`mt-3 font-mono font-bold tracking-tight text-slate-900 dark:text-white tabular-nums ${
            compact ? "text-4xl" : "text-5xl sm:text-6xl"
          }`}
        >
          {formatSecondsToClock(remainingSeconds)}
        </span>

        <span className="mt-2 text-xs font-medium text-slate-500 dark:text-[#8B8E96]">
          {status === "running"
            ? "Stay in flow"
            : status === "paused"
              ? "Paused"
              : status === "completed"
                ? "Session complete"
                : "Ready to begin"}
        </span>
      </div>
    </div>
  );
}
