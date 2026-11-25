from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.distraction import CategoryBreakdownItem
from app.schemas.task import TaskResponse


class ProductivityBreakdown(BaseModel):
    focus_points: float
    task_points: float
    consistency_points: float
    distraction_penalty: float
    focus_bonus: float


class DailyAnalyticsResponse(BaseModel):
    date: date
    productivity_score: int
    score_breakdown: ProductivityBreakdown
    focus_minutes: int
    focus_hours: float
    completed_tasks_today: int
    total_completed_tasks: int
    pending_tasks_count: int
    current_streak: int
    best_streak: int
    daily_goal_minutes: int
    daily_goal_progress_pct: float
    distraction_minutes: int
    distraction_count: int
    sessions_completed_today: int
    session_completion_rate: float
    motivational_message: str
    recommended_task: Optional[TaskResponse] = None
    upcoming_tasks: List[TaskResponse] = Field(default_factory=list)


class DailyTrendPoint(BaseModel):
    date: date
    label: str
    focus_minutes: int
    focus_hours: float
    completed_tasks: int
    distraction_minutes: int
    distraction_count: int
    productivity_score: int
    goal_target_minutes: int
    goal_met: bool


class WeeklyAnalyticsResponse(BaseModel):
    start_date: date
    end_date: date
    total_focus_minutes: int
    total_focus_hours: float
    total_completed_tasks: int
    total_sessions: int
    completed_sessions: int
    session_completion_rate: float
    average_focus_duration: float
    total_distraction_minutes: int
    total_distraction_count: int
    most_productive_day: Optional[str] = None
    most_productive_minutes: int = 0
    top_distraction_category: Optional[str] = None
    daily_series: List[DailyTrendPoint]
    distraction_by_category: List[CategoryBreakdownItem]


class MonthlyAnalyticsResponse(BaseModel):
    start_date: date
    end_date: date
    total_focus_minutes: int
    total_focus_hours: float
    completed_tasks: int
    pending_tasks: int
    total_sessions: int
    completed_sessions: int
    session_completion_rate: float
    average_focus_duration: float
    most_productive_day: Optional[str] = None
    total_distraction_minutes: int
    total_distraction_count: int
    daily_series: List[DailyTrendPoint]
    distraction_by_category: List[CategoryBreakdownItem]


class GoalCreate(BaseModel):
    target_focus_minutes: int = Field(ge=15, le=720)
    goal_date: Optional[date] = None


class GoalUpdate(BaseModel):
    target_focus_minutes: int = Field(ge=15, le=720)


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    target_focus_minutes: int
    goal_date: date
    achieved_minutes: int = 0
    progress_pct: float = 0.0
    completed: bool = False
    created_at: datetime


class CalendarDayStatus(BaseModel):
    date: date
    focus_minutes: int
    target_minutes: int
    goal_met: bool
    intensity: int  # 0 to 4


class GoalsOverviewResponse(BaseModel):
    today_goal: GoalResponse
    current_streak: int
    best_streak: int
    total_goal_days_met: int
    motivational_message: str
    recent_goals: List[GoalResponse]
    calendar: List[CalendarDayStatus]
