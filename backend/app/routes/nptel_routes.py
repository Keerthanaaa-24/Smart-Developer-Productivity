from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.cache import user_cache
from app.models.nptel_connection import NPTELConnection
from app.routes.github_routes import get_current_user_id


router = APIRouter(
    prefix="/nptel",
    tags=["NPTEL Integration"],
)


# =========================================================
# CONNECT / SAVE NPTEL USERNAME
# =========================================================

@router.post("/connect")
def connect_nptel(
    username: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="NPTEL username is required",
        )

    connection = (
        db.query(NPTELConnection)
        .filter(
            NPTELConnection.user_id == user_id
        )
        .first()
    )

    profile_url = None

    if connection:
        connection.nptel_username = username
        connection.profile_url = profile_url
    else:
        connection = NPTELConnection(
            user_id=user_id,
            nptel_username=username,
            profile_url=profile_url,
        )
        db.add(connection)

    db.commit()
    db.refresh(connection)

    # Invalidate user cache on connect
    user_cache.invalidate_user(user_id)

    return {
        "connected": True,
        "message": "NPTEL account connected successfully",
        "username": connection.nptel_username,
        "profile_url": connection.profile_url,
        "nptel": {
            "username": connection.nptel_username,
            "profile_url": connection.profile_url,
            "courses_completed": connection.courses_completed,
            "certificates_count": connection.certificates_count,
            "courses_enrolled": connection.courses_enrolled,
        },
    }


# =========================================================
# STATUS
# =========================================================

@router.get("/status")
def nptel_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "platform_status:nptel")
    if cached is not None:
        return cached

    connection = (
        db.query(NPTELConnection)
        .filter(
            NPTELConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "message": "NPTEL account is not connected",
        }
        user_cache.set(user_id, "platform_status:nptel", res, ttl=30)
        return res

    res = {
        "connected": True,
        "username": connection.nptel_username,
        "profile_url": connection.profile_url,
        "nptel": {
            "username": connection.nptel_username,
            "profile_url": connection.profile_url,
            "courses_completed": connection.courses_completed,
            "certificates_count": connection.certificates_count,
            "courses_enrolled": connection.courses_enrolled,
        },
    }
    user_cache.set(user_id, "platform_status:nptel", res, ttl=30)
    return res


# =========================================================
# PROFILE
# =========================================================

@router.get("/profile")
def nptel_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(NPTELConnection)
        .filter(
            NPTELConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="NPTEL account is not connected",
        )

    return {
        "username": connection.nptel_username,
        "profile_url": connection.profile_url,
        "courses_completed": connection.courses_completed,
        "certificates_count": connection.certificates_count,
        "courses_enrolled": connection.courses_enrolled,
    }


# =========================================================
# DISCONNECT
# =========================================================

@router.delete("/disconnect")
@router.post("/disconnect")
def disconnect_nptel(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(NPTELConnection)
        .filter(
            NPTELConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="NPTEL account is not connected",
        )

    db.delete(connection)
    db.commit()

    # Invalidate user cache on disconnect
    user_cache.invalidate_user(user_id)

    return {
        "connected": False,
        "message": "NPTEL account disconnected",
    }