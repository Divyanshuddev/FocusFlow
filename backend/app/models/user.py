from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.daily_goal import DailyGoal
    from app.models.distraction import Distraction
    from app.models.focus_session import FocusSession
    from app.models.task import Task


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # User focus & interface preferences
    default_focus_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=25, server_default="25")
    default_short_break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")
    default_long_break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15, server_default="15")
    daily_focus_goal_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=120, server_default="120")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    theme_preference: Mapped[str] = mapped_column(String(16), nullable=False, default="dark", server_default="dark")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC", server_default="UTC")

    # Password reset support
    reset_token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reset_token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="user", cascade="all, delete-orphan"
    )
    focus_sessions: Mapped[List["FocusSession"]] = relationship(
        "FocusSession", back_populates="user", cascade="all, delete-orphan"
    )
    distractions: Mapped[List["Distraction"]] = relationship(
        "Distraction", back_populates="user", cascade="all, delete-orphan"
    )
    daily_goals: Mapped[List["DailyGoal"]] = relationship(
        "DailyGoal", back_populates="user", cascade="all, delete-orphan"
    )
