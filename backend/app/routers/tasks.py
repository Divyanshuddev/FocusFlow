from typing import Optional

from fastapi import APIRouter, Body, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.task import (
    TaskCompleteRequest,
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskUpdate,
)
from app.services import task_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=TaskListResponse)
def list_tasks(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    priority: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="smart"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskListResponse:
    """List tasks for the current user with filtering, search, and smart priority scoring."""
    return task_service.list_tasks(
        db=db,
        user=current_user,
        status_filter=status_filter,
        priority_filter=priority,
        search=search,
        sort_by=sort_by,
    )


@router.get("/recommended", response_model=Optional[TaskResponse])
def get_recommended_task(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Optional[TaskResponse]:
    """Return the recommended 'Focus Next' task for the authenticated user."""
    return task_service.get_recommended_next_task(db, current_user)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Create a new task."""
    return task_service.create_task(db, current_user, payload)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Retrieve a single task owned by the authenticated user."""
    task = task_service.get_owned_task(db, current_user, task_id)
    return task_service.serialize_task(task)


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Update an existing task owned by the authenticated user."""
    return task_service.update_task(db, current_user, task_id, payload)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Delete a task owned by the authenticated user."""
    task_service.delete_task(db, current_user, task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    payload: Optional[TaskCompleteRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskResponse:
    """Mark a task as completed or reopen it."""
    completed = payload.completed if payload is not None else True
    return task_service.set_task_completion(db, current_user, task_id, completed=completed)
