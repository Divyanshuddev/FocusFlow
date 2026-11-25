from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.distraction import Distraction
    from app.models.task import Task
    from app.models.user import User


class FocusSession(Base):
    __tablename__ = "focus_sessions"
    __table_args__ = (
        CheckConstraint(
            "session_type IN ('focus', 'short_break', 'long_break')",
            name="ck_focus_sessions_type",
        ),
        CheckConstraint(
            "status IN ('active', 'paused', 'completed', 'cancelled', 'interrupted')",
            name="ck_focus_sessions_status",
        ),
        CheckConstraint("planned_duration > 0", name="ck_focus_sessions_planned_duration"),
        CheckConstraint("duration >= 0", name="ck_focus_sessions_duration"),
        Index("ix_focus_sessions_user_start", "user_id", "start_time"),
        Index("ix_focus_sessions_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    session_type: Mapped[str] = mapped_column(String(20), nullable=False, default="focus", server_default="focus")
    planned_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=25, server_default="25")
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", server_default="active")
    ambient_sound: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="focus_sessions")
    task: Mapped[Optional["Task"]] = relationship("Task", back_populates="focus_sessions")
    distractions: Mapped[List["Distraction"]] = relationship(
        "Distraction", back_populates="focus_session", passive_deletes=True
    )
