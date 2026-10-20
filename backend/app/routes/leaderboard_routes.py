from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.services.leaderboard_service import (
    get_leaderboard,
    get_student_leaderboard_position,
    get_public_student_profile,
)
from app.services.points_service import get_user_points_summary

router = APIRouter(
    prefix="/leaderboard",
    tags=["Leaderboard & Competition"],
)


@router.get("", summary="Get global student leaderboard with period filters and search")
def read_leaderboard(
    period: str = Query("all_time", pattern="^(all_time|monthly|weekly)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the real, global student ranking across eligible accounts.
    - Tie-breaking: total points DESC, active days DESC, user ID ASC.
    - Highlights current user position.
    - Searchable by display name or username.
    - Safe from private data leakage.
    """
    return get_leaderboard(
        db=db,
        period=period,
        page=page,
        limit=limit,
        search=search,
        current_user_id=current_user.id,
    )


@router.get("/me", summary="Get current logged-in student's leaderboard rank and statistics")
def read_my_leaderboard_position(
    period: str = Query("all_time", pattern="^(all_time|monthly|weekly)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the student's exact current rank, points, level, and competitive standings.
    """
    return get_student_leaderboard_position(
        db=db,
        user_id=current_user.id,
        period=period,
    )


@router.get("/points/me", summary="Get auditable points breakdown and history")
def read_my_points_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns an auditable breakdown of student productivity points:
    total points, level, category distribution, and recent transactions.
    """
    return get_user_points_summary(
        db=db,
        user_id=current_user.id,
    )


@router.get("/{user_id}", summary="Get public privacy-safe profile summary for a student")
def read_public_student_profile(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Returns public achievements, level, and points for a student.
    Never exposes email, password, or private configurations.
    """
    profile = get_public_student_profile(db=db, target_user_id=user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile
