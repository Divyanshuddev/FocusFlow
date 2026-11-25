from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_database  # noqa: E402


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test_focusflow.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _register_and_headers(test_client: TestClient, email: str, name: str = "Test User"):
    resp = test_client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": "Password123!"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data


def test_auth_lifecycle_and_password_reset(client):
    test_client, _ = client

    # Unauthenticated blocked
    assert test_client.get("/api/auth/me").status_code == 401
    assert test_client.get("/api/tasks").status_code == 401

    headers, reg_data = _register_and_headers(test_client, "alex@example.com", "Alex")
    assert reg_data["user"]["email"] == "alex@example.com"

    # Duplicate email conflict
    dup = test_client.post(
        "/api/auth/register",
        json={"name": "Alex2", "email": "alex@example.com", "password": "Password123!"},
    )
    assert dup.status_code == 409

    # Login and refresh
    login_resp = test_client.post(
        "/api/auth/login",
        json={"email": "alex@example.com", "password": "Password123!"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    refreshed = test_client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    # Forgot + reset password
    forgot = test_client.post("/api/auth/forgot-password", json={"email": "alex@example.com"})
    assert forgot.status_code == 200
    token_preview = forgot.json()["reset_token_preview"]
    assert token_preview

    reset = test_client.post(
        "/api/auth/reset-password",
        json={"token": token_preview, "new_password": "NewPassword456!"},
    )
    assert reset.status_code == 200

    # Old password fails, new password works
    assert (
        test_client.post(
            "/api/auth/login",
            json={"email": "alex@example.com", "password": "Password123!"},
        ).status_code
        == 401
    )
    assert (
        test_client.post(
            "/api/auth/login",
            json={"email": "alex@example.com", "password": "NewPassword456!"},
        ).status_code
        == 200
    )

    me = test_client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200


def test_tasks_crud_smart_recommendation_and_ownership(client):
    test_client, _ = client
    headers_a, _ = _register_and_headers(test_client, "usera@example.com", "User A")
    headers_b, _ = _register_and_headers(test_client, "userb@example.com", "User B")

    now = datetime.now(timezone.utc)
    t_low = test_client.post(
        "/api/tasks",
        headers=headers_a,
        json={
            "title": "Low priority backlog",
            "priority": "low",
            "estimated_duration": 120,
            "deadline": (now + timedelta(days=10)).isoformat(),
        },
    ).json()
    t_urgent = test_client.post(
        "/api/tasks",
        headers=headers_a,
        json={
            "title": "Ship hotfix before standup",
            "description": "Critical bugfix",
            "priority": "high",
            "importance": 5,
            "estimated_duration": 25,
            "deadline": (now + timedelta(hours=3)).isoformat(),
        },
    ).json()

    # Recommended should pick the urgent high-priority quick win
    rec = test_client.get("/api/tasks/recommended", headers=headers_a)
    assert rec.status_code == 200
    assert rec.json()["id"] == t_urgent["id"]
    assert rec.json()["smart_score"] > t_low["smart_score"]

    # Ownership check: User B cannot view, update, or delete User A's task
    assert test_client.get(f"/api/tasks/{t_urgent['id']}", headers=headers_b).status_code == 404
    assert (
        test_client.put(
            f"/api/tasks/{t_urgent['id']}",
            headers=headers_b,
            json={"title": "Hacked"},
        ).status_code
        == 404
    )
    assert test_client.delete(f"/api/tasks/{t_urgent['id']}", headers=headers_b).status_code == 404

    # Filter & search
    filtered = test_client.get("/api/tasks?priority=high&search=hotfix", headers=headers_a).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["id"] == t_urgent["id"]

    # Complete task
    comp = test_client.patch(f"/api/tasks/{t_urgent['id']}/complete", headers=headers_a)
    assert comp.status_code == 200
    assert comp.json()["status"] == "completed"
    assert comp.json()["completed_at"] is not None

    # Recommended now falls back to t_low
    rec2 = test_client.get("/api/tasks/recommended", headers=headers_a).json()
    assert rec2["id"] == t_low["id"]


def test_focus_sessions_distractions_analytics_and_goals(client):
    test_client, session_factory = client
    headers, _ = _register_and_headers(test_client, "focus@example.com", "Focus User")

    # Create task
    task = test_client.post(
        "/api/tasks",
        headers=headers,
        json={"title": "Deep Work Sprint", "priority": "high", "estimated_duration": 25},
    ).json()

    # Set daily goal to 25 minutes so completing 1 session builds a 1-day streak
    goal_resp = test_client.post(
        "/api/goals",
        headers=headers,
        json={"target_focus_minutes": 25},
    )
    assert goal_resp.status_code == 201
    goal_id = goal_resp.json()["id"]

    # Start focus session
    start_resp = test_client.post(
        "/api/focus/start",
        headers=headers,
        json={"task_id": task["id"], "session_type": "focus", "planned_duration": 25, "ambient_sound": "rain"},
    )
    assert start_resp.status_code == 201
    session_id = start_resp.json()["id"]

    # Active session present
    active = test_client.get("/api/focus/active", headers=headers).json()
    assert active["id"] == session_id

    # Complete session and mark linked task completed
    complete_resp = test_client.post(
        "/api/focus/complete",
        headers=headers,
        json={"session_id": session_id, "duration": 25, "status": "completed", "task_completed": True},
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"

    # Linked task is now completed
    refetched_task = test_client.get(f"/api/tasks/{task['id']}", headers=headers).json()
    assert refetched_task["status"] == "completed"

    # Log distraction
    d_resp = test_client.post(
        "/api/distractions",
        headers=headers,
        json={"category": "notifications", "description": "Slack ping", "duration": 5, "focus_session_id": session_id},
    )
    assert d_resp.status_code == 201
    d_id = d_resp.json()["id"]

    d_summary = test_client.get("/api/distractions?range=today", headers=headers).json()
    assert d_summary["today_count"] == 1
    assert d_summary["most_common_category"] == "notifications"

    # Analytics reflect real data
    daily = test_client.get("/api/analytics/daily", headers=headers).json()
    assert daily["focus_minutes"] == 25
    assert daily["completed_tasks_today"] == 1
    assert daily["current_streak"] == 1
    assert daily["productivity_score"] > 50

    weekly = test_client.get("/api/analytics/weekly", headers=headers).json()
    assert weekly["total_focus_minutes"] == 25
    assert len(weekly["daily_series"]) == 7

    monthly = test_client.get("/api/analytics/monthly", headers=headers).json()
    assert monthly["total_focus_minutes"] == 25
    assert monthly["completed_tasks"] == 1

    # Update goal
    upd_goal = test_client.put(f"/api/goals/{goal_id}", headers=headers, json={"target_focus_minutes": 50})
    assert upd_goal.status_code == 200
    assert upd_goal.json()["target_focus_minutes"] == 50

    goals_overview = test_client.get("/api/goals", headers=headers).json()
    assert len(goals_overview["calendar"]) == 35

    # Delete distraction
    assert test_client.delete(f"/api/distractions/{d_id}", headers=headers).status_code == 204

    # Seed helper is idempotent
    with session_factory() as db:
        assert seed_database(db) is True
        assert seed_database(db) is False


def test_production_settings_and_root_route(client):
    from app.config import Settings

    test_client, _ = client
    root_resp = test_client.get("/")
    assert root_resp.status_code == 200
    assert root_resp.json()["status"] == "ok"

    # Render postgres:// and trailing slash normalization
    prod_settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgres://user:pass@dpg-123.render.com/focusflow",
        SECRET_KEY="a-strong-production-secret-value-for-testing",
        CORS_ORIGINS="https://focusflow.vercel.app/ , http://localhost:3000/",
        FRONTEND_URL="https://focusflow-prod.vercel.app/",
    )
    assert prod_settings.DATABASE_URL == "postgresql+psycopg2://user:pass@dpg-123.render.com/focusflow"
    assert prod_settings.FRONTEND_URL == "https://focusflow-prod.vercel.app"
    assert "https://focusflow.vercel.app" in prod_settings.cors_origins_list
    assert "https://focusflow-prod.vercel.app" in prod_settings.cors_origins_list

    with pytest.raises(ValueError):
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql://user:pass@localhost/db",
            SECRET_KEY="change-this-placeholder",
        )

