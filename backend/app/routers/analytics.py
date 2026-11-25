from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    DailyAnalyticsResponse,
    MonthlyAnalyticsResponse,
    WeeklyAnalyticsResponse,
)
from app.services import analytics_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/daily", response_model=DailyAnalyticsResponse)
def daily_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DailyAnalyticsResponse:
    """Return today's productivity score, focus stats, goal progress, and task recommendations."""
    return analytics_service.get_daily_analytics(db, current_user)


@router.get("/weekly", response_model=WeeklyAnalyticsResponse)
def weekly_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WeeklyAnalyticsResponse:
    """Return 7-day productivity trends, most productive day, and distraction breakdown."""
    return analytics_service.get_weekly_analytics(db, current_user)


@router.get("/monthly", response_model=MonthlyAnalyticsResponse)
def monthly_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonthlyAnalyticsResponse:
    """Return 30-day productivity overview, completion rates, and task ratio metrics."""
    return analytics_service.get_monthly_analytics(db, current_user)
