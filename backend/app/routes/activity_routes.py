from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user

from app.models.user import User
from app.models.developer_activity import DeveloperActivity


router = APIRouter(
    prefix="/developer-activity",
    tags=["Developer Activity"],
)


# =========================================================
# START ACTIVITY
# =========================================================

@router.post("/start")
def start_activity(
    platform: str,
    activity_type: str = "Practice",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    existing = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == current_user.id,
            DeveloperActivity.ended_at.is_(None),
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="An activity session is already running.",
        )

    now = datetime.utcnow()

    activity = DeveloperActivity(
        user_id=current_user.id,
        platform=platform.strip().lower(),
        activity_type=activity_type,
        activity_date=now.date(),
        message=f"Started {activity_type} on {platform}",
        details="Developer activity session",
        started_at=now,
        duration_seconds=0,
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    return {
        "success": True,
        "activity_id": activity.id,
        "platform": activity.platform,
        "activity_type": activity.activity_type,
        "started_at": activity.started_at,
    }


# =========================================================
# STOP ACTIVITY
# =========================================================

@router.post("/stop/{activity_id}")
def stop_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    activity = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.id == activity_id,
            DeveloperActivity.user_id == current_user.id,
        )
        .first()
    )

    if not activity:
        raise HTTPException(
            status_code=404,
            detail="Activity session not found.",
        )

    if activity.ended_at:

        return {
            "success": True,
            "message": "Activity already completed.",
            "duration_seconds":
                activity.duration_seconds,
        }

    activity.ended_at = datetime.utcnow()

    duration = (
        activity.ended_at -
        activity.started_at
    ).total_seconds()

    activity.duration_seconds = max(
        0,
        int(duration),
    )

    activity.message = (
        f"Completed {activity.activity_type} "
        f"on {activity.platform}"
    )

    activity.details = (
        f"Duration: "
        f"{activity.duration_seconds // 60} minutes"
    )

    db.commit()
    db.refresh(activity)

    return {
        "success": True,
        "activity_id": activity.id,
        "platform": activity.platform,
        "activity_type": activity.activity_type,
        "duration_seconds":
            activity.duration_seconds,
    }


# =========================================================
# RECENT ACTIVITIES
# =========================================================

@router.get("/recent")
def recent_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    activities = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == current_user.id,
        )
        .order_by(
            DeveloperActivity.created_at.desc()
        )
        .limit(20)
        .all()
    )

    result = []

    for activity in activities:

        time_ago = "Recently"

        if activity.created_at:

            seconds = (
                datetime.utcnow() -
                activity.created_at
            ).total_seconds()

            if seconds < 60:
                time_ago = "Just now"

            elif seconds < 3600:
                minutes = int(
                    seconds / 60
                )
                time_ago = (
                    f"{minutes} min ago"
                )

            elif seconds < 86400:
                hours = int(
                    seconds / 3600
                )
                time_ago = (
                    f"{hours} hr ago"
                )

            else:
                days = int(
                    seconds / 86400
                )
                time_ago = (
                    f"{days} day ago"
                    if days == 1
                    else f"{days} days ago"
                )

        result.append({
            "id": activity.id,
            "platform": activity.platform,
            "activity_type":
                activity.activity_type,
            "message":
                activity.message,
            "details":
                activity.details,
            "started_at":
                activity.started_at,
            "ended_at":
                activity.ended_at,
            "duration_seconds":
                activity.duration_seconds,
            "time_ago":
                time_ago,
        })

    return {
        "activities": result
    }