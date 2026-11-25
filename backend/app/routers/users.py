from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.daily_goal import DailyGoal
from app.models.user import User
from app.schemas.user import PasswordChangeRequest, UserResponse, UserUpdate
from app.services.auth_service import get_current_user
from app.services.productivity_service import user_local_today
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Get the current user's profile and preferences."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Update profile information, timer defaults, notifications, theme, or daily focus goal."""
    updates = payload.model_dump(exclude_unset=True)

    if "email" in updates and updates["email"] is not None:
        normalized_email = updates["email"].strip().lower()
        existing = (
            db.query(User)
            .filter(User.email == normalized_email, User.id != current_user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email address is already in use",
            )
        updates["email"] = normalized_email

    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()

    for key, value in updates.items():
        setattr(current_user, key, value)

    if "daily_focus_goal_minutes" in updates and updates["daily_focus_goal_minutes"] is not None:
        today = user_local_today(current_user.timezone)
        today_goal = (
            db.query(DailyGoal)
            .filter(DailyGoal.user_id == current_user.id, DailyGoal.goal_date == today)
            .first()
        )
        if today_goal:
            today_goal.target_focus_minutes = updates["daily_focus_goal_minutes"]
        else:
            db.add(
                DailyGoal(
                    user_id=current_user.id,
                    target_focus_minutes=updates["daily_focus_goal_minutes"],
                    goal_date=today,
                )
            )

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put("/me/password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Change the authenticated user's password after verifying the current password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
