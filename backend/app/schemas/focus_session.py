from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SessionType = Literal["focus", "short_break", "long_break"]
SessionStatus = Literal["active", "paused", "completed", "cancelled", "interrupted"]


class FocusStartRequest(BaseModel):
    task_id: Optional[int] = None
    session_type: SessionType = "focus"
    planned_duration: Optional[int] = Field(default=None, ge=1, le=180)
    ambient_sound: Optional[str] = Field(default="none", max_length=32)


class FocusCompleteRequest(BaseModel):
    session_id: int
    duration: Optional[int] = Field(default=None, ge=0, le=300)
    duration_seconds: Optional[int] = Field(default=None, ge=0, le=18000)
    status: Literal["completed", "cancelled", "interrupted"] = "completed"
    task_completed: bool = False


class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    task_id: Optional[int] = None
    task_title: Optional[str] = None
    session_type: SessionType
    planned_duration: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: int
    duration_seconds: int
    status: SessionStatus
    ambient_sound: Optional[str] = None


class FocusStatsResponse(BaseModel):
    today_focus_minutes: int
    today_sessions_completed: int
    total_focus_minutes: int
    total_sessions_completed: int
    completion_rate: float
    average_focus_duration: float
    current_streak: int
    active_session: Optional[FocusSessionResponse] = None
    recent_sessions: List[FocusSessionResponse] = Field(default_factory=list)
