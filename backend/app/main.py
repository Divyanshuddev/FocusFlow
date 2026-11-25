from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import analytics, auth, distractions, focus, goals, tasks, users

settings = get_settings()

app = FastAPI(
    title="FocusFlow – Smart Focus Mode API",
    description=(
        "REST API for FocusFlow: authentication, smart task prioritization, "
        "Pomodoro focus sessions, manual distraction logging, daily goals, and analytics."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(focus.router)
app.include_router(distractions.router)
app.include_router(analytics.router)
app.include_router(goals.router)


@app.get("/", tags=["System"])
def root() -> dict[str, str]:
    """Root metadata endpoint."""
    return {
        "service": settings.APP_NAME,
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Liveness health endpoint."""
    return {"status": "ok", "service": "focusflow-api"}
