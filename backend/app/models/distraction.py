from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.focus_session import FocusSession
    from app.models.user import User


class Distraction(Base):
    __tablename__ = "distractions"
    __table_args__ = (
        CheckConstraint(
            "category IN ('social_media', 'entertainment', 'notifications', 'multitasking', 'other')",
            name="ck_distractions_category",
        ),
        CheckConstraint("duration > 0", name="ck_distractions_duration"),
        Index("ix_distractions_user_created", "user_id", "created_at"),
        Index("ix_distractions_user_category", "user_id", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    focus_session_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("focus_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="distractions")
    focus_session: Mapped[Optional["FocusSession"]] = relationship(
        "FocusSession", back_populates="distractions"
    )
