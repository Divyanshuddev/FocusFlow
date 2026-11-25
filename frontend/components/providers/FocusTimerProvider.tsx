"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useToastContext } from "@/components/providers/ToastProvider";
import { ambientAudio } from "@/lib/ambientAudio";
import { extractApiError } from "@/lib/api";
import { formatSecondsToClock } from "@/lib/utils";
import { focusService } from "@/services/focusService";
import type { AmbientSound, SessionType, Task } from "@/types";

export type TimerStatus = "idle" | "running" | "paused" | "completed";
export type AmbientBackdrop = "aurora" | "midnight" | "forest" | "ember";

interface PersistedTimerState {
  mode: SessionType;
  status: TimerStatus;
  totalSeconds: number;
  endTimeMs: number | null;
  remainingSecondsOnPause: number;
  sessionId: number | null;
  selectedTaskId: number | null;
  selectedTaskTitle: string | null;
  ambientSound: AmbientSound;
  backdrop: AmbientBackdrop;
  volume: number;
  startedAtMs: number | null;
  completedFocusCount: number;
  completionModalOpen: boolean;
}

interface FocusTimerContextValue {
  mode: SessionType;
  status: TimerStatus;
  totalSeconds: number;
  remainingSeconds: number;
  progressPct: number;
  sessionId: number | null;
  selectedTaskId: number | null;
  selectedTaskTitle: string | null;
  ambientSound: AmbientSound;
  backdrop: AmbientBackdrop;
  volume: number;
  completedFocusCount: number;
  completionModalOpen: boolean;
  isSubmitting: boolean;
  dataRefreshTick: number;
  startTimer: (options?: { task?: Task | null; customMinutes?: number; mode?: SessionType }) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => Promise<void>;
  finishEarly: () => void;
  switchMode: (mode: SessionType, customMinutes?: number) => Promise<void>;
  setCustomMinutes: (minutes: number) => void;
  selectTask: (task: { id: number; title: string } | null) => void;
  setAmbientSound: (sound: AmbientSound) => void;
  setBackdrop: (backdrop: AmbientBackdrop) => void;
  setVolume: (volume: number) => void;
  completeSessionRecord: (taskCompleted: boolean) => Promise<void>;
  dismissCompletionModal: () => void;
  bumpRefreshTick: () => void;
}

const STORAGE_KEY_PREFIX = "focusflow_timer_state";
const FocusTimerContext = createContext<FocusTimerContextValue | undefined>(undefined);

function getDefaultMinutes(
  mode: SessionType,
  user: {
    default_focus_minutes: number;
    default_short_break_minutes: number;
    default_long_break_minutes: number;
  } | null
): number {
  if (mode === "short_break") return user?.default_short_break_minutes ?? 5;
  if (mode === "long_break") return user?.default_long_break_minutes ?? 15;
  return user?.default_focus_minutes ?? 25;
}

export function FocusTimerProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthContext();
  const toast = useToastContext();

  const storageKey = user ? `${STORAGE_KEY_PREFIX}_${user.id}` : STORAGE_KEY_PREFIX;

  const [state, setState] = useState<PersistedTimerState>(() => ({
    mode: "focus",
    status: "idle",
    totalSeconds: 25 * 60,
    endTimeMs: null,
    remainingSecondsOnPause: 25 * 60,
    sessionId: null,
    selectedTaskId: null,
    selectedTaskTitle: null,
    ambientSound: "none",
    backdrop: "aurora",
    volume: 0.35,
    startedAtMs: null,
    completedFocusCount: 0,
    completionModalOpen: false,
  }));

  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataRefreshTick, setDataRefreshTick] = useState(0);
  const hydratedRef = useRef(false);

  const bumpRefreshTick = useCallback(() => {
    setDataRefreshTick((prev) => prev + 1);
  }, []);

  // Hydrate timer state from localStorage on mount / user change
  useEffect(() => {
    if (typeof window === "undefined") return;
    hydratedRef.current = false;

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedTimerState;
        if (parsed.status === "running" && parsed.endTimeMs) {
          const secsLeft = Math.max(0, Math.ceil((parsed.endTimeMs - Date.now()) / 1000));
          if (secsLeft <= 0) {
            setState({
              ...parsed,
              status: "completed",
              endTimeMs: null,
              remainingSecondsOnPause: 0,
              completionModalOpen: true,
            });
            setRemainingSeconds(0);
          } else {
            setState(parsed);
            setRemainingSeconds(secsLeft);
          }
        } else {
          setState(parsed);
          setRemainingSeconds(
            parsed.status === "idle" ? parsed.totalSeconds : parsed.remainingSecondsOnPause
          );
        }
        hydratedRef.current = true;
        return;
      } catch {
        localStorage.removeItem(storageKey);
      }
    }

    const defaultSecs = getDefaultMinutes("focus", user) * 60;
    setState((prev) => ({
      ...prev,
      mode: "focus",
      status: "idle",
      totalSeconds: defaultSecs,
      remainingSecondsOnPause: defaultSecs,
      endTimeMs: null,
      sessionId: null,
      completionModalOpen: false,
    }));
    setRemainingSeconds(defaultSecs);
    hydratedRef.current = true;
  }, [storageKey, user]);

  // Persist timer state changes
  useEffect(() => {
    if (!hydratedRef.current || typeof window === "undefined") return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  // Sync default durations when idle and user updates settings
  useEffect(() => {
    if (!user || state.status !== "idle") return;
    const expected = getDefaultMinutes(state.mode, user) * 60;
    if (state.totalSeconds !== expected && state.startedAtMs === null) {
      // Only auto-sync if user hasn't explicitly set a custom duration
      setState((prev) => ({
        ...prev,
        totalSeconds: expected,
        remainingSecondsOnPause: expected,
      }));
      setRemainingSeconds(expected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.default_focus_minutes,
    user?.default_short_break_minutes,
    user?.default_long_break_minutes,
  ]);

  // Trigger completion effects when countdown reaches 0
  const handleTimerFinished = useCallback(() => {
    ambientAudio.stop();
    if (user?.notifications_enabled !== false) {
      ambientAudio.playCompletionChime();
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("FocusFlow session complete", {
          body:
            state.mode === "focus"
              ? `Great focus! ${Math.round(state.totalSeconds / 60)}m completed.`
              : "Break finished — ready for your next focus sprint.",
        });
      }
    }

    setState((prev) => ({
      ...prev,
      status: "completed",
      endTimeMs: null,
      remainingSecondsOnPause: 0,
      completionModalOpen: true,
    }));
    setRemainingSeconds(0);
  }, [state.mode, state.totalSeconds, user?.notifications_enabled]);

  // High-accuracy wall-clock countdown loop
  useEffect(() => {
    if (state.status !== "running" || !state.endTimeMs) {
      if (typeof document !== "undefined") {
        document.title = "FocusFlow – Smart Focus Mode";
      }
      return;
    }

    const tick = () => {
      if (!state.endTimeMs) return;
      const secsLeft = Math.max(0, Math.ceil((state.endTimeMs - Date.now()) / 1000));
      setRemainingSeconds(secsLeft);
      if (typeof document !== "undefined") {
        const modeLabel =
          state.mode === "focus" ? "Focus" : state.mode === "short_break" ? "Short Break" : "Long Break";
        document.title = `${formatSecondsToClock(secsLeft)} · ${modeLabel} — FocusFlow`;
      }
      if (secsLeft <= 0) {
        handleTimerFinished();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [state.status, state.endTimeMs, state.mode, handleTimerFinished]);

  // Keep ambient audio synced with timer running state
  useEffect(() => {
    if (state.status === "running" && state.ambientSound !== "none") {
      ambientAudio.play(state.ambientSound, state.volume);
    } else {
      ambientAudio.stop();
    }
  }, [state.status, state.ambientSound, state.volume]);

  const startTimer = useCallback(
    async (options?: { task?: Task | null; customMinutes?: number; mode?: SessionType }) => {
      const targetMode = options?.mode ?? state.mode;
      const chosenTask = options?.task !== undefined ? options.task : null;
      const taskId = chosenTask ? chosenTask.id : options?.task === null ? null : state.selectedTaskId;
      const taskTitle = chosenTask
        ? chosenTask.title
        : options?.task === null
          ? null
          : state.selectedTaskTitle;

      const durationMins =
        options?.customMinutes ??
        (options?.mode
          ? getDefaultMinutes(targetMode, user)
          : Math.max(1, Math.round(state.totalSeconds / 60)));

      const totalSecs = durationMins * 60;
      let createdSessionId: number | null = null;

      if (isAuthenticated) {
        try {
          const created = await focusService.start({
            task_id: targetMode === "focus" ? taskId : null,
            session_type: targetMode,
            planned_duration: durationMins,
            ambient_sound: state.ambientSound,
          });
          createdSessionId = created.id;
        } catch (err) {
          toast.error("Could not start session on server", extractApiError(err));
          return;
        }
      }

      const now = Date.now();
      setState((prev) => ({
        ...prev,
        mode: targetMode,
        status: "running",
        totalSeconds: totalSecs,
        endTimeMs: now + totalSecs * 1000,
        remainingSecondsOnPause: totalSecs,
        sessionId: createdSessionId,
        selectedTaskId: taskId,
        selectedTaskTitle: taskTitle,
        startedAtMs: now,
        completionModalOpen: false,
      }));
      setRemainingSeconds(totalSecs);
    },
    [isAuthenticated, state.ambientSound, state.mode, state.selectedTaskId, state.selectedTaskTitle, state.totalSeconds, toast, user]
  );

  const pauseTimer = useCallback(() => {
    if (state.status !== "running" || !state.endTimeMs) return;
    const secsLeft = Math.max(1, Math.ceil((state.endTimeMs - Date.now()) / 1000));
    ambientAudio.stop();
    setState((prev) => ({
      ...prev,
      status: "paused",
      endTimeMs: null,
      remainingSecondsOnPause: secsLeft,
    }));
    setRemainingSeconds(secsLeft);
  }, [state.endTimeMs, state.status]);

  const resumeTimer = useCallback(() => {
    if (state.status !== "paused") return;
    const secs = Math.max(1, state.remainingSecondsOnPause);
    setState((prev) => ({
      ...prev,
      status: "running",
      endTimeMs: Date.now() + secs * 1000,
    }));
  }, [state.remainingSecondsOnPause, state.status]);

  const resetTimer = useCallback(async () => {
    ambientAudio.stop();
    if (isAuthenticated && state.sessionId && (state.status === "running" || state.status === "paused")) {
      const elapsedSecs = Math.max(0, state.totalSeconds - remainingSeconds);
      try {
        await focusService.complete({
          session_id: state.sessionId,
          duration: Math.floor(elapsedSecs / 60),
          duration_seconds: elapsedSecs,
          status: "cancelled",
          task_completed: false,
        });
        bumpRefreshTick();
      } catch {
        // Ignore cleanup errors
      }
    }

    const defaultSecs = getDefaultMinutes(state.mode, user) * 60;
    setState((prev) => ({
      ...prev,
      status: "idle",
      totalSeconds: defaultSecs,
      endTimeMs: null,
      remainingSecondsOnPause: defaultSecs,
      sessionId: null,
      startedAtMs: null,
      completionModalOpen: false,
    }));
    setRemainingSeconds(defaultSecs);
  }, [bumpRefreshTick, isAuthenticated, remainingSeconds, state.mode, state.sessionId, state.status, state.totalSeconds, user]);

  const finishEarly = useCallback(() => {
    if (state.status !== "running" && state.status !== "paused") return;
    ambientAudio.stop();
    setState((prev) => ({
      ...prev,
      status: "completed",
      endTimeMs: null,
      remainingSecondsOnPause: remainingSeconds,
      completionModalOpen: true,
    }));
  }, [remainingSeconds, state.status]);

  const switchMode = useCallback(
    async (nextMode: SessionType, customMinutes?: number) => {
      ambientAudio.stop();
      if (isAuthenticated && state.sessionId && (state.status === "running" || state.status === "paused")) {
        const elapsedSecs = Math.max(0, state.totalSeconds - remainingSeconds);
        try {
          await focusService.complete({
            session_id: state.sessionId,
            duration: Math.floor(elapsedSecs / 60),
            duration_seconds: elapsedSecs,
            status: "interrupted",
            task_completed: false,
          });
          bumpRefreshTick();
        } catch {
          // Ignore cleanup errors
        }
      }

      const mins = customMinutes ?? getDefaultMinutes(nextMode, user);
      const secs = mins * 60;
      setState((prev) => ({
        ...prev,
        mode: nextMode,
        status: "idle",
        totalSeconds: secs,
        endTimeMs: null,
        remainingSecondsOnPause: secs,
        sessionId: null,
        startedAtMs: null,
        completionModalOpen: false,
      }));
      setRemainingSeconds(secs);
    },
    [bumpRefreshTick, isAuthenticated, remainingSeconds, state.sessionId, state.status, state.totalSeconds, user]
  );

  const setCustomMinutes = useCallback(
    (minutes: number) => {
      if (state.status !== "idle") return;
      const clamped = Math.max(1, Math.min(180, Math.round(minutes)));
      const secs = clamped * 60;
      setState((prev) => ({
        ...prev,
        totalSeconds: secs,
        remainingSecondsOnPause: secs,
      }));
      setRemainingSeconds(secs);
    },
    [state.status]
  );

  const selectTask = useCallback((task: { id: number; title: string } | null) => {
    setState((prev) => ({
      ...prev,
      selectedTaskId: task ? task.id : null,
      selectedTaskTitle: task ? task.title : null,
    }));
  }, []);

  const setAmbientSound = useCallback((ambientSound: AmbientSound) => {
    setState((prev) => ({ ...prev, ambientSound }));
  }, []);

  const setBackdrop = useCallback((backdrop: AmbientBackdrop) => {
    setState((prev) => ({ ...prev, backdrop }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    ambientAudio.setVolume(volume);
    setState((prev) => ({ ...prev, volume }));
  }, []);

  const completeSessionRecord = useCallback(
    async (taskCompleted: boolean) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          status: "idle",
          completionModalOpen: false,
          remainingSecondsOnPause: prev.totalSeconds,
        }));
        setRemainingSeconds(state.totalSeconds);
        return;
      }

      setIsSubmitting(true);
      try {
        const elapsedSecs =
          remainingSeconds === 0
            ? state.totalSeconds
            : Math.max(60, state.totalSeconds - remainingSeconds);
        const mins = Math.max(1, Math.round(elapsedSecs / 60));

        let sid = state.sessionId;
        if (!sid) {
          const created = await focusService.start({
            task_id: state.mode === "focus" ? state.selectedTaskId : null,
            session_type: state.mode,
            planned_duration: Math.max(1, Math.round(state.totalSeconds / 60)),
            ambient_sound: state.ambientSound,
          });
          sid = created.id;
        }

        await focusService.complete({
          session_id: sid,
          duration: mins,
          duration_seconds: elapsedSecs,
          status: "completed",
          task_completed: taskCompleted,
        });

        const nextFocusCount =
          state.mode === "focus" ? state.completedFocusCount + 1 : state.completedFocusCount;
        const resetSecs = getDefaultMinutes(state.mode, user) * 60;

        setState((prev) => ({
          ...prev,
          status: "idle",
          totalSeconds: resetSecs,
          endTimeMs: null,
          remainingSecondsOnPause: resetSecs,
          sessionId: null,
          startedAtMs: null,
          completedFocusCount: nextFocusCount,
          completionModalOpen: false,
          selectedTaskId: taskCompleted ? null : prev.selectedTaskId,
          selectedTaskTitle: taskCompleted ? null : prev.selectedTaskTitle,
        }));
        setRemainingSeconds(resetSecs);
        bumpRefreshTick();

        toast.success(
          state.mode === "focus" ? "Focus session logged!" : "Break finished!",
          taskCompleted
            ? `Recorded ${mins}m of focus and marked your task complete.`
            : `Recorded ${mins}m ${state.mode === "focus" ? "of focused work" : "break"}.`
        );
      } catch (err) {
        toast.error("Failed to save session", extractApiError(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      bumpRefreshTick,
      isAuthenticated,
      remainingSeconds,
      state.ambientSound,
      state.completedFocusCount,
      state.mode,
      state.selectedTaskId,
      state.sessionId,
      state.totalSeconds,
      toast,
      user,
    ]
  );

  const dismissCompletionModal = useCallback(() => {
    const resetSecs = getDefaultMinutes(state.mode, user) * 60;
    setState((prev) => ({
      ...prev,
      status: "idle",
      totalSeconds: resetSecs,
      endTimeMs: null,
      remainingSecondsOnPause: resetSecs,
      sessionId: null,
      startedAtMs: null,
      completionModalOpen: false,
    }));
    setRemainingSeconds(resetSecs);
  }, [state.mode, user]);

  const progressPct = useMemo(() => {
    if (state.totalSeconds <= 0) return 0;
    const elapsed = state.totalSeconds - remainingSeconds;
    return Math.max(0, Math.min(100, (elapsed / state.totalSeconds) * 100));
  }, [remainingSeconds, state.totalSeconds]);

  return (
    <FocusTimerContext.Provider
      value={{
        mode: state.mode,
        status: state.status,
        totalSeconds: state.totalSeconds,
        remainingSeconds,
        progressPct,
        sessionId: state.sessionId,
        selectedTaskId: state.selectedTaskId,
        selectedTaskTitle: state.selectedTaskTitle,
        ambientSound: state.ambientSound,
        backdrop: state.backdrop,
        volume: state.volume,
        completedFocusCount: state.completedFocusCount,
        completionModalOpen: state.completionModalOpen,
        isSubmitting,
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
        completeSessionRecord,
        dismissCompletionModal,
        bumpRefreshTick,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimerContext(): FocusTimerContextValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error("useFocusTimer must be used within FocusTimerProvider");
  }
  return ctx;
}
