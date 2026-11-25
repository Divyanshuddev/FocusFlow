import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSecondsToClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

export function formatRelativeDeadline(iso: string | null): {
  label: string;
  isOverdue: boolean;
  isUrgent: boolean;
} {
  if (!iso) return { label: "No deadline", isOverdue: false, isUrgent: false };
  const target = new Date(iso).getTime();
  const diffMs = target - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    const overdueHrs = Math.abs(Math.round(diffHours));
    return {
      label: overdueHrs < 24 ? `${overdueHrs}h overdue` : `${Math.ceil(overdueHrs / 24)}d overdue`,
      isOverdue: true,
      isUrgent: true,
    };
  }
  if (diffHours < 1) {
    return { label: "Due in <1h", isOverdue: false, isUrgent: true };
  }
  if (diffHours < 24) {
    return { label: `Due in ${Math.round(diffHours)}h`, isOverdue: false, isUrgent: true };
  }
  const days = Math.ceil(diffHours / 24);
  return {
    label: days === 1 ? "Due tomorrow" : `Due in ${days}d`,
    isOverdue: false,
    isUrgent: days <= 2,
  };
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export const DISTRACTION_CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  social_media: {
    label: "Social Media",
    color: "#FC3803",
    bg: "bg-[#FC3803]/15 text-[#FF6A2B] border-[#FC3803]/30",
  },
  entertainment: {
    label: "Entertainment",
    color: "#F59E0B",
    bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  notifications: {
    label: "Notifications",
    color: "#48BC2B",
    bg: "bg-[#48BC2B]/15 text-[#5CD13E] border-[#48BC2B]/30",
  },
  multitasking: {
    label: "Multitasking",
    color: "#7FE066",
    bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  other: {
    label: "Other",
    color: "#8B8E96",
    bg: "bg-white/10 text-[#B5B8C0] border-white/15",
  },
};
