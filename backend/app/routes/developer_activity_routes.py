from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user

from app.models.user import User

from app.services.developer_streak_service import (
    record_activity,
    get_developer_streak,
)


router = APIRouter(
    prefix="/developer-activity",
    tags=["Developer Activity"],
)


# =========================================================
# ALLOWED PLATFORMS
# =========================================================

ALLOWED_PLATFORMS = {
    "github",
    "leetcode",
    "geeksforgeeks",
    "freecodecamp",
    "nptel",
    "coursera",
    "linkedin",
    "naukri",
    "vscode",
    "pomodoro",
    "tasks",
}


# =========================================================
# RECORD PLATFORM ACTIVITY
# =========================================================

@router.post("/record/{platform}")
def record_platform_activity(
    platform: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    platform = platform.lower().strip()

    if platform not in ALLOWED_PLATFORMS:

        raise HTTPException(
            status_code=400,
            detail="Invalid developer platform",
        )

    record_activity(
        db=db,
        user_id=current_user.id,
        platform=platform,
        activity_type="platform_activity",
        activity_count=1,
    )

    return {
        "success": True,
        "platform": platform,
        "message": (
            f"{platform} activity recorded "
            "for today"
        ),
    }


@router.get("/streak")
def developer_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    return get_developer_streak(
        db=db,
        user_id=current_user.id,
    )


# =========================================================
# GET RECENT DEVELOPER ACTIVITY
# =========================================================

@router.get("/recent")
def developer_recent_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.unified_activity_service import get_unified_activities
    return get_unified_activities(db, current_user.id, limit=15)