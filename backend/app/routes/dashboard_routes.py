from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session

from datetime import date, timedelta

from app.core.database import get_db
from app.core.oauth2 import get_current_user

from app.models.user import User
from app.models.developer_activity import DeveloperActivity

from app.services.dashboard_service import (
    get_dashboard_stats,
    get_dashboard_overview,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def _ensure_student_user(user: User):
    """Guarantees that admins do not participate in student developer productivity tracking."""
    if getattr(user, "role", "student") in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative accounts do not participate in student developer tracking. Please use the Admin Console at /admin.",
        )


# =====================================================
# DASHBOARD OVERVIEW (COMMAND CENTER 2.0)
# =====================================================

@router.get("/overview")
def dashboard_overview(
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _ensure_student_user(current_user)
    import time
    import logging
    t0 = time.monotonic()
    data = get_dashboard_overview(
        db=db,
        user_id=current_user.id,
        force_refresh=refresh,
    )
    duration_ms = round((time.monotonic() - t0) * 1000, 2)
    logging.getLogger("uvicorn.error").info(
        f"[DASHBOARD_DIAG] /dashboard/overview user_id={current_user.id} refresh={refresh} duration_ms={duration_ms}"
    )
    return data


# =====================================================
# DASHBOARD STATS (BACKWARDS COMPATIBILITY)
# =====================================================

@router.get("/stats")
def dashboard_stats(
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _ensure_student_user(current_user)
    import time
    import logging
    t0 = time.monotonic()
    stats = get_dashboard_stats(
        db,
        current_user.id,
        force_refresh=refresh,
    )
    duration_ms = round((time.monotonic() - t0) * 1000, 2)
    logging.getLogger("uvicorn.error").info(
        f"[DASHBOARD_DIAG] /dashboard/stats user_id={current_user.id} duration_ms={duration_ms}"
    )
    return stats


from sqlalchemy import func
from app.core.cache import user_cache

@router.get("/weekly-productivity")
def weekly_productivity(
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _ensure_student_user(current_user)
    if not refresh:
        cached = user_cache.get(current_user.id, "weekly_productivity")
        if cached is not None:
            return cached

    from app.services.unified_activity_service import get_user_local_today
    today = get_user_local_today(db, current_user.id)
    start_date = today - timedelta(days=6)

    # Single grouped query for 7-day range
    counts = dict(
        db.query(
            DeveloperActivity.activity_date,
            func.count(DeveloperActivity.id),
        )
        .filter(
            DeveloperActivity.user_id == current_user.id,
            DeveloperActivity.activity_date >= start_date,
            DeveloperActivity.activity_date <= today,
        )
        .group_by(DeveloperActivity.activity_date)
        .all()
    )

    weekly_data = []

    for days_ago in range(6, -1, -1):
        current_date = today - timedelta(days=days_ago)
        weekly_data.append(
            {
                "day": current_date.strftime("%a"),
                "activities": counts.get(current_date, 0),
            }
        )

    res = {
        "weekly_productivity": weekly_data
    }
    user_cache.set(current_user.id, "weekly_productivity", res, ttl=30)
    return res