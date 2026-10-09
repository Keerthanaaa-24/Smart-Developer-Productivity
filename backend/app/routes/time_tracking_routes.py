"""
Time Tracking Routes
Provides authenticated API endpoints for Browser Extension sync,
active time metrics calculation, platform breakdown, and user telemetry settings.
"""

from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.browser_time_session import BrowserTimeSession
from app.models.developer_activity import DeveloperActivity
from app.services.time_tracking_service import (
    time_tracking_service,
    SUPPORTED_PLATFORMS_MAP,
)


router = APIRouter(
    prefix="/time-tracking",
    tags=["Browser Time Tracking Engine"],
)


# =========================================================
# SCHEMAS
# =========================================================

class SessionSyncItem(BaseModel):
    platform: str
    domain: Optional[str] = None
    started_at: datetime
    ended_at: datetime
    active_seconds: int = Field(..., ge=0, description="Active measured seconds excluding idle")
    idle_seconds: int = Field(default=0, ge=0, description="Excluded idle seconds")
    session_key: Optional[str] = None
    source: Optional[str] = "browser_extension"


class SessionBatchSyncRequest(BaseModel):
    sessions: List[SessionSyncItem] = Field(..., max_items=100)


class UpdateTimeTrackingSettingsRequest(BaseModel):
    browser_extension_enabled: Optional[bool] = None
    idle_threshold_seconds: Optional[int] = Field(None, ge=15, le=600)
    auto_sync_interval_seconds: Optional[int] = Field(None, ge=15, le=300)
    activity_tracking: Optional[bool] = None


# =========================================================
# ROUTES
# =========================================================

@router.get("/platforms")
def get_supported_platforms():
    """
    Returns the list of supported productivity platforms, categories, and monitored domains.
    Only whitelisted domains will ever be tracked.
    """
    return {
        "count": len(SUPPORTED_PLATFORMS_MAP),
        "platforms": time_tracking_service.get_supported_platforms(),
    }


@router.post("/sessions/sync")
def sync_browser_sessions(
    payload: SessionBatchSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Idempotent batch upload of browser active-time sessions.
    Validates server-side duration constraints, deduplicates using session_key,
    and updates both granular browser time tables and the unified activity timeline.
    """
    if not payload.sessions:
        return {
            "status": "success",
            "message": "No sessions provided to sync.",
            "synced_count": 0,
            "total_active_seconds": 0,
            "sessions": [],
        }

    raw_sessions = [item.dict() for item in payload.sessions]
    result = time_tracking_service.sync_browser_sessions(
        db=db,
        user_id=current_user.id,
        sessions=raw_sessions,
    )
    return result


@router.get("/summary")
def get_time_tracking_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns computed active website time analytics:
    Today's time by platform, weekly distributions, monthly totals,
    most-used platform, and daily goals progress.
    """
    return time_tracking_service.get_time_tracking_summary(
        db=db,
        user_id=current_user.id,
    )


@router.get("/sessions")
def get_time_tracking_sessions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = Query(None),
    date_filter: Optional[date] = Query(None, alias="date"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns paginated list of recorded active-time sessions for the authenticated user,
    with optional filtering by platform and date range.
    """
    return time_tracking_service.get_time_tracking_sessions(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        platform=platform,
        date_filter=date_filter,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/settings")
def get_time_tracking_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns the user's tracking preferences and idle detection configuration.
    """
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return {
        "user_id": current_user.id,
        "browser_extension_enabled": getattr(settings, "browser_extension_enabled", True),
        "activity_tracking": getattr(settings, "activity_tracking", True),
        "idle_threshold_seconds": getattr(settings, "idle_threshold_seconds", 60),
        "auto_sync_interval_seconds": getattr(settings, "auto_sync_interval_seconds", 60),
        "daily_coding_target_hours": getattr(settings, "daily_coding_target_hours", 2.0),
        "daily_learning_target_hours": getattr(settings, "daily_learning_target_hours", 1.0),
    }


@router.post("/settings")
def update_time_tracking_settings(
    payload: UpdateTimeTrackingSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates user's browser extension telemetry preferences (e.g., opt-in/opt-out, idle threshold).
    """
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    if payload.browser_extension_enabled is not None:
        settings.browser_extension_enabled = payload.browser_extension_enabled
    if payload.activity_tracking is not None:
        settings.activity_tracking = payload.activity_tracking
    if payload.idle_threshold_seconds is not None:
        settings.idle_threshold_seconds = payload.idle_threshold_seconds
    if payload.auto_sync_interval_seconds is not None:
        settings.auto_sync_interval_seconds = payload.auto_sync_interval_seconds

    db.commit()
    db.refresh(settings)

    return {
        "status": "success",
        "message": "Time tracking settings updated successfully.",
        "settings": {
            "browser_extension_enabled": settings.browser_extension_enabled,
            "activity_tracking": settings.activity_tracking,
            "idle_threshold_seconds": settings.idle_threshold_seconds,
            "auto_sync_interval_seconds": settings.auto_sync_interval_seconds,
        },
    }


@router.delete("/history")
def purge_time_tracking_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Privacy control: Clears all browser time tracking session records for the current user.
    """
    deleted_sessions = (
        db.query(BrowserTimeSession)
        .filter(BrowserTimeSession.user_id == current_user.id)
        .delete(synchronize_session=False)
    )

    # Also remove corresponding browser_extension unified activities
    deleted_activities = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == current_user.id,
            DeveloperActivity.source == "browser_extension",
        )
        .delete(synchronize_session=False)
    )

    db.commit()

    return {
        "status": "success",
        "message": f"Purged {deleted_sessions} browser session(s) and {deleted_activities} timeline activity item(s).",
        "deleted_sessions_count": deleted_sessions,
    }
