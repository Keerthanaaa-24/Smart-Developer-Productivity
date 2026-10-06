from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.task import Task
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection
from app.models.linkedin_connection import LinkedInConnection
from app.core.security import verify_password, hash_password
from app.core.cache import user_cache


def get_or_create_user_settings(db: Session, user_id: int) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        settings = UserSettings(
            user_id=user_id,
            full_name="",
            bio="",
            avatar_url="",
            theme="light",
            pomodoro_notifications=True,
            productivity_reminders=True,
            daily_summary=True,
            activity_notifications=True,
            sound_enabled=True,
            daily_coding_target_hours=2.0,
            daily_learning_target_hours=1.0,
            daily_focus_target_minutes=120,
            daily_task_target=5,
            pomodoro_focus_duration=25,
            pomodoro_short_break=5,
            pomodoro_long_break=15,
            pomodoro_cycle_count=4,
            profile_visibility="public",
            analytics_sharing=True,
            activity_tracking=True,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_full_user_settings(db: Session, user: User) -> dict:
    settings = get_or_create_user_settings(db, user.id)

    return {
        "profile": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": settings.full_name or "",
            "bio": settings.bio or "",
            "avatar_url": settings.avatar_url or "",
        },
        "appearance": {
            "theme": settings.theme or "light",
        },
        "notifications": {
            "pomodoro_notifications": bool(settings.pomodoro_notifications),
            "productivity_reminders": bool(settings.productivity_reminders),
            "daily_summary": bool(settings.daily_summary),
            "activity_notifications": bool(settings.activity_notifications),
            "sound_enabled": bool(settings.sound_enabled),
        },
        "productivity": {
            "daily_coding_target_hours": float(settings.daily_coding_target_hours or 2.0),
            "daily_learning_target_hours": float(settings.daily_learning_target_hours or 1.0),
            "daily_focus_target_minutes": int(settings.daily_focus_target_minutes or 120),
            "daily_task_target": int(settings.daily_task_target or 5),
            "pomodoro_focus_duration": int(settings.pomodoro_focus_duration or 25),
            "pomodoro_short_break": int(settings.pomodoro_short_break or 5),
            "pomodoro_long_break": int(settings.pomodoro_long_break or 15),
            "pomodoro_cycle_count": int(settings.pomodoro_cycle_count or 4),
        },
        "privacy": {
            "profile_visibility": settings.profile_visibility or "public",
            "analytics_sharing": bool(settings.analytics_sharing),
            "activity_tracking": bool(settings.activity_tracking),
        },
    }


def update_profile(
    db: Session,
    user: User,
    full_name: str | None = None,
    bio: str | None = None,
    avatar_url: str | None = None,
    username: str | None = None,
) -> dict:
    # 1. Update username if provided and changed
    if username and username.strip() and username.strip() != user.username:
        clean_user = username.strip()
        existing = db.query(User).filter(User.username == clean_user, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username is already taken by another user")
        user.username = clean_user

    # 2. Update settings fields
    settings = get_or_create_user_settings(db, user.id)
    if full_name is not None:
        settings.full_name = full_name.strip()
    if bio is not None:
        settings.bio = bio.strip()
    if avatar_url is not None:
        settings.avatar_url = avatar_url.strip()

    db.commit()
    db.refresh(user)
    db.refresh(settings)

    # Invalidate user cache on profile update
    user_cache.invalidate_user(user.id)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": settings.full_name,
        "bio": settings.bio,
        "avatar_url": settings.avatar_url,
    }


def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> dict:
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new passwords are required")

    if not verify_password(current_password, user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    if verify_password(new_password, user.password):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    user.password = hash_password(new_password)
    db.commit()

    # Invalidate cache
    user_cache.invalidate_user(user.id)

    return {"message": "Password updated successfully"}


def update_appearance(db: Session, user_id: int, theme: str) -> dict:
    if theme not in ("light", "dark", "system"):
        theme = "light"

    settings = get_or_create_user_settings(db, user_id)
    settings.theme = theme
    db.commit()
    db.refresh(settings)

    user_cache.invalidate_user(user_id)

    return {"theme": settings.theme}


def update_notifications(db: Session, user_id: int, payload: dict) -> dict:
    settings = get_or_create_user_settings(db, user_id)

    if "pomodoro_notifications" in payload:
        settings.pomodoro_notifications = bool(payload["pomodoro_notifications"])
    if "productivity_reminders" in payload:
        settings.productivity_reminders = bool(payload["productivity_reminders"])
    if "daily_summary" in payload:
        settings.daily_summary = bool(payload["daily_summary"])
    if "activity_notifications" in payload:
        settings.activity_notifications = bool(payload["activity_notifications"])
    if "sound_enabled" in payload:
        settings.sound_enabled = bool(payload["sound_enabled"])

    db.commit()
    db.refresh(settings)

    user_cache.invalidate_user(user_id)

    return {
        "pomodoro_notifications": settings.pomodoro_notifications,
        "productivity_reminders": settings.productivity_reminders,
        "daily_summary": settings.daily_summary,
        "activity_notifications": settings.activity_notifications,
        "sound_enabled": settings.sound_enabled,
    }


def update_productivity(db: Session, user_id: int, payload: dict) -> dict:
    settings = get_or_create_user_settings(db, user_id)

    if "daily_coding_target_hours" in payload:
        settings.daily_coding_target_hours = max(0.5, min(16.0, float(payload["daily_coding_target_hours"])))
    if "daily_learning_target_hours" in payload:
        settings.daily_learning_target_hours = max(0.5, min(12.0, float(payload["daily_learning_target_hours"])))
    if "daily_focus_target_minutes" in payload:
        settings.daily_focus_target_minutes = max(15, min(720, int(payload["daily_focus_target_minutes"])))
    if "daily_task_target" in payload:
        settings.daily_task_target = max(1, min(50, int(payload["daily_task_target"])))
    if "pomodoro_focus_duration" in payload:
        settings.pomodoro_focus_duration = max(5, min(120, int(payload["pomodoro_focus_duration"])))
    if "pomodoro_short_break" in payload:
        settings.pomodoro_short_break = max(1, min(30, int(payload["pomodoro_short_break"])))
    if "pomodoro_long_break" in payload:
        settings.pomodoro_long_break = max(5, min(60, int(payload["pomodoro_long_break"])))
    if "pomodoro_cycle_count" in payload:
        settings.pomodoro_cycle_count = max(1, min(12, int(payload["pomodoro_cycle_count"])))

    db.commit()
    db.refresh(settings)

    user_cache.invalidate_user(user_id)

    return {
        "daily_coding_target_hours": settings.daily_coding_target_hours,
        "daily_learning_target_hours": settings.daily_learning_target_hours,
        "daily_focus_target_minutes": settings.daily_focus_target_minutes,
        "daily_task_target": settings.daily_task_target,
        "pomodoro_focus_duration": settings.pomodoro_focus_duration,
        "pomodoro_short_break": settings.pomodoro_short_break,
        "pomodoro_long_break": settings.pomodoro_long_break,
        "pomodoro_cycle_count": settings.pomodoro_cycle_count,
    }


def update_privacy(db: Session, user_id: int, payload: dict) -> dict:
    settings = get_or_create_user_settings(db, user_id)

    if "profile_visibility" in payload:
        settings.profile_visibility = "public" if payload["profile_visibility"] == "public" else "private"
    if "analytics_sharing" in payload:
        settings.analytics_sharing = bool(payload["analytics_sharing"])
    if "activity_tracking" in payload:
        settings.activity_tracking = bool(payload["activity_tracking"])

    db.commit()
    db.refresh(settings)

    user_cache.invalidate_user(user_id)

    return {
        "profile_visibility": settings.profile_visibility,
        "analytics_sharing": settings.analytics_sharing,
        "activity_tracking": settings.activity_tracking,
    }


def delete_user_account(db: Session, user: User, confirmation_text: str) -> dict:
    if confirmation_text.strip().lower() != "delete my account":
        raise HTTPException(
            status_code=400,
            detail="Confirmation string must exactly match 'delete my account'",
        )

    user_id = user.id

    # 1. Clean up user connections & resources explicitly
    db.query(UserSettings).filter(UserSettings.user_id == user_id).delete(synchronize_session=False)
    db.query(Task).filter(Task.user_id == user_id).delete(synchronize_session=False)
    db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_id).delete(synchronize_session=False)
    db.query(PomodoroSession).filter(PomodoroSession.user_id == user_id).delete(synchronize_session=False)
    db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).delete(synchronize_session=False)

    # 2. Delete user
    db.delete(user)
    db.commit()

    user_cache.invalidate_user(user_id)

    return {"message": "Account and all associated records permanently deleted."}

