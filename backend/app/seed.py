"""Idempotent sample seed data generator for FocusFlow development."""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.daily_goal import DailyGoal
from app.models.distraction import Distraction
from app.models.focus_session import FocusSession
from app.models.task import Task
from app.models.user import User
from app.utils.security import hash_password


def seed_database(db: Session) -> bool:
    """Seed a demo account with tasks, focus history, distractions, and daily goals."""
    demo_email = "demo@focusflow.app"
    existing = db.query(User).filter(User.email == demo_email).first()
    if existing:
        return False

    now = datetime.now(timezone.utc)
    today = now.date()

    user = User(
        name="Alex Rivera",
        email=demo_email,
        hashed_password=hash_password("FocusFlow123!"),
        default_focus_minutes=25,
        default_short_break_minutes=5,
        default_long_break_minutes=15,
        daily_focus_goal_minutes=100,
        notifications_enabled=True,
        theme_preference="dark",
        timezone="UTC",
    )
    db.add(user)
    db.flush()

    tasks = [
        Task(
            user_id=user.id,
            title="Finalize Q4 API Architecture Spec",
            description="Review endpoint contracts, rate-limiting strategy, and schema indexes.",
            priority="high",
            status="in_progress",
            importance=5,
            deadline=now + timedelta(hours=5),
            estimated_duration=25,
        ),
        Task(
            user_id=user.id,
            title="Fix Auth Token Refresh Edge Case",
            description="Ensure concurrent API calls queue behind a single refresh request.",
            priority="high",
            status="todo",
            importance=5,
            deadline=now + timedelta(hours=18),
            estimated_duration=30,
        ),
        Task(
            user_id=user.id,
            title="Prepare Weekly Engineering Demo Deck",
            description="Summarize sprint metrics, focus session completion rate, and next milestones.",
            priority="medium",
            status="todo",
            importance=4,
            deadline=now + timedelta(days=2),
            estimated_duration=45,
        ),
        Task(
            user_id=user.id,
            title="Audit Lighthouse Accessibility & Contrast",
            description="Check dark and light mode color contrast across dashboard widgets.",
            priority="medium",
            status="todo",
            importance=3,
            deadline=now + timedelta(days=4),
            estimated_duration=40,
        ),
        Task(
            user_id=user.id,
            title="Organize Reading List & Research Notes",
            description="Archive old papers and tag database performance benchmarks.",
            priority="low",
            status="todo",
            importance=2,
            deadline=now + timedelta(days=9),
            estimated_duration=25,
        ),
        Task(
            user_id=user.id,
            title="Set Up Alembic Initial Database Schema",
            description="Verify PostgreSQL migration history and foreign key cascades.",
            priority="high",
            status="completed",
            importance=5,
            deadline=now - timedelta(days=1),
            estimated_duration=30,
            completed_at=now - timedelta(hours=3),
        ),
        Task(
            user_id=user.id,
            title="Draft Onboarding Welcome Checklist",
            description="Define default Pomodoro durations and first-run goal prompt.",
            priority="medium",
            status="completed",
            importance=4,
            deadline=now - timedelta(days=2),
            estimated_duration=25,
            completed_at=now - timedelta(days=1, hours=4),
        ),
    ]
    db.add_all(tasks)
    db.flush()

    # Create 10 days of daily goals + focus sessions to build a realistic streak and analytics curve
    session_plan = [
        (0, [25, 25, 25], "completed"),   # Today: 75m so far
        (1, [50, 50], "completed"),       # Yesterday: 100m (goal met)
        (2, [25, 25, 50], "completed"),   # -2d: 100m (goal met)
        (3, [50, 25, 25], "completed"),   # -3d: 100m (goal met)
        (4, [25, 50, 25], "completed"),   # -4d: 100m (goal met)
        (5, [50, 50, 25], "completed"),   # -5d: 125m (goal met -> 5-day streak!)
        (6, [25, 25], "completed"),       # -6d: 50m (break day)
        (7, [50, 50], "completed"),
        (8, [25, 50, 25], "completed"),
        (10, [50, 25], "completed"),
    ]

    first_session_id = None
    for days_ago, blocks, status in session_plan:
        day_date = today - timedelta(days=days_ago)
        db.add(
            DailyGoal(
                user_id=user.id,
                target_focus_minutes=100,
                goal_date=day_date,
            )
        )
        base_dt = datetime(day_date.year, day_date.month, day_date.day, 9, 30, tzinfo=timezone.utc)
        for idx, mins in enumerate(blocks):
            start_dt = base_dt + timedelta(hours=idx * 2)
            end_dt = start_dt + timedelta(minutes=mins)
            sess = FocusSession(
                user_id=user.id,
                task_id=tasks[idx % len(tasks)].id,
                session_type="focus",
                planned_duration=mins,
                start_time=start_dt,
                end_time=end_dt,
                duration=mins,
                duration_seconds=mins * 60,
                status=status,
                ambient_sound="rain" if idx % 2 == 0 else "lofi",
            )
            db.add(sess)
            db.flush()
            if first_session_id is None:
                first_session_id = sess.id

    # One cancelled/interrupted session for realistic completion rate (<100%)
    db.add(
        FocusSession(
            user_id=user.id,
            task_id=tasks[1].id,
            session_type="focus",
            planned_duration=25,
            start_time=now - timedelta(days=2, hours=5),
            end_time=now - timedelta(days=2, hours=4, minutes=50),
            duration=10,
            duration_seconds=600,
            status="interrupted",
            ambient_sound="none",
        )
    )

    distractions = [
        Distraction(
            user_id=user.id,
            focus_session_id=first_session_id,
            category="notifications",
            description="Urgent Slack thread pinged during architecture review",
            duration=6,
            created_at=now - timedelta(hours=2),
        ),
        Distraction(
            user_id=user.id,
            category="social_media",
            description="Checked tech feed between test runs",
            duration=12,
            created_at=now - timedelta(days=1, hours=3),
        ),
        Distraction(
            user_id=user.id,
            category="notifications",
            description="Calendar and email popups during morning sprint",
            duration=8,
            created_at=now - timedelta(days=2, hours=2),
        ),
        Distraction(
            user_id=user.id,
            category="multitasking",
            description="Switched to reviewing PR comments mid-session",
            duration=15,
            created_at=now - timedelta(days=3, hours=4),
        ),
        Distraction(
            user_id=user.id,
            category="entertainment",
            description="Watched short dev talk clip during break overflow",
            duration=10,
            created_at=now - timedelta(days=4, hours=6),
        ),
    ]
    db.add_all(distractions)
    db.commit()
    return True


if __name__ == "__main__":
    session = SessionLocal()
    try:
        created = seed_database(session)
        if created:
            print("Seeded FocusFlow demo data (demo@focusflow.app / FocusFlow123!).")
        else:
            print("Demo data already present; skipping seed.")
    finally:
        session.close()
