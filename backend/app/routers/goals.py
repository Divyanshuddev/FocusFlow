from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.daily_goal import DailyGoal
from app.models.focus_session import FocusSession
from app.models.user import User
from app.schemas.analytics import GoalCreate, GoalResponse, GoalsOverviewResponse, GoalUpdate
from app.services import analytics_service
from app.services.auth_service import get_current_user
from app.services.productivity_service import to_user_local_date, user_local_today

router = APIRouter(prefix="/api/goals", tags=["Goals"])


def _goal_response_with_progress(db: Session, user: User, goal: DailyGoal) -> GoalResponse:
    sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == user.id,
            FocusSession.session_type == "focus",
            FocusSession.status.in_(["completed", "interrupted", "cancelled"]),
        )
        .all()
    )
    achieved = sum(
        s.duration
        for s in sessions
        if to_user_local_date(s.start_time, user.timezone) == goal.goal_date
    )
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


@router.get("", response_model=GoalsOverviewResponse)
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalsOverviewResponse:
    """Get today's goal, streak counts, 35-day progress calendar, and recent daily goals."""
    return analytics_service.get_goals_overview(db, current_user)


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_or_set_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalResponse:
    """Create or update a daily focus goal for a target date (defaults to today)."""
    today = user_local_today(current_user.timezone)
    target_date = payload.goal_date or today

    goal = (
        db.query(DailyGoal)
        .filter(DailyGoal.user_id == current_user.id, DailyGoal.goal_date == target_date)
        .first()
    )
    if goal:
        goal.target_focus_minutes = payload.target_focus_minutes
    else:
        goal = DailyGoal(
            user_id=current_user.id,
            target_focus_minutes=payload.target_focus_minutes,
            goal_date=target_date,
        )
        db.add(goal)

    if target_date == today:
        current_user.daily_focus_goal_minutes = payload.target_focus_minutes

    db.commit()
    db.refresh(goal)
    return _goal_response_with_progress(db, current_user, goal)


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GoalResponse:
    """Update a specific daily goal owned by the authenticated user."""
    goal = (
        db.query(DailyGoal)
        .filter(DailyGoal.id == goal_id, DailyGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily goal not found",
        )

    goal.target_focus_minutes = payload.target_focus_minutes
    if goal.goal_date == user_local_today(current_user.timezone):
        current_user.daily_focus_goal_minutes = payload.target_focus_minutes

    db.commit()
    db.refresh(goal)
    return _goal_response_with_progress(db, current_user, goal)
