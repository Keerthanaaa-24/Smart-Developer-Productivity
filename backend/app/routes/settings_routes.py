from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.services.settings_service import (
    get_full_user_settings,
    update_profile,
    change_password as update_user_password,
    update_appearance,
    update_notifications,
    update_productivity,
    update_privacy,
    delete_user_account,
)

router = APIRouter(
    prefix="/settings",
    tags=["User Settings & Preferences"],
)


# =========================================================
# SCHEMAS
# =========================================================

class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    username: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class UpdateAppearanceRequest(BaseModel):
    theme: str = "light"


class UpdateNotificationsRequest(BaseModel):
    pomodoro_notifications: bool = True
    productivity_reminders: bool = True
    daily_summary: bool = True
    activity_notifications: bool = True
    sound_enabled: bool = True


class UpdateProductivityRequest(BaseModel):
    daily_coding_target_hours: float = 2.0
    daily_learning_target_hours: float = 1.0
    daily_focus_target_minutes: int = 120
    daily_task_target: int = 5
    pomodoro_focus_duration: int = 25
    pomodoro_short_break: int = 5
    pomodoro_long_break: int = 15
    pomodoro_cycle_count: int = 4


class UpdatePrivacyRequest(BaseModel):
    profile_visibility: str = "public"
    analytics_sharing: bool = True
    activity_tracking: bool = True


class DeleteAccountRequest(BaseModel):
    confirmation_text: str


# =========================================================
# ROUTES
# =========================================================

@router.get("/all")
def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_full_user_settings(db, current_user)


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = get_full_user_settings(db, current_user)
    return data["profile"]


@router.put("/profile")
def edit_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = update_profile(
        db=db,
        user=current_user,
        full_name=payload.full_name,
        bio=payload.bio,
        avatar_url=payload.avatar_url,
        username=payload.username,
    )
    return {"message": "Profile updated successfully", "profile": updated}


@router.post("/password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="New password and confirm password do not match",
        )

    result = update_user_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return result


@router.get("/appearance")
def get_appearance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = get_full_user_settings(db, current_user)
    return data["appearance"]


@router.put("/appearance")
def edit_appearance(
    payload: UpdateAppearanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_appearance(db, current_user.id, payload.theme)
    return {"message": "Appearance updated successfully", "appearance": result}


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = get_full_user_settings(db, current_user)
    return data["notifications"]


@router.put("/notifications")
def edit_notifications(
    payload: UpdateNotificationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_notifications(db, current_user.id, payload.dict())
    return {"message": "Notification preferences updated successfully", "notifications": result}


@router.get("/productivity")
def get_productivity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = get_full_user_settings(db, current_user)
    return data["productivity"]


@router.put("/productivity")
def edit_productivity(
    payload: UpdateProductivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_productivity(db, current_user.id, payload.dict())
    return {"message": "Productivity targets updated successfully", "productivity": result}


@router.get("/privacy")
def get_privacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = get_full_user_settings(db, current_user)
    return data["privacy"]


@router.put("/privacy")
def edit_privacy(
    payload: UpdatePrivacyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_privacy(db, current_user.id, payload.dict())
    return {"message": "Privacy settings updated successfully", "privacy": result}


@router.delete("/account")
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = delete_user_account(db, current_user, payload.confirmation_text)
    return result
