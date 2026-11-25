from collections import defaultdict
from datetime import timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.distraction import Distraction
from app.models.focus_session import FocusSession
from app.models.user import User
from app.schemas.distraction import (
    CategoryBreakdownItem,
    DistractionCreate,
    DistractionResponse,
    DistractionSummaryResponse,
)
from app.services.auth_service import get_current_user
from app.services.productivity_service import (
    DISTRACTION_LABELS,
    analyze_distraction_patterns,
    to_user_local_date,
    user_local_today,
)

router = APIRouter(prefix="/api/distractions", tags=["Distractions"])


@router.post("", response_model=DistractionResponse, status_code=status.HTTP_201_CREATED)
def log_distraction(
    payload: DistractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DistractionResponse:
    """Manually log a distraction episode with category and duration."""
    if payload.focus_session_id is not None:
        session = (
            db.query(FocusSession)
            .filter(
                FocusSession.id == payload.focus_session_id,
                FocusSession.user_id == current_user.id,
            )
            .first()
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referenced focus session not found",
            )

    distraction = Distraction(
        user_id=current_user.id,
        focus_session_id=payload.focus_session_id,
        category=payload.category,
        description=payload.description.strip() if payload.description else None,
        duration=payload.duration,
    )
    db.add(distraction)
    db.commit()
    db.refresh(distraction)
    return DistractionResponse.model_validate(distraction)


@router.get("", response_model=DistractionSummaryResponse)
def list_distractions(
    category: Optional[str] = Query(default=None),
    range_filter: str = Query(default="all", alias="range"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DistractionSummaryResponse:
    """List logged distractions alongside daily, weekly, and category insights."""
    today = user_local_today(current_user.timezone)
    week_start = today - timedelta(days=6)
    month_start = today - timedelta(days=29)

    all_rows = (
        db.query(Distraction)
        .filter(Distraction.user_id == current_user.id)
        .order_by(Distraction.created_at.desc())
        .all()
    )

    today_count = 0
    today_minutes = 0
    week_count = 0
    week_minutes = 0

    for item in all_rows:
        day = to_user_local_date(item.created_at, current_user.timezone)
        if day == today:
            today_count += 1
            today_minutes += item.duration
        if week_start <= day <= today:
            week_count += 1
            week_minutes += item.duration

    filtered: List[Distraction] = []
    for item in all_rows:
        day = to_user_local_date(item.created_at, current_user.timezone)
        if range_filter == "today" and day != today:
            continue
        if range_filter == "week" and not (week_start <= day <= today):
            continue
        if range_filter == "month" and not (month_start <= day <= today):
            continue
        if category and category != "all" and item.category != category:
            continue
        filtered.append(item)

    # Category breakdown across week (or filtered rows when range=all/month)
    stats_source = filtered if range_filter in ("today", "week", "month") else [
        d for d in all_rows if week_start <= to_user_local_date(d.created_at, current_user.timezone) <= today
    ]
    if not stats_source and all_rows:
        stats_source = all_rows

    cat_minutes: Dict[str, int] = defaultdict(int)
    cat_counts: Dict[str, int] = defaultdict(int)
    for item in stats_source:
        cat_minutes[item.category] += item.duration
        cat_counts[item.category] += 1

    grand_total = sum(cat_minutes.values()) or 1
    breakdown = [
        CategoryBreakdownItem(
            category=cat,  # type: ignore[arg-type]
            label=DISTRACTION_LABELS.get(cat, cat),
            count=cat_counts[cat],
            total_minutes=cat_minutes[cat],
            percentage=round((cat_minutes[cat] / grand_total) * 100, 1),
        )
        for cat in cat_minutes
    ]
    breakdown.sort(key=lambda b: (-b.total_minutes, -b.count))

    most_common_cat = breakdown[0].category if breakdown else None
    most_common_label = breakdown[0].label if breakdown else None

    focus_sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == current_user.id,
            FocusSession.session_type == "focus",
            FocusSession.status == "completed",
        )
        .all()
    )
    week_focus_mins = sum(
        s.duration
        for s in focus_sessions
        if week_start <= to_user_local_date(s.start_time, current_user.timezone) <= today
    )

    insight = analyze_distraction_patterns(cat_minutes, cat_counts, week_focus_mins)

    return DistractionSummaryResponse(
        items=[DistractionResponse.model_validate(d) for d in filtered],
        today_count=today_count,
        today_minutes=today_minutes,
        week_count=week_count,
        week_minutes=week_minutes,
        most_common_category=most_common_cat,
        most_common_label=most_common_label,
        category_breakdown=breakdown,
        insight=insight,
    )


@router.delete("/{distraction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_distraction(
    distraction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete a distraction entry owned by the current user."""
    item = (
        db.query(Distraction)
        .filter(Distraction.id == distraction_id, Distraction.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Distraction record not found",
        )
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
