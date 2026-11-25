from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    default_focus_minutes: Optional[int] = Field(default=None, ge=5, le=180)
    default_short_break_minutes: Optional[int] = Field(default=None, ge=1, le=60)
    default_long_break_minutes: Optional[int] = Field(default=None, ge=5, le=90)
    daily_focus_goal_minutes: Optional[int] = Field(default=None, ge=15, le=720)
    notifications_enabled: Optional[bool] = None
    theme_preference: Optional[Literal["dark", "light"]] = None
    timezone: Optional[str] = Field(default=None, min_length=1, max_length=64)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token_preview: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    default_focus_minutes: int
    default_short_break_minutes: int
    default_long_break_minutes: int
    daily_focus_goal_minutes: int
    notifications_enabled: bool
    theme_preference: str
    timezone: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str
