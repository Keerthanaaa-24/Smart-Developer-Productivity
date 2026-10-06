from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.cache import user_cache
from app.models.coursera_connection import CourseraConnection
from app.routes.github_routes import get_current_user_id


router = APIRouter(
    prefix="/coursera",
    tags=["Coursera Integration"],
)


# =========================================================
# CONNECT / SAVE COURSERA USERNAME
# =========================================================

@router.post("/connect")
def connect_coursera(
    username: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="Coursera username is required",
        )

    connection = (
        db.query(CourseraConnection)
        .filter(
            CourseraConnection.user_id == user_id
        )
        .first()
    )

    profile_url = None

    if connection:
        connection.coursera_username = username
        connection.profile_url = profile_url
    else:
        connection = CourseraConnection(
            user_id=user_id,
            coursera_username=username,
            profile_url=profile_url,
        )
        db.add(connection)

    db.commit()
    db.refresh(connection)

    # Invalidate user cache on connect
    user_cache.invalidate_user(user_id)

    return {
        "connected": True,
        "message": "Coursera account connected successfully",
        "username": connection.coursera_username,
        "profile_url": connection.profile_url,
        "coursera": {
            "username": connection.coursera_username,
            "profile_url": connection.profile_url,
            "courses_completed": connection.courses_completed,
            "certificates_count": connection.certificates_count,
            "courses_in_progress": connection.courses_in_progress,
        },
    }


# =========================================================
# STATUS
# =========================================================

@router.get("/status")
def coursera_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "platform_status:coursera")
    if cached is not None:
        return cached

    connection = (
        db.query(CourseraConnection)
        .filter(
            CourseraConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "message": "Coursera account is not connected",
        }
        user_cache.set(user_id, "platform_status:coursera", res, ttl=30)
        return res

    res = {
        "connected": True,
        "username": connection.coursera_username,
        "profile_url": connection.profile_url,
        "coursera": {
            "username": connection.coursera_username,
            "profile_url": connection.profile_url,
            "courses_completed": connection.courses_completed,
            "certificates_count": connection.certificates_count,
            "courses_in_progress": connection.courses_in_progress,
        },
    }
    user_cache.set(user_id, "platform_status:coursera", res, ttl=30)
    return res


# =========================================================
# PROFILE
# =========================================================

@router.get("/profile")
def coursera_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(CourseraConnection)
        .filter(
            CourseraConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Coursera account is not connected",
        )

    return {
        "username": connection.coursera_username,
        "profile_url": connection.profile_url,
        "courses_completed": connection.courses_completed,
        "certificates_count": connection.certificates_count,
        "courses_in_progress": connection.courses_in_progress,
    }


# =========================================================
# DISCONNECT
# =========================================================

@router.delete("/disconnect")
@router.post("/disconnect")
def disconnect_coursera(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(CourseraConnection)
        .filter(
            CourseraConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="Coursera account is not connected",
        )

    db.delete(connection)
    db.commit()

    # Invalidate user cache on disconnect
    user_cache.invalidate_user(user_id)

    return {
        "connected": False,
        "message": "Coursera account disconnected",
    }