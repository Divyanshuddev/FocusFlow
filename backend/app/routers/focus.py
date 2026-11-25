from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.daily_goal import DailyGoal
from app.models.focus_session import FocusSession
from app.models.task import Task
from app.models.user import User
from app.schemas.focus_session import (
    FocusCompleteRequest,
    FocusSessionResponse,
    FocusStartRequest,
    FocusStatsResponse,
)
from app.services.auth_service import get_current_user
from app.services.productivity_service import (
    as_utc,
    compute_streaks,
    to_user_local_date,
    user_local_today,
)

router = APIRouter(prefix="/api/focus", tags=["Focus Sessions"])


def _serialize_session(session: FocusSession, task_title: Optional[str] = None) -> FocusSessionResponse:
    resolved_title = task_title
    if resolved_title is None and session.task is not None:
        resolved_title = session.task.title
    return FocusSessionResponse(
        id=session.id,
        user_id=session.user_id,
        task_id=session.task_id,
        task_title=resolved_title,
        session_type=session.session_type,  # type: ignore[arg-type]
        planned_duration=session.planned_duration,
        start_time=session.start_time,
        end_time=session.end_time,
        duration=session.duration,
        duration_seconds=session.duration_seconds,
        status=session.status,  # type: ignore[arg-type]
        ambient_sound=session.ambient_sound,
    )


def _default_duration_for_type(user: User, session_type: str) -> int:
    if session_type == "short_break":
        return user.default_short_break_minutes
    if session_type == "long_break":
        return user.default_long_break_minutes
    return user.default_focus_minutes


@router.post("/start", response_model=FocusSessionResponse, status_code=status.HTTP_201_CREATED)
def start_focus_session(
    payload: FocusStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusSessionResponse:
    """Start a new focus or break session, closing any stale active session cleanly."""
    linked_task: Optional[Task] = None
    if payload.task_id is not None:
        linked_task = (
            db.query(Task)
            .filter(Task.id == payload.task_id, Task.user_id == current_user.id)
            .first()
        )
        if not linked_task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked task not found",
            )
        if linked_task.status == "todo":
            linked_task.status = "in_progress"

    now = datetime.now(timezone.utc)
    # Mark any previous lingering active session as interrupted with elapsed duration
    stale_sessions = (
        db.query(FocusSession)
        .filter(FocusSession.user_id == current_user.id, FocusSession.status == "active")
        .all()
    )
    for stale in stale_sessions:
        elapsed_secs = max(0, int((now - as_utc(stale.start_time)).total_seconds()))
        stale.status = "interrupted"
        stale.end_time = now
        stale.duration_seconds = min(elapsed_secs, stale.planned_duration * 60)
        stale.duration = stale.duration_seconds // 60

    planned = payload.planned_duration or _default_duration_for_type(current_user, payload.session_type)

    session = FocusSession(
        user_id=current_user.id,
        task_id=linked_task.id if linked_task else None,
        session_type=payload.session_type,
        planned_duration=planned,
        start_time=now,
        duration=0,
        duration_seconds=0,
        status="active",
        ambient_sound=payload.ambient_sound or "none",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _serialize_session(session, task_title=linked_task.title if linked_task else None)


@router.post("/complete", response_model=FocusSessionResponse)
def complete_focus_session(
    payload: FocusCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusSessionResponse:
    """Complete, cancel, or interrupt an active focus session and optionally complete its linked task."""
    session = (
        db.query(FocusSession)
        .filter(FocusSession.id == payload.session_id, FocusSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Focus session not found",
        )

    now = datetime.now(timezone.utc)
    if payload.duration_seconds is not None:
        duration_secs = payload.duration_seconds
        duration_mins = payload.duration if payload.duration is not None else max(0, round(duration_secs / 60))
    elif payload.duration is not None:
        duration_mins = payload.duration
        duration_secs = duration_mins * 60
    elif payload.status == "completed":
        duration_mins = session.planned_duration
        duration_secs = session.planned_duration * 60
    else:
        elapsed_secs = max(0, int((now - as_utc(session.start_time)).total_seconds()))
        duration_secs = min(elapsed_secs, session.planned_duration * 60)
        duration_mins = duration_secs // 60

    session.status = payload.status
    session.end_time = now
    session.duration = duration_mins
    session.duration_seconds = duration_secs

    if payload.task_completed and session.task_id is not None:
        task = (
            db.query(Task)
            .filter(Task.id == session.task_id, Task.user_id == current_user.id)
            .first()
        )
        if task:
            task.status = "completed"
            task.completed_at = now

    db.commit()
    db.refresh(session)
    return _serialize_session(session)


@router.get("/active", response_model=Optional[FocusSessionResponse])
def get_active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Optional[FocusSessionResponse]:
    """Return the most recent active focus session for state restoration."""
    active = (
        db.query(FocusSession)
        .filter(FocusSession.user_id == current_user.id, FocusSession.status == "active")
        .order_by(FocusSession.start_time.desc())
        .first()
    )
    return _serialize_session(active) if active else None


@router.get("/history", response_model=List[FocusSessionResponse])
def get_focus_history(
    limit: int = Query(default=50, ge=1, le=200),
    session_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[FocusSessionResponse]:
    """Retrieve focus session history for the current user."""
    query = db.query(FocusSession).filter(FocusSession.user_id == current_user.id)
    if session_type and session_type != "all":
        query = query.filter(FocusSession.session_type == session_type)

    sessions = query.order_by(FocusSession.start_time.desc()).limit(limit).all()
    return [_serialize_session(s) for s in sessions]


@router.get("/stats", response_model=FocusStatsResponse)
def get_focus_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FocusStatsResponse:
    """Compute focus session summary metrics and current streak."""
    today = user_local_today(current_user.timezone)
    all_sessions = (
        db.query(FocusSession)
        .filter(FocusSession.user_id == current_user.id)
        .order_by(FocusSession.start_time.desc())
        .all()
    )
    focus_sessions = [s for s in all_sessions if s.session_type == "focus"]

    today_focus_minutes = 0
    today_sessions_completed = 0
    total_focus_minutes = 0
    total_sessions_completed = 0
    finished_sessions = 0
    focus_by_date: dict = {}

    for s in focus_sessions:
        day = to_user_local_date(s.start_time, current_user.timezone)
        if s.status != "active":
            finished_sessions += 1
        if s.status == "completed":
            total_sessions_completed += 1
            total_focus_minutes += s.duration
            focus_by_date[day] = focus_by_date.get(day, 0) + s.duration
            if day == today:
                today_sessions_completed += 1
                today_focus_minutes += s.duration
        elif s.status in ("interrupted", "cancelled") and s.duration > 0:
            total_focus_minutes += s.duration
            focus_by_date[day] = focus_by_date.get(day, 0) + s.duration
            if day == today:
                today_focus_minutes += s.duration

    goals = db.query(DailyGoal).filter(DailyGoal.user_id == current_user.id).all()
    goal_targets = {g.goal_date: g.target_focus_minutes for g in goals}
    current_streak, _, _ = compute_streaks(
        focus_minutes_by_date=focus_by_date,
        goal_targets_by_date=goal_targets,
        default_goal_minutes=current_user.daily_focus_goal_minutes,
        today=today,
    )

    completion_rate = (
        round((total_sessions_completed / finished_sessions) * 100, 1)
        if finished_sessions > 0
        else 0.0
    )
    avg_duration = (
        round(total_focus_minutes / total_sessions_completed, 1)
        if total_sessions_completed > 0
        else 0.0
    )
    active = next((s for s in all_sessions if s.status == "active"), None)

    return FocusStatsResponse(
        today_focus_minutes=today_focus_minutes,
        today_sessions_completed=today_sessions_completed,
        total_focus_minutes=total_focus_minutes,
        total_sessions_completed=total_sessions_completed,
        completion_rate=completion_rate,
        average_focus_duration=avg_duration,
        current_streak=current_streak,
        active_session=_serialize_session(active) if active else None,
        recent_sessions=[_serialize_session(s) for s in all_sessions[:10]],
    )
