from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.focus_session import FocusSession
    from app.models.user import User


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        CheckConstraint("priority IN ('high', 'medium', 'low')", name="ck_tasks_priority"),
        CheckConstraint("status IN ('todo', 'in_progress', 'completed')", name="ck_tasks_status"),
        CheckConstraint("estimated_duration > 0", name="ck_tasks_estimated_duration"),
        CheckConstraint("importance >= 1 AND importance <= 5", name="ck_tasks_importance"),
        Index("ix_tasks_user_status_priority", "user_id", "status", "priority"),
        Index("ix_tasks_user_deadline", "user_id", "deadline"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="medium", server_default="medium")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="todo", server_default="todo")
    importance: Mapped[int] = mapped_column(Integer, nullable=False, default=3, server_default="3")
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=25, server_default="25")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="tasks")
    focus_sessions: Mapped[List["FocusSession"]] = relationship(
        "FocusSession", back_populates="task", passive_deletes=True
    )
