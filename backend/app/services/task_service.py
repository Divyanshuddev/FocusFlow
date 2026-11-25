from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate
from app.services.productivity_service import score_task

DEFAULT_IMPORTANCE_BY_PRIORITY = {
    "high": 5,
    "medium": 3,
    "low": 1,
}


def serialize_task(task: Task, now: Optional[datetime] = None) -> TaskResponse:
    smart_score, reasons = score_task(task, now=now)
    return TaskResponse(
        id=task.id,
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        importance=task.importance,
        deadline=task.deadline,
        estimated_duration=task.estimated_duration,
        created_at=task.created_at,
        updated_at=task.updated_at,
        completed_at=task.completed_at,
        smart_score=smart_score,
        recommendation_reasons=reasons,
    )


def get_owned_task(db: Session, user: User, task_id: int) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task


def list_tasks(
    db: Session,
    user: User,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "smart",
) -> TaskListResponse:
    query = db.query(Task).filter(Task.user_id == user.id)

    if status_filter and status_filter != "all":
        query = query.filter(Task.status == status_filter)
    if priority_filter and priority_filter != "all":
        query = query.filter(Task.priority == priority_filter)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(or_(Task.title.ilike(term), Task.description.ilike(term)))

    tasks = query.all()
    now = datetime.now(timezone.utc)
    serialized: List[TaskResponse] = [serialize_task(task, now=now) for task in tasks]

    if sort_by == "deadline":
        serialized.sort(
            key=lambda t: (
                t.status == "completed",
                t.deadline is None,
                t.deadline.timestamp() if t.deadline else float("inf"),
                -(t.smart_score or 0.0),
            )
        )
    elif sort_by == "priority":
        order = {"high": 0, "medium": 1, "low": 2}
        serialized.sort(
            key=lambda t: (t.status == "completed", order.get(t.priority, 1), -(t.smart_score or 0.0))
        )
    elif sort_by == "newest":
        serialized.sort(key=lambda t: t.created_at, reverse=True)
    else:  # smart default
        serialized.sort(
            key=lambda t: (
                t.status == "completed",
                -(t.smart_score or 0.0),
                t.created_at,
            )
        )

    recommended = get_recommended_next_task(db, user, now=now)
    return TaskListResponse(
        items=serialized,
        total=len(serialized),
        recommended_task=recommended,
    )


def get_recommended_next_task(
    db: Session,
    user: User,
    now: Optional[datetime] = None,
) -> Optional[TaskResponse]:
    pending_tasks = (
        db.query(Task)
        .filter(Task.user_id == user.id, Task.status != "completed")
        .all()
    )
    if not pending_tasks:
        return None
    ref = now or datetime.now(timezone.utc)
    scored = [serialize_task(t, now=ref) for t in pending_tasks]
    scored.sort(key=lambda t: (-(t.smart_score or 0.0), t.created_at))
    return scored[0]


def create_task(db: Session, user: User, payload: TaskCreate) -> TaskResponse:
    importance = payload.importance or DEFAULT_IMPORTANCE_BY_PRIORITY.get(payload.priority, 3)
    completed_at = datetime.now(timezone.utc) if payload.status == "completed" else None

    task = Task(
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        priority=payload.priority,
        status=payload.status,
        importance=importance,
        deadline=payload.deadline,
        estimated_duration=payload.estimated_duration,
        completed_at=completed_at,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


def update_task(db: Session, user: User, task_id: int, payload: TaskUpdate) -> TaskResponse:
    task = get_owned_task(db, user, task_id)
    update_data = payload.model_dump(exclude_unset=True)

    if "title" in update_data and update_data["title"] is not None:
        update_data["title"] = update_data["title"].strip()
    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip() or None

    for key, value in update_data.items():
        setattr(task, key, value)

    if "status" in update_data:
        if update_data["status"] == "completed" and not task.completed_at:
            task.completed_at = datetime.now(timezone.utc)
        elif update_data["status"] != "completed":
            task.completed_at = None

    db.commit()
    db.refresh(task)
    return serialize_task(task)


def set_task_completion(
    db: Session,
    user: User,
    task_id: int,
    completed: bool,
) -> TaskResponse:
    task = get_owned_task(db, user, task_id)
    if completed:
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)
    else:
        task.status = "todo"
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return serialize_task(task)


def delete_task(db: Session, user: User, task_id: int) -> None:
    task = get_owned_task(db, user, task_id)
    db.delete(task)
    db.commit()
