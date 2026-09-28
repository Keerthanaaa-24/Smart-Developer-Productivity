from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from datetime import date, timedelta

from app.core.database import get_db
from app.core.oauth2 import get_current_user

from app.models.user import User
from app.models.developer_activity import DeveloperActivity

from app.services.dashboard_service import (
    get_dashboard_stats
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# =====================================================
# DASHBOARD STATS
# =====================================================

@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    stats = get_dashboard_stats(
        db,
        current_user.id
    )

    return stats


# =====================================================
# WEEKLY PRODUCTIVITY
# =====================================================

@router.get("/weekly-productivity")
def weekly_productivity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    today = date.today()

    weekly_data = []

    # Last 7 days including today
    for days_ago in range(6, -1, -1):

        current_date = (
            today - timedelta(days=days_ago)
        )

        activity_count = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.user_id == current_user.id,
                DeveloperActivity.activity_date == current_date,
            )
            .count()
        )

        weekly_data.append(
            {
                "day": current_date.strftime("%a"),
                "activities": activity_count,
            }
        )

    return {
        "weekly_productivity": weekly_data
    }