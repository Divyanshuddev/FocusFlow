from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

DistractionCategory = Literal[
    "social_media",
    "entertainment",
    "notifications",
    "multitasking",
    "other",
]


class DistractionCreate(BaseModel):
    category: DistractionCategory
    description: Optional[str] = Field(default=None, max_length=500)
    duration: int = Field(ge=1, le=480)
    focus_session_id: Optional[int] = None


class DistractionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    focus_session_id: Optional[int] = None
    category: DistractionCategory
    description: Optional[str] = None
    duration: int
    created_at: datetime


class CategoryBreakdownItem(BaseModel):
    category: DistractionCategory
    label: str
    count: int
    total_minutes: int
    percentage: float


class DistractionSummaryResponse(BaseModel):
    items: List[DistractionResponse]
    today_count: int
    today_minutes: int
    week_count: int
    week_minutes: int
    most_common_category: Optional[DistractionCategory] = None
    most_common_label: Optional[str] = None
    category_breakdown: List[CategoryBreakdownItem]
    insight: str
