from collections import defaultdict
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.daily_goal import DailyGoal
from app.models.distraction import Distraction
from app.models.focus_session import FocusSession
from app.models.task import Task
from app.models.user import User
from app.schemas.analytics import (
    CalendarDayStatus,
    DailyAnalyticsResponse,
    DailyTrendPoint,
    GoalResponse,
    GoalsOverviewResponse,
    MonthlyAnalyticsResponse,
    WeeklyAnalyticsResponse,
)
from app.schemas.distraction import CategoryBreakdownItem
from app.services.productivity_service import (
    DISTRACTION_LABELS,
    calculate_daily_productivity_score,
    compute_streaks,
    get_motivational_message,
    to_user_local_date,
    user_local_today,
)
from app.services.task_service import get_recommended_next_task, serialize_task


def _collect_user_history(
    db: Session, user: User
) -> Tuple[
    Dict[date, int],
    Dict[date, int],
    Dict[date, int],
    Dict[date, int],
    Dict[date, int],
    Dict[date, int],
    Dict[date, int],
]:
    """
    Aggregate per-date focus minutes, sessions, completed tasks, distractions, and goals
    in the user's configured timezone.
    """
    tz = user.timezone
    focus_minutes_by_date: Dict[date, int] = defaultdict(int)
    completed_sessions_by_date: Dict[date, int] = defaultdict(int)
    total_sessions_by_date: Dict[date, int] = defaultdict(int)
    completed_tasks_by_date: Dict[date, int] = defaultdict(int)
    distraction_minutes_by_date: Dict[date, int] = defaultdict(int)
    distraction_count_by_date: Dict[date, int] = defaultdict(int)
    goal_targets_by_date: Dict[date, int] = {}

    sessions = db.query(FocusSession).filter(FocusSession.user_id == user.id).all()
    for s in sessions:
        if s.session_type != "focus":
            continue
        day = to_user_local_date(s.start_time, tz)
        if s.status != "active":
            total_sessions_by_date[day] += 1
        if s.status == "completed":
            completed_sessions_by_date[day] += 1
            focus_minutes_by_date[day] += s.duration or 0
        elif s.status in ("interrupted", "cancelled") and (s.duration or 0) > 0:
            focus_minutes_by_date[day] += s.duration

    tasks = db.query(Task).filter(Task.user_id == user.id, Task.completed_at.isnot(None)).all()
    for t in tasks:
        if t.completed_at:
            day = to_user_local_date(t.completed_at, tz)
            completed_tasks_by_date[day] += 1

    distractions = db.query(Distraction).filter(Distraction.user_id == user.id).all()
    for d in distractions:
        day = to_user_local_date(d.created_at, tz)
        distraction_minutes_by_date[day] += d.duration
        distraction_count_by_date[day] += 1

    goals = db.query(DailyGoal).filter(DailyGoal.user_id == user.id).all()
    for g in goals:
        goal_targets_by_date[g.goal_date] = g.target_focus_minutes

    return (
        focus_minutes_by_date,
        completed_sessions_by_date,
        total_sessions_by_date,
        completed_tasks_by_date,
        distraction_minutes_by_date,
        distraction_count_by_date,
        goal_targets_by_date,
    )


def _build_category_breakdown(distractions: List[Distraction]) -> List[CategoryBreakdownItem]:
    if not distractions:
        return []
    totals: Dict[str, int] = defaultdict(int)
    counts: Dict[str, int] = defaultdict(int)
    for d in distractions:
        totals[d.category] += d.duration
        counts[d.category] += 1

    grand_total = sum(totals.values()) or 1
    items = [
        CategoryBreakdownItem(
            category=cat,  # type: ignore[arg-type]
            label=DISTRACTION_LABELS.get(cat, cat),
            count=counts[cat],
            total_minutes=totals[cat],
            percentage=round((totals[cat] / grand_total) * 100, 1),
        )
        for cat in totals
    ]
    items.sort(key=lambda item: (-item.total_minutes, -item.count))
    return items


def get_daily_analytics(db: Session, user: User) -> DailyAnalyticsResponse:
    today = user_local_today(user.timezone)
    (
        focus_by_date,
        completed_sessions_by_date,
        total_sessions_by_date,
        completed_tasks_by_date,
        distraction_mins_by_date,
        distraction_cnt_by_date,
        goal_targets_by_date,
    ) = _collect_user_history(db, user)

    target_minutes = goal_targets_by_date.get(today, user.daily_focus_goal_minutes)
    focus_minutes = focus_by_date.get(today, 0)
    completed_tasks_today = completed_tasks_by_date.get(today, 0)
    completed_sessions = completed_sessions_by_date.get(today, 0)
    total_sessions = total_sessions_by_date.get(today, 0)
    distraction_minutes = distraction_mins_by_date.get(today, 0)
    distraction_count = distraction_cnt_by_date.get(today, 0)

    all_tasks = db.query(Task).filter(Task.user_id == user.id).all()
    pending_tasks = [t for t in all_tasks if t.status != "completed"]
    total_completed_tasks = sum(1 for t in all_tasks if t.status == "completed")

    score, breakdown = calculate_daily_productivity_score(
        focus_minutes=focus_minutes,
        target_minutes=target_minutes,
        completed_tasks_today=completed_tasks_today,
        pending_tasks_count=len(pending_tasks),
        completed_sessions=completed_sessions,
        total_sessions=total_sessions,
        distraction_minutes=distraction_minutes,
    )

    current_streak, best_streak, _ = compute_streaks(
        focus_minutes_by_date=focus_by_date,
        goal_targets_by_date=goal_targets_by_date,
        default_goal_minutes=user.daily_focus_goal_minutes,
        today=today,
    )

    goal_progress_pct = round(min(100.0, (focus_minutes / max(1, target_minutes)) * 100), 1)
    completion_rate = round((completed_sessions / total_sessions) * 100, 1) if total_sessions > 0 else 0.0

    recommended_task = get_recommended_next_task(db, user)
    serialized_pending = [serialize_task(t) for t in pending_tasks]
    serialized_pending.sort(
        key=lambda t: (
            t.deadline is None,
            t.deadline.timestamp() if t.deadline else float("inf"),
            -(t.smart_score or 0.0),
        )
    )

    return DailyAnalyticsResponse(
        date=today,
        productivity_score=score,
        score_breakdown=breakdown,
        focus_minutes=focus_minutes,
        focus_hours=round(focus_minutes / 60.0, 2),
        completed_tasks_today=completed_tasks_today,
        total_completed_tasks=total_completed_tasks,
        pending_tasks_count=len(pending_tasks),
        current_streak=current_streak,
        best_streak=best_streak,
        daily_goal_minutes=target_minutes,
        daily_goal_progress_pct=goal_progress_pct,
        distraction_minutes=distraction_minutes,
        distraction_count=distraction_count,
        sessions_completed_today=completed_sessions,
        session_completion_rate=completion_rate,
        motivational_message=get_motivational_message(current_streak, goal_progress_pct, score),
        recommended_task=recommended_task,
        upcoming_tasks=serialized_pending[:5],
    )


def _build_range_analytics(
    db: Session,
    user: User,
    days: int,
) -> Tuple[
    date,
    date,
    List[DailyTrendPoint],
    int,
    int,
    int,
    int,
    float,
    float,
    Optional[str],
    int,
    int,
    int,
    List[CategoryBreakdownItem],
]:
    today = user_local_today(user.timezone)
    start_date = today - timedelta(days=days - 1)
    (
        focus_by_date,
        completed_sessions_by_date,
        total_sessions_by_date,
        completed_tasks_by_date,
        distraction_mins_by_date,
        distraction_cnt_by_date,
        goal_targets_by_date,
    ) = _collect_user_history(db, user)

    pending_tasks_count = (
        db.query(Task).filter(Task.user_id == user.id, Task.status != "completed").count()
    )

    series: List[DailyTrendPoint] = []
    total_focus_minutes = 0
    total_completed_tasks = 0
    total_sessions = 0
    completed_sessions = 0
    total_distraction_minutes = 0
    total_distraction_count = 0

    best_day_label: Optional[str] = None
    best_day_minutes = 0

    for offset in range(days):
        day = start_date + timedelta(days=offset)
        f_mins = focus_by_date.get(day, 0)
        c_tasks = completed_tasks_by_date.get(day, 0)
        c_sess = completed_sessions_by_date.get(day, 0)
        t_sess = total_sessions_by_date.get(day, 0)
        d_mins = distraction_mins_by_date.get(day, 0)
        d_cnt = distraction_cnt_by_date.get(day, 0)
        target = goal_targets_by_date.get(day, user.daily_focus_goal_minutes)

        score, _ = calculate_daily_productivity_score(
            focus_minutes=f_mins,
            target_minutes=target,
            completed_tasks_today=c_tasks,
            pending_tasks_count=pending_tasks_count,
            completed_sessions=c_sess,
            total_sessions=t_sess,
            distraction_minutes=d_mins,
        )

        label = day.strftime("%a") if days <= 7 else day.strftime("%b %d")
        series.append(
            DailyTrendPoint(
                date=day,
                label=label,
                focus_minutes=f_mins,
                focus_hours=round(f_mins / 60.0, 2),
                completed_tasks=c_tasks,
                distraction_minutes=d_mins,
                distraction_count=d_cnt,
                productivity_score=score,
                goal_target_minutes=target,
                goal_met=f_mins >= target,
            )
        )

        total_focus_minutes += f_mins
        total_completed_tasks += c_tasks
        total_sessions += t_sess
        completed_sessions += c_sess
        total_distraction_minutes += d_mins
        total_distraction_count += d_cnt

        if f_mins > best_day_minutes:
            best_day_minutes = f_mins
            best_day_label = day.strftime("%A, %b %d") if days > 7 else day.strftime("%A")

    completion_rate = round((completed_sessions / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
    avg_focus = round(total_focus_minutes / completed_sessions, 1) if completed_sessions > 0 else 0.0

    all_distractions = db.query(Distraction).filter(Distraction.user_id == user.id).all()
    range_distractions = [
        d for d in all_distractions if start_date <= to_user_local_date(d.created_at, user.timezone) <= today
    ]
    breakdown = _build_category_breakdown(range_distractions)

    return (
        start_date,
        today,
        series,
        total_focus_minutes,
        total_completed_tasks,
        total_sessions,
        completed_sessions,
        completion_rate,
        avg_focus,
        best_day_label,
        best_day_minutes,
        total_distraction_minutes,
        total_distraction_count,
        breakdown,
    )


def get_weekly_analytics(db: Session, user: User) -> WeeklyAnalyticsResponse:
    (
        start_date,
        end_date,
        series,
        total_focus_minutes,
        total_completed_tasks,
        total_sessions,
        completed_sessions,
        completion_rate,
        avg_focus,
        best_day_label,
        best_day_minutes,
        total_distraction_minutes,
        total_distraction_count,
        breakdown,
    ) = _build_range_analytics(db, user, days=7)

    top_cat = breakdown[0].label if breakdown else None
    return WeeklyAnalyticsResponse(
        start_date=start_date,
        end_date=end_date,
        total_focus_minutes=total_focus_minutes,
        total_focus_hours=round(total_focus_minutes / 60.0, 2),
        total_completed_tasks=total_completed_tasks,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        session_completion_rate=completion_rate,
        average_focus_duration=avg_focus,
        total_distraction_minutes=total_distraction_minutes,
        total_distraction_count=total_distraction_count,
        most_productive_day=best_day_label,
        most_productive_minutes=best_day_minutes,
        top_distraction_category=top_cat,
        daily_series=series,
        distraction_by_category=breakdown,
    )


def get_monthly_analytics(db: Session, user: User) -> MonthlyAnalyticsResponse:
    (
        start_date,
        end_date,
        series,
        total_focus_minutes,
        _range_completed_tasks,
        total_sessions,
        completed_sessions,
        completion_rate,
        avg_focus,
        best_day_label,
        _best_day_minutes,
        total_distraction_minutes,
        total_distraction_count,
        breakdown,
    ) = _build_range_analytics(db, user, days=30)

    all_tasks = db.query(Task).filter(Task.user_id == user.id).all()
    completed_tasks = sum(1 for t in all_tasks if t.status == "completed")
    pending_tasks = sum(1 for t in all_tasks if t.status != "completed")

    return MonthlyAnalyticsResponse(
        start_date=start_date,
        end_date=end_date,
        total_focus_minutes=total_focus_minutes,
        total_focus_hours=round(total_focus_minutes / 60.0, 2),
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        session_completion_rate=completion_rate,
        average_focus_duration=avg_focus,
        most_productive_day=best_day_label,
        total_distraction_minutes=total_distraction_minutes,
        total_distraction_count=total_distraction_count,
        daily_series=series,
        distraction_by_category=breakdown,
    )


def get_goals_overview(db: Session, user: User) -> GoalsOverviewResponse:
    today = user_local_today(user.timezone)
    today_goal = (
        db.query(DailyGoal)
        .filter(DailyGoal.user_id == user.id, DailyGoal.goal_date == today)
        .first()
    )
    if not today_goal:
        today_goal = DailyGoal(
            user_id=user.id,
            target_focus_minutes=user.daily_focus_goal_minutes,
            goal_date=today,
        )
        db.add(today_goal)
        db.commit()
        db.refresh(today_goal)

    (
        focus_by_date,
        _completed_sess,
        _total_sess,
        _completed_tasks,
        _dist_mins,
        _dist_cnt,
        goal_targets_by_date,
    ) = _collect_user_history(db, user)

    current_streak, best_streak, total_goal_days_met = compute_streaks(
        focus_minutes_by_date=focus_by_date,
        goal_targets_by_date=goal_targets_by_date,
        default_goal_minutes=user.daily_focus_goal_minutes,
        today=today,
    )

    def _serialize_goal(goal: DailyGoal) -> GoalResponse:
        achieved = focus_by_date.get(goal.goal_date, 0)
        pct = round(min(100.0, (achieved / max(1, goal.target_focus_minutes)) * 100), 1)
        return GoalResponse(
            id=goal.id,
            user_id=goal.user_id,
            target_focus_minutes=goal.target_focus_minutes,
            goal_date=goal.goal_date,
            achieved_minutes=achieved,
            progress_pct=pct,
            completed=achieved >= goal.target_focus_minutes,
            created_at=goal.created_at,
        )

    recent_goals_rows = (
        db.query(DailyGoal)
        .filter(DailyGoal.user_id == user.id)
        .order_by(DailyGoal.goal_date.desc())
        .limit(14)
        .all()
    )
    recent_goals = [_serialize_goal(g) for g in recent_goals_rows]
    today_serialized = _serialize_goal(today_goal)

    # 35-day calendar grid ending today
    calendar: List[CalendarDayStatus] = []
    start_cal = today - timedelta(days=34)
    for i in range(35):
        day = start_cal + timedelta(days=i)
        mins = focus_by_date.get(day, 0)
        target = goal_targets_by_date.get(day, user.daily_focus_goal_minutes)
        ratio = mins / max(1, target)
        if mins == 0:
            intensity = 0
        elif ratio < 0.4:
            intensity = 1
        elif ratio < 0.75:
            intensity = 2
        elif ratio < 1.0:
            intensity = 3
        else:
            intensity = 4

        calendar.append(
            CalendarDayStatus(
                date=day,
                focus_minutes=mins,
                target_minutes=target,
                goal_met=mins >= target,
                intensity=intensity,
            )
        )

    motivational = get_motivational_message(
        streak=current_streak,
        progress_pct=today_serialized.progress_pct,
        score=round(today_serialized.progress_pct),
    )

    return GoalsOverviewResponse(
        today_goal=today_serialized,
        current_streak=current_streak,
        best_streak=best_streak,
        total_goal_days_met=total_goal_days_met,
        motivational_message=motivational,
        recent_goals=recent_goals,
        calendar=calendar,
    )
