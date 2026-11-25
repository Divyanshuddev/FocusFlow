"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CheckSquare,
  ChevronDown,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pause,
  Play,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Target,
  Timer,
  X,
} from "lucide-react";
import { useAuth, useFocusTimer, useTheme } from "@/hooks";
import { formatSecondsToClock, getInitials } from "@/lib/utils";
import { analyticsService } from "@/services/analyticsService";
import { taskService } from "@/services/taskService";
import type { DailyAnalytics, Task } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/focus", label: "Focus Mode", icon: Timer },
  { href: "/tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/distractions", label: "Distractions", icon: ShieldAlert },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    status: timerStatus,
    remainingSeconds,
    mode: timerMode,
    pauseTimer,
    resumeTimer,
    dataRefreshTick,
  } = useFocusTimer();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTasks, setSearchTasks] = useState<Task[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyAnalytics | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    analyticsService
      .daily()
      .then(setDailySummary)
      .catch(() => {});
  }, [isAuthenticated, dataRefreshTick]);

  useEffect(() => {
    if (!isAuthenticated || !searchQuery.trim()) {
      setSearchTasks([]);
      return;
    }
    const timer = setTimeout(() => {
      taskService
        .list({ search: searchQuery.trim() })
        .then((res) => setSearchTasks(res.items.slice(0, 5)))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const notifications = useMemo(() => {
    if (!dailySummary) return [];
    const list: Array<{ id: string; title: string; body: string; href: string }> = [];
    if (dailySummary.recommended_task) {
      list.push({
        id: "rec",
        title: `Focus Next: ${dailySummary.recommended_task.title}`,
        body:
          dailySummary.recommended_task.recommendation_reasons[0] ||
          "Recommended by priority engine",
        href: "/focus",
      });
    }
    const remainingGoal = Math.max(
      0,
      dailySummary.daily_goal_minutes - dailySummary.focus_minutes
    );
    list.push({
      id: "goal",
      title:
        remainingGoal === 0
          ? "Daily focus goal achieved!"
          : `${remainingGoal}m left to hit today's goal`,
      body: `Current progress: ${dailySummary.daily_goal_progress_pct}% (${dailySummary.focus_minutes}/${dailySummary.daily_goal_minutes}m)`,
      href: "/goals",
    });
    if (dailySummary.current_streak > 0) {
      list.push({
        id: "streak",
        title: `${dailySummary.current_streak}-day focus streak active`,
        body: "Keep logging focus blocks daily to extend your streak.",
        href: "/goals",
      });
    }
    return list;
  }, [dailySummary]);

  const matchedNav = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [searchQuery]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000000]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#48BC2B] border-t-transparent" />
          <p className="text-sm text-[#8B8E96]">Loading your FocusFlow workspace...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        <Link
          href="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-3 rounded-2xl px-2 py-2"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-[#040F02] shadow-[0_0_20px_-4px_rgba(72,188,43,0.5)]">
            <Timer className="h-5 w-5 stroke-[2.3]" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              FocusFlow
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3A9A22] dark:text-[#48BC2B]">
              Smart Focus
            </p>
          </div>
        </Link>

        <nav className="mt-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const showLiveBadge =
              item.href === "/focus" &&
              (timerStatus === "running" || timerStatus === "paused");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#48BC2B]/15 text-[#358C1E] ring-1 ring-[#48BC2B]/35 dark:bg-[#10210C] dark:text-white dark:ring-[#48BC2B]/35"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#8B8E96] dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition ${
                      active
                        ? "text-[#3A9A22] dark:text-[#48BC2B]"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-[#6E717A] dark:group-hover:text-white"
                    }`}
                  />
                  {item.label}
                </span>

                {showLiveBadge && (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#48BC2B]/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#3A9A22] dark:text-[#5CD13E]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        timerStatus === "running"
                          ? "animate-pulse bg-[#48BC2B]"
                          : "bg-[#FC3803]"
                      }`}
                    />
                    {formatSecondsToClock(remainingSeconds)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Streak & Focus Progress Card */}
      <Link
        href="/goals"
        onClick={() => setMobileMenuOpen(false)}
        className="block rounded-[22px] border border-slate-200/90 bg-slate-50 p-4 transition hover:border-[#48BC2B]/40 dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-[#121212] dark:to-[#0A0A0A] dark:hover:border-white/15"
      >
        <div className="flex items-center justify-between">
          <span className="micro-label">Daily Goal</span>
          <span className="flex items-center gap-1 text-xs font-bold text-[#FC3803] dark:text-[#FF5A26]">
            <Flame className="h-3.5 w-3.5 fill-current" />
            {dailySummary?.current_streak ?? 0}d
          </span>
        </div>
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#10210C]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3B9E23] to-[#5CD13E] shadow-[0_0_10px_rgba(72,188,43,0.45)] transition-all duration-500"
            style={{ width: `${dailySummary?.daily_goal_progress_pct ?? 0}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-500 dark:text-[#8B8E96]">
          <span>
            {dailySummary?.focus_minutes ?? 0}/{dailySummary?.daily_goal_minutes ?? user.daily_focus_goal_minutes}m
          </span>
          <span>{dailySummary?.daily_goal_progress_pct ?? 0}%</span>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F6] text-slate-900 dark:bg-[#000000] dark:text-white">
      {/* Subtle monochrome top/ambient radial texture */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#48BC2B]/[0.05] blur-3xl dark:bg-[#48BC2B]/[0.04]" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#FC3803]/[0.03] blur-3xl dark:bg-[#FC3803]/[0.03]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#050505]/95 lg:block">
          <div className="sticky top-0 h-screen">{SidebarContent}</div>
        </aside>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="relative z-10 h-full w-64 border-r border-slate-200 bg-white dark:border-white/10 dark:bg-[#050505]"
              >
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
                {SidebarContent}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main Column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#000000]/85 sm:px-6">
            <div className="flex flex-1 items-center gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-[#8B8E96] dark:hover:bg-white/[0.06] lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Global Search */}
              <div ref={searchRef} className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#6E717A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  placeholder="Search tasks or jump to page..."
                  className="w-full rounded-xl border border-slate-200/90 bg-slate-100/80 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#48BC2B] focus:bg-white focus:outline-none dark:border-white/[0.08] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-[#6E717A] dark:focus:border-[#48BC2B]"
                />

                {searchOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101010]">
                    {matchedNav.length > 0 && (
                      <div className="border-b border-slate-200/70 p-2 dark:border-white/[0.08]">
                        <p className="micro-label px-2 py-1">Pages</p>
                        {matchedNav.map((nav) => (
                          <button
                            key={nav.href}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                              router.push(nav.href);
                            }}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                          >
                            <nav.icon className="h-4 w-4 text-[#48BC2B]" />
                            <span>{nav.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="p-2">
                      <p className="micro-label px-2 py-1">Tasks</p>
                      {searchTasks.length === 0 ? (
                        <p className="px-2.5 py-2 text-xs text-slate-500 dark:text-[#8B8E96]">
                          No matching tasks found.
                        </p>
                      ) : (
                        searchTasks.map((task) => (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                              router.push("/tasks");
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                          >
                            <span className="truncate">{task.title}</span>
                            <span className="ml-2 shrink-0 rounded-md bg-[#48BC2B]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#3A9A22] dark:text-[#5CD13E]">
                              {task.priority}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Persistent Mini Timer Bar across pages */}
              {(timerStatus === "running" || timerStatus === "paused") &&
                pathname !== "/focus" && (
                  <div className="hidden items-center gap-2 rounded-xl border border-[#48BC2B]/35 bg-[#48BC2B]/10 px-3 py-1.5 sm:flex">
                    <Link
                      href="/focus"
                      className="flex items-center gap-2 font-mono text-xs font-bold text-[#358C1E] dark:text-[#5CD13E]"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          timerStatus === "running"
                            ? "animate-pulse bg-[#48BC2B]"
                            : "bg-[#FC3803]"
                        }`}
                      />
                      <span>{timerMode === "focus" ? "Focus" : "Break"}</span>
                      <span>{formatSecondsToClock(remainingSeconds)}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={timerStatus === "running" ? pauseTimer : resumeTimer}
                      className="rounded-lg p-1 text-[#3A9A22] hover:bg-[#48BC2B]/20 dark:text-[#5CD13E]"
                      aria-label={timerStatus === "running" ? "Pause timer" : "Resume timer"}
                    >
                      {timerStatus === "running" ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )}

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#101010] dark:text-[#B5B8C0] dark:hover:bg-[#1C1E24]"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#101010] dark:text-[#B5B8C0] dark:hover:bg-[#1C1E24]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {user.notifications_enabled && notifications.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#48BC2B] shadow-[0_0_6px_#48BC2B]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101010]">
                    <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/[0.08]">
                      <span className="text-sm font-semibold">Productivity Reminders</span>
                      <span className="text-[11px] text-[#8B8E96]">
                        {user.notifications_enabled ? "Enabled" : "Muted"}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
                      {!user.notifications_enabled ? (
                        <p className="p-4 text-xs text-[#8B8E96]">
                          Notifications are turned off in Settings.
                        </p>
                      ) : notifications.length === 0 ? (
                        <p className="p-4 text-xs text-[#8B8E96]">You are all caught up!</p>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.href}
                            onClick={() => setNotifOpen(false)}
                            className="block p-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          >
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#8B8E96]">
                              {n.body}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/80 py-1.5 pl-1.5 pr-2.5 transition hover:bg-slate-100 dark:border-white/[0.08] dark:bg-[#101010] dark:hover:bg-[#1C1E24]"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-[#5CD13E] to-[#3B9E23] text-xs font-bold text-[#040F02]">
                    {getInitials(user.name)}
                  </div>
                  <span className="hidden text-xs font-semibold sm:inline">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#8B8E96]" />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#101010]">
                    <div className="border-b border-slate-200/70 px-3 py-2 dark:border-white/[0.08]">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-[#8B8E96]">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                    >
                      <Settings className="h-4 w-4" />
                      Settings & Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-[#FF5A26] hover:bg-[#FC3803]/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
