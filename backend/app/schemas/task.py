from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

TaskPriority = Literal["high", "medium", "low"]
TaskStatus = Literal["todo", "in_progress", "completed"]


class TaskBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: TaskPriority = "medium"
    status: TaskStatus = "todo"
    importance: Optional[int] = Field(default=None, ge=1, le=5)
    deadline: Optional[datetime] = None
    estimated_duration: int = Field(default=25, ge=5, le=480)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    importance: Optional[int] = Field(default=None, ge=1, le=5)
    deadline: Optional[datetime] = None
    estimated_duration: Optional[int] = Field(default=None, ge=5, le=480)


class TaskCompleteRequest(BaseModel):
    completed: bool = True


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    priority: TaskPriority
    status: TaskStatus
    importance: int
    deadline: Optional[datetime] = None
    estimated_duration: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    smart_score: Optional[float] = None
    recommendation_reasons: List[str] = Field(default_factory=list)


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    recommended_task: Optional[TaskResponse] = None
