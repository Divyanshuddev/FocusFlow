export type ThemePreference = "dark" | "light";
export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "completed";
export type SessionType = "focus" | "short_break" | "long_break";
export type SessionStatus = "active" | "paused" | "completed" | "cancelled" | "interrupted";
export type DistractionCategory =
  | "social_media"
  | "entertainment"
  | "notifications"
  | "multitasking"
  | "other";
export type AmbientSound = "none" | "rain" | "brown_noise" | "forest" | "lofi";

export interface User {
  id: number;
  name: string;
  email: string;
  default_focus_minutes: number;
  default_short_break_minutes: number;
  default_long_break_minutes: number;
  daily_focus_goal_minutes: number;
  notifications_enabled: boolean;
  theme_preference: ThemePreference;
  timezone: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  importance: number;
  deadline: string | null;
  estimated_duration: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  smart_score: number | null;
  recommendation_reasons: string[];
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  recommended_task: Task | null;
}

export interface FocusSession {
  id: number;
  user_id: number;
  task_id: number | null;
  task_title: string | null;
  session_type: SessionType;
  planned_duration: number;
  start_time: string;
  end_time: string | null;
  duration: number;
  duration_seconds: number;
  status: SessionStatus;
  ambient_sound: string | null;
}

export interface FocusStats {
  today_focus_minutes: number;
  today_sessions_completed: number;
  total_focus_minutes: number;
  total_sessions_completed: number;
  completion_rate: number;
  average_focus_duration: number;
  current_streak: number;
  active_session: FocusSession | null;
  recent_sessions: FocusSession[];
}

export interface Distraction {
  id: number;
  user_id: number;
  focus_session_id: number | null;
  category: DistractionCategory;
  description: string | null;
  duration: number;
  created_at: string;
}

export interface CategoryBreakdownItem {
  category: DistractionCategory;
  label: string;
  count: number;
  total_minutes: number;
  percentage: number;
}

export interface DistractionSummary {
  items: Distraction[];
  today_count: number;
  today_minutes: number;
  week_count: number;
  week_minutes: number;
  most_common_category: DistractionCategory | null;
  most_common_label: string | null;
  category_breakdown: CategoryBreakdownItem[];
  insight: string;
}

export interface ProductivityBreakdown {
  focus_points: number;
  task_points: number;
  consistency_points: number;
  distraction_penalty: number;
  focus_bonus: number;
}

export interface DailyAnalytics {
  date: string;
  productivity_score: number;
  score_breakdown: ProductivityBreakdown;
  focus_minutes: number;
  focus_hours: number;
  completed_tasks_today: number;
  total_completed_tasks: number;
  pending_tasks_count: number;
  current_streak: number;
  best_streak: number;
  daily_goal_minutes: number;
  daily_goal_progress_pct: number;
  distraction_minutes: number;
  distraction_count: number;
  sessions_completed_today: number;
  session_completion_rate: number;
  motivational_message: string;
  recommended_task: Task | null;
  upcoming_tasks: Task[];
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  focus_minutes: number;
  focus_hours: number;
  completed_tasks: number;
  distraction_minutes: number;
  distraction_count: number;
  productivity_score: number;
  goal_target_minutes: number;
  goal_met: boolean;
}

export interface WeeklyAnalytics {
  start_date: string;
  end_date: string;
  total_focus_minutes: number;
  total_focus_hours: number;
  total_completed_tasks: number;
  total_sessions: number;
  completed_sessions: number;
  session_completion_rate: number;
  average_focus_duration: number;
  total_distraction_minutes: number;
  total_distraction_count: number;
  most_productive_day: string | null;
  most_productive_minutes: number;
  top_distraction_category: string | null;
  daily_series: DailyTrendPoint[];
  distraction_by_category: CategoryBreakdownItem[];
}

export interface MonthlyAnalytics {
  start_date: string;
  end_date: string;
  total_focus_minutes: number;
  total_focus_hours: number;
  completed_tasks: number;
  pending_tasks: number;
  total_sessions: number;
  completed_sessions: number;
  session_completion_rate: number;
  average_focus_duration: number;
  most_productive_day: string | null;
  total_distraction_minutes: number;
  total_distraction_count: number;
  daily_series: DailyTrendPoint[];
  distraction_by_category: CategoryBreakdownItem[];
}

export interface Goal {
  id: number;
  user_id: number;
  target_focus_minutes: number;
  goal_date: string;
  achieved_minutes: number;
  progress_pct: number;
  completed: boolean;
  created_at: string;
}

export interface CalendarDayStatus {
  date: string;
  focus_minutes: number;
  target_minutes: number;
  goal_met: boolean;
  intensity: number;
}

export interface GoalsOverview {
  today_goal: Goal;
  current_streak: number;
  best_streak: number;
  total_goal_days_met: number;
  motivational_message: string;
  recent_goals: Goal[];
  calendar: CalendarDayStatus[];
}
