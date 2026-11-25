"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Timer } from "lucide-react";
import type { CalendarDayStatus } from "@/types";

interface StreakProgressCardProps {
  streak: number;
  achievedMinutes: number;
  targetMinutes: number;
  todayDate?: string;
  calendar?: CalendarDayStatus[];
  href?: string;
}

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StreakProgressCard({
  streak,
  achievedMinutes,
  targetMinutes,
  todayDate,
  calendar = [],
  href = "/goals",
}: StreakProgressCardProps) {
  const safeTarget = Math.max(1, targetMinutes);
  const progressPct = Math.min(100, Math.round((achievedMinutes / safeTarget) * 100));

  const { weekDays, todayIso } = useMemo(() => {
    const baseIso = todayDate || formatLocalIso(new Date());
    const [y, m, d] = baseIso.split("-").map(Number);
    const anchor = new Date(y, (m || 1) - 1, d || 1);
    const mondayOffset = (anchor.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - mondayOffset);

    const calByDate = new Map<string, CalendarDayStatus>();
    for (const item of calendar) {
      calByDate.set(item.date, item);
    }

    const days = WEEKDAY_NAMES.map((label, idx) => {
      const dateObj = new Date(monday);
      dateObj.setDate(monday.getDate() + idx);
      const iso = formatLocalIso(dateObj);
      const entry = calByDate.get(iso);
      const mins = iso === baseIso ? achievedMinutes : (entry?.focus_minutes ?? 0);
      const dayTarget = iso === baseIso ? safeTarget : (entry?.target_minutes ?? safeTarget);
      const pct = Math.min(100, Math.round((mins / Math.max(1, dayTarget)) * 100));
      const met = entry ? entry.goal_met : mins >= dayTarget;

      return {
        label,
        iso,
        isToday: iso === baseIso,
        isFuture: iso > baseIso,
        pct,
        met,
        minutes: mins,
        target: dayTarget,
      };
    });

    return { weekDays: days, todayIso: baseIso };
  }, [achievedMinutes, calendar, safeTarget, todayDate]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#121212] dark:via-[#0A0A0A] dark:to-[#050505] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_44px_-16px_rgba(0,0,0,0.75)]">
      {/* Subtle ambient flame glow */}
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-orange-500/15 blur-2xl" />

      {/* Top Row: Flame + Streak + Emblem */}
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <div className="absolute inset-1 rounded-full bg-[#FF4D1A]/30 blur-md" />
            <svg
              viewBox="0 0 36 36"
              className="relative h-10 w-10 drop-shadow-[0_0_10px_rgba(255,77,26,0.55)]"
              fill="none"
            >
              <path
                d="M19.2 3.2C19.6 7.8 26.8 11.4 26.8 19.3C26.8 25.5 22.7 30.8 17.5 31.8C12 30.9 8.2 26 8.2 20.1C8.2 15.6 10.7 12.1 12.4 10.2C12.7 12.6 14 13.8 15.2 14C14.7 9.9 16.5 6.1 19.2 3.2Z"
                fill="url(#ffFlameGrad)"
              />
              <path
                d="M17.8 18.8C19.5 20.7 21.1 22.8 21.1 25.4C21.1 28.2 19.3 30.5 17.5 31C15.5 30.4 14.1 28.5 14.1 26C14.1 23.7 15.6 21.8 17.8 18.8Z"
                fill="#FFF7ED"
              />
              <defs>
                <linearGradient id="ffFlameGrad" x1="17.5" y1="3" x2="17.5" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF7A2F" />
                  <stop offset="55%" stopColor="#FF4817" />
                  <stop offset="100%" stopColor="#E12D0D" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-[#8B8E96]">
              Streak
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {streak}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-[#8B8E96]">
                {streak === 1 ? "Day" : "Days"}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={href}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 dark:text-[#EAECEF] dark:hover:border-white/10 dark:hover:bg-white/[0.06]"
          title="View daily goals & progress calendar"
          aria-label="View daily goals"
        >
          <Timer className="h-6 w-6 stroke-[1.9]" />
        </Link>
      </div>

      {/* Subtle Divider */}
      <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/[0.1]" />

      {/* 7-Day Weekly Circle Progress Row */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => {
          const size = 36;
          const stroke = 3.2;
          const r = (size - stroke) / 2;
          const c = 2 * Math.PI * r;
          const visualPct = day.pct > 0 ? Math.max(8, day.pct) : 0;
          const offset = c - (visualPct / 100) * c;

          return (
            <div
              key={day.iso}
              title={`${day.label} (${day.iso}): ${day.minutes}m / ${day.target}m`}
              className="flex flex-col items-center gap-2"
            >
              {day.met ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] shadow-[0_0_16px_rgba(72,188,43,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)]"
                >
                  <Check className="h-4 w-4 text-[#040F02] stroke-[3]" />
                </motion.div>
              ) : day.isToday || (!day.isFuture && day.minutes > 0) ? (
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-[#141414]">
                  <svg width={size} height={size} className="-rotate-90 transform">
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={stroke}
                      className="text-slate-200 dark:text-[#242424]"
                    />
                    {visualPct > 0 && (
                      <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke="#48BC2B"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={c}
                        initial={{ strokeDashoffset: c }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{ filter: "drop-shadow(0 0 5px rgba(72,188,43,0.55))" }}
                      />
                    )}
                  </svg>
                </div>
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-200/80 dark:bg-[#1A1A1A]" />
              )}

              <span
                className={`text-[11px] font-medium ${
                  day.iso === todayIso
                    ? "font-semibold text-slate-900 dark:text-slate-100"
                    : "text-slate-400 dark:text-[#848790]"
                }`}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Focus Minutes Progress Bar */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-[#8B8E96]">
          Focus Minutes
        </p>

        <div className="mt-1 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {achievedMinutes.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-slate-400 dark:text-[#8B8E96]">
              /{safeTarget.toLocaleString()} min
            </span>
          </div>
          <span className="font-mono text-xs font-medium text-slate-500 dark:text-[#8B8E96]">
            {progressPct}%
          </span>
        </div>

        <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#10210C]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-[#3B9E23] via-[#48BC2B] to-[#5CD13E] shadow-[0_0_14px_rgba(72,188,43,0.5)]"
          />
        </div>
      </div>
    </div>
  );
}
