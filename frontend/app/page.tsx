"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Target,
  Timer,
} from "lucide-react";
import { useAuth } from "@/hooks";

const HIGHLIGHTS = [
  {
    icon: Timer,
    title: "Smart Focus Mode",
    description:
      "Distraction-free Pomodoro timer with persistent session state, fullscreen mode, and procedural ambient soundscapes.",
  },
  {
    icon: Target,
    title: "Priority Engine",
    description:
      "Rule-based task scoring weighs urgency, deadline proximity, importance, and effort fit to surface what to tackle next.",
  },
  {
    icon: ShieldCheck,
    title: "Distraction Awareness",
    description:
      "Manual distraction logging with categorized breakdowns reveals what pulls you out of deep work.",
  },
  {
    icon: BarChart3,
    title: "Productivity Analytics",
    description:
      "Interactive daily, weekly, and monthly charts track focus hours, completion rates, streaks, and daily goals.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[440px] w-[680px] -translate-x-1/2 rounded-full bg-[#48BC2B]/[0.08] blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#FC3803]/[0.05] blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-[0_0_20px_-4px_rgba(72,188,43,0.5)]">
            <Timer className="h-5 w-5 stroke-[2.3]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">FocusFlow</span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#48BC2B]">
              Smart Focus Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-[#B5B8C0] transition hover:bg-white/[0.06] hover:text-white"
          >
            Sign In
          </Link>
          <Link href="/register" className="btn-primary">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#0F0F0F] px-4 py-1.5 text-xs font-semibold text-[#B5B8C0]">
              <Flame className="h-3.5 w-3.5 text-[#FC3803] fill-current" />
              Built for deep work, streaks, and daily momentum
            </span>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              Master Your Focus.
              <br />
              <span className="bg-gradient-to-r from-[#7FE066] via-[#48BC2B] to-[#3A9A22] bg-clip-text text-transparent">
                Ship What Matters.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#8B8E96] sm:text-lg">
              FocusFlow pairs a distraction-free Pomodoro timer with rule-based task scoring,
              manual distraction tracking, and obsidian habit telemetry.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
                Create Free Account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login?demo=1"
                className="btn-secondary w-full px-6 py-3 text-base sm:w-auto"
              >
                Try Demo Workspace
              </Link>
            </div>
          </motion.div>

          {/* Signature Obsidian Streak Preview Widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="mx-auto max-w-sm rounded-[30px] border border-white/[0.08] bg-gradient-to-b from-[#121212] via-[#0A0A0A] to-[#050505] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_28px_60px_-15px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <div className="absolute inset-1 rounded-full bg-[#FC3803]/35 blur-md" />
                    <Flame className="relative h-9 w-9 text-[#FC3803] fill-current drop-shadow-[0_0_10px_rgba(252,56,3,0.65)]" />
                  </div>
                  <div>
                    <p className="micro-label">Streak</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tabular-nums">32</span>
                      <span className="text-xs uppercase tracking-wider text-[#8B8E96]">Days</span>
                    </div>
                  </div>
                </div>
                <Timer className="h-7 w-7 text-[#EAECEF]" />
              </div>

              <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="grid grid-cols-7 gap-2 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                  <div key={day} className="flex flex-col items-center gap-2">
                    {idx < 3 ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] shadow-[0_0_14px_rgba(72,188,43,0.45)]">
                        <Check className="h-4 w-4 text-[#040F02] stroke-[3]" />
                      </div>
                    ) : idx === 3 ? (
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#141414]">
                        <svg width={36} height={36} className="-rotate-90">
                          <circle cx={18} cy={18} r={16} fill="none" stroke="#242424" strokeWidth={3.2} />
                          <circle
                            cx={18}
                            cy={18}
                            r={16}
                            fill="none"
                            stroke="#48BC2B"
                            strokeWidth={3.2}
                            strokeLinecap="round"
                            strokeDasharray={100.5}
                            strokeDashoffset={32}
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-[#1A1A1A]" />
                    )}
                    <span className="text-[11px] font-medium text-[#8B8E96]">{day}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <p className="micro-label">Focus Minutes</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold tabular-nums">75</span>
                    <span className="ml-1.5 font-mono text-xs text-[#8B8E96]">/ 100 min</span>
                  </div>
                  <span className="font-mono text-xs text-[#8B8E96]">75%</span>
                </div>
                <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-[#10210C]">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#3B9E23] via-[#48BC2B] to-[#5CD13E] shadow-[0_0_14px_rgba(72,188,43,0.5)]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {HIGHLIGHTS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass-card-hover p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#48BC2B]/15 text-[#48BC2B] ring-1 ring-[#48BC2B]/25">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8B8E96]">{item.description}</p>
              </div>
            );
          })}
        </motion.div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-[#8B8E96]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#48BC2B]" /> Persistent timer across tabs & refreshes
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#48BC2B]" /> Transparent rule-based prioritization
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#48BC2B]" /> Dark obsidian & light theme support
          </span>
        </div>
      </main>
    </div>
  );
}
