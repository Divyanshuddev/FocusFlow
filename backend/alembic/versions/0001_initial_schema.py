"""Initial FocusFlow schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-25 16:40:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("default_focus_minutes", sa.Integer(), server_default="25", nullable=False),
        sa.Column("default_short_break_minutes", sa.Integer(), server_default="5", nullable=False),
        sa.Column("default_long_break_minutes", sa.Integer(), server_default="15", nullable=False),
        sa.Column("daily_focus_goal_minutes", sa.Integer(), server_default="120", nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("theme_preference", sa.String(length=16), server_default="dark", nullable=False),
        sa.Column("timezone", sa.String(length=64), server_default="UTC", nullable=False),
        sa.Column("reset_token_hash", sa.String(length=128), nullable=True),
        sa.Column("reset_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=16), server_default="medium", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="todo", nullable=False),
        sa.Column("importance", sa.Integer(), server_default="3", nullable=False),
        sa.Column("deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estimated_duration", sa.Integer(), server_default="25", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("priority IN ('high', 'medium', 'low')", name="ck_tasks_priority"),
        sa.CheckConstraint("status IN ('todo', 'in_progress', 'completed')", name="ck_tasks_status"),
        sa.CheckConstraint("estimated_duration > 0", name="ck_tasks_estimated_duration"),
        sa.CheckConstraint("importance >= 1 AND importance <= 5", name="ck_tasks_importance"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_id", "tasks", ["id"], unique=False)
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"], unique=False)
    op.create_index("ix_tasks_user_status_priority", "tasks", ["user_id", "status", "priority"], unique=False)
    op.create_index("ix_tasks_user_deadline", "tasks", ["user_id", "deadline"], unique=False)

    op.create_table(
        "focus_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("session_type", sa.String(length=20), server_default="focus", nullable=False),
        sa.Column("planned_duration", sa.Integer(), server_default="25", nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration", sa.Integer(), server_default="0", nullable=False),
        sa.Column("duration_seconds", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("ambient_sound", sa.String(length=32), nullable=True),
        sa.CheckConstraint(
            "session_type IN ('focus', 'short_break', 'long_break')",
            name="ck_focus_sessions_type",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'paused', 'completed', 'cancelled', 'interrupted')",
            name="ck_focus_sessions_status",
        ),
        sa.CheckConstraint("planned_duration > 0", name="ck_focus_sessions_planned_duration"),
        sa.CheckConstraint("duration >= 0", name="ck_focus_sessions_duration"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_focus_sessions_id", "focus_sessions", ["id"], unique=False)
    op.create_index("ix_focus_sessions_user_id", "focus_sessions", ["user_id"], unique=False)
    op.create_index("ix_focus_sessions_task_id", "focus_sessions", ["task_id"], unique=False)
    op.create_index("ix_focus_sessions_user_start", "focus_sessions", ["user_id", "start_time"], unique=False)
    op.create_index("ix_focus_sessions_user_status", "focus_sessions", ["user_id", "status"], unique=False)

    op.create_table(
        "distractions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("focus_session_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "category IN ('social_media', 'entertainment', 'notifications', 'multitasking', 'other')",
            name="ck_distractions_category",
        ),
        sa.CheckConstraint("duration > 0", name="ck_distractions_duration"),
        sa.ForeignKeyConstraint(["focus_session_id"], ["focus_sessions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_distractions_id", "distractions", ["id"], unique=False)
    op.create_index("ix_distractions_user_id", "distractions", ["user_id"], unique=False)
    op.create_index("ix_distractions_focus_session_id", "distractions", ["focus_session_id"], unique=False)
    op.create_index("ix_distractions_user_created", "distractions", ["user_id", "created_at"], unique=False)
    op.create_index("ix_distractions_user_category", "distractions", ["user_id", "category"], unique=False)

    op.create_table(
        "daily_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("target_focus_minutes", sa.Integer(), server_default="120", nullable=False),
        sa.Column("goal_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("target_focus_minutes > 0", name="ck_daily_goals_target_minutes"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "goal_date", name="uq_daily_goals_user_date"),
    )
    op.create_index("ix_daily_goals_id", "daily_goals", ["id"], unique=False)
    op.create_index("ix_daily_goals_user_id", "daily_goals", ["user_id"], unique=False)
    op.create_index("ix_daily_goals_goal_date", "daily_goals", ["goal_date"], unique=False)


def downgrade() -> None:
    op.drop_table("daily_goals")
    op.drop_table("distractions")
    op.drop_table("focus_sessions")
    op.drop_table("tasks")
    op.drop_table("users")
