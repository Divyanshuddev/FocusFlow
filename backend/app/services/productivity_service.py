from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.task import Task
from app.schemas.analytics import ProductivityBreakdown

PRIORITY_WEIGHTS: Dict[str, float] = {
    "high": 35.0,
    "medium": 20.0,
    "low": 8.0,
}

DISTRACTION_LABELS: Dict[str, str] = {
    "social_media": "Social Media",
    "entertainment": "Entertainment",
    "notifications": "Notifications",
    "multitasking": "Multitasking",
    "other": "Other",
}


def as_utc(dt: datetime) -> datetime:
    """Normalize naive or aware datetime into timezone-aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def get_zoneinfo(tz_name: Optional[str]) -> ZoneInfo:
    """Resolve user timezone safely, defaulting to UTC."""
    if not tz_name:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def user_local_today(tz_name: Optional[str] = "UTC") -> date:
    """Return today's date in the user's configured timezone."""
    tz = get_zoneinfo(tz_name)
    return datetime.now(tz).date()


def to_user_local_date(dt: datetime, tz_name: Optional[str] = "UTC") -> date:
    """Convert a UTC/aware/naive timestamp to a date in the user's timezone."""
    tz = get_zoneinfo(tz_name)
    return as_utc(dt).astimezone(tz).date()


def score_task(task: Task, now: Optional[datetime] = None) -> Tuple[float, List[str]]:
    """
    Deterministic, rule-based task priority recommendation engine.

    Combines priority/importance, deadline urgency, estimated effort fit,
    and active momentum. Designed cleanly to allow future AI-assisted ranking.
    """
    if task.status == "completed":
        return 0.0, ["Completed"]

    reference = as_utc(now) if now else datetime.now(timezone.utc)
    reasons: List[str] = []

    # 1. Importance & explicit priority (max 43 pts)
    priority_pts = PRIORITY_WEIGHTS.get(task.priority, 20.0)
    importance_val = task.importance or 3
    importance_pts = (importance_val - 3) * 4.0
    if task.priority == "high":
        reasons.append("High priority")
    elif importance_val >= 4:
        reasons.append(f"High importance ({importance_val}/5)")

    # 2. Urgency from deadline proximity (max 50 pts)
    urgency_pts = 0.0
    if task.deadline is not None:
        deadline_utc = as_utc(task.deadline)
        delta_hours = (deadline_utc - reference).total_seconds() / 3600.0
        if delta_hours < 0:
            hours_overdue = abs(delta_hours)
            urgency_pts = 40.0 + min(10.0, round(hours_overdue * 0.5, 2))
            reasons.append("Overdue — needs immediate attention")
        elif delta_hours <= 6:
            urgency_pts = 38.0
            reasons.append("Due in under 6 hours")
        elif delta_hours <= 24:
            urgency_pts = 32.0
            reasons.append("Due within 24 hours")
        elif delta_hours <= 48:
            urgency_pts = 22.0
            reasons.append("Due within 48 hours")
        elif delta_hours <= 168:
            urgency_pts = 12.0
            reasons.append("Due this week")
        else:
            urgency_pts = 4.0

    # 3. Effort fit (Pomodoro-friendly duration weighting, max 12 pts)
    effort_pts = 2.0
    est = task.estimated_duration or 25
    if est <= 30:
        effort_pts = 12.0
        reasons.append("Quick win (fits in one focus block)")
    elif est <= 60:
        effort_pts = 8.0
        reasons.append("Manageable 1–2 session scope")
    elif est <= 120:
        effort_pts = 5.0

    # 4. In-progress momentum (max 8 pts)
    momentum_pts = 0.0
    if task.status == "in_progress":
        momentum_pts = 8.0
        reasons.append("Already in progress")

    total_score = round(max(0.0, priority_pts + importance_pts + urgency_pts + effort_pts + momentum_pts), 1)
    if not reasons:
        reasons.append("Balanced priority and effort")
    return total_score, reasons


def calculate_daily_productivity_score(
    focus_minutes: int,
    target_minutes: int,
    completed_tasks_today: int,
    pending_tasks_count: int,
    completed_sessions: int,
    total_sessions: int,
    distraction_minutes: int,
) -> Tuple[int, ProductivityBreakdown]:
    """Calculate a transparent 0-100 daily productivity score."""
    safe_target = max(1, target_minutes)
    focus_points = round(min(45.0, (focus_minutes / safe_target) * 45.0), 1)

    task_denominator = max(1, completed_tasks_today + min(pending_tasks_count, 5))
    task_points = round(min(30.0, (completed_tasks_today / task_denominator) * 30.0), 1)

    if total_sessions > 0:
        consistency_points = round((completed_sessions / total_sessions) * 15.0, 1)
    elif focus_minutes > 0:
        consistency_points = 10.0
    else:
        consistency_points = 0.0

    if focus_minutes >= 25 and distraction_minutes <= 10:
        focus_bonus = 10.0
    elif focus_minutes >= 25 and distraction_minutes <= 25:
        focus_bonus = 5.0
    else:
        focus_bonus = 0.0

    distraction_penalty = round(min(15.0, distraction_minutes * 0.3), 1)

    raw_total = focus_points + task_points + consistency_points + focus_bonus - distraction_penalty
    score = max(0, min(100, round(raw_total)))

    breakdown = ProductivityBreakdown(
        focus_points=focus_points,
        task_points=task_points,
        consistency_points=consistency_points,
        distraction_penalty=distraction_penalty,
        focus_bonus=focus_bonus,
    )
    return score, breakdown


def compute_streaks(
    focus_minutes_by_date: Dict[date, int],
    goal_targets_by_date: Dict[date, int],
    default_goal_minutes: int,
    today: date,
) -> Tuple[int, int, int]:
    """
    Compute (current_streak, best_streak, total_goal_days_met).

    A day counts as completed when focus_minutes >= day_target_minutes.
    If today's goal is not yet met, active streak through yesterday is preserved.
    """
    all_dates = set(focus_minutes_by_date.keys()) | set(goal_targets_by_date.keys())
    if not all_dates:
        return 0, 0, 0

    earliest = min(min(all_dates), today - timedelta(days=90))
    total_met = 0
    best_streak = 0
    running = 0
    met_dates: set[date] = set()

    cursor = earliest
    while cursor <= today:
        target = goal_targets_by_date.get(cursor, default_goal_minutes)
        achieved = focus_minutes_by_date.get(cursor, 0)
        if target > 0 and achieved >= target:
            met_dates.add(cursor)
            total_met += 1
            running += 1
            best_streak = max(best_streak, running)
        else:
            running = 0
        cursor += timedelta(days=1)

    current_streak = 0
    check_day = today if today in met_dates else today - timedelta(days=1)
    while check_day in met_dates:
        current_streak += 1
        check_day -= timedelta(days=1)

    return current_streak, best_streak, total_met


def get_motivational_message(streak: int, progress_pct: float, score: int) -> str:
    """Return a concise motivational message matched to the user's current momentum."""
    if progress_pct >= 100:
        if streak >= 7:
            return f"Goal crushed! You are on a {streak}-day deep-work streak — elite consistency."
        return "Daily focus goal achieved! Take a proper break or lock in bonus deep work."
    if progress_pct >= 60:
        return "Over halfway to today's target. One more focused block will bring this home."
    if streak >= 3:
        return f"Keep your {streak}-day streak alive — start a 25-minute block on your top task."
    if score >= 70:
        return "Strong momentum today. Stay single-tasked to protect your focus flow."
    return "Start small: pick one clear task and commit to a single distraction-free sprint."


def analyze_distraction_patterns(
    category_minutes: Dict[str, int],
    category_counts: Dict[str, int],
    total_focus_minutes: int,
) -> str:
    """Produce a rule-based insight explaining distraction patterns without fake AI claims."""
    total_distraction_minutes = sum(category_minutes.values())
    if total_distraction_minutes == 0:
        return "No distractions logged in this period. Great environment control!"

    top_cat = max(category_minutes.keys(), key=lambda k: (category_minutes[k], category_counts.get(k, 0)))
    top_label = DISTRACTION_LABELS.get(top_cat, top_cat)
    pct = round((category_minutes[top_cat] / total_distraction_minutes) * 100)

    advice_map = {
        "social_media": "Try keeping your phone in another room or closing social tabs before starting a timer.",
        "entertainment": "Schedule dedicated entertainment breaks after completing two Pomodoro blocks.",
        "notifications": "Enable Do Not Disturb mode during active focus sessions to cut context switching.",
        "multitasking": "Keep a scratchpad next to you to jot down stray ideas instead of switching tasks.",
        "other": "Review what triggered interruptions and batch non-urgent items into scheduled break windows.",
    }
    ratio_note = ""
    if total_focus_minutes > 0:
        ratio = round((total_distraction_minutes / total_focus_minutes) * 100)
        ratio_note = f" Distractions equaled {ratio}% of your logged focus time."

    return f"{top_label} accounted for {pct}% of distraction time ({category_minutes[top_cat]}m).{ratio_note} {advice_map.get(top_cat, '')}".strip()
