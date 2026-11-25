from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth_service import (
    authenticate_user,
    complete_password_reset,
    get_current_user,
    initiate_forgot_password,
    refresh_user_tokens,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> TokenResponse:
    """Register a new FocusFlow account and return JWT access/refresh tokens."""
    return register_user(db, payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate an existing user by email and password."""
    return authenticate_user(db, payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Exchange a valid refresh token for new access and refresh tokens."""
    return refresh_user_tokens(db, payload.refresh_token)


@router.get("/me", response_model=UserResponse)
def read_auth_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    """Initiate a password reset request."""
    return initiate_forgot_password(db, payload.email)


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    """Complete password reset using a valid reset token."""
    complete_password_reset(db, payload.token, payload.new_password)
    return {"message": "Password has been reset successfully"}


@router.post("/logout")
def logout(_current_user: User = Depends(get_current_user)) -> dict[str, str]:
    """Acknowledge client-side session logout."""
    return {"message": "Logged out successfully"}
