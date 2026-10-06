from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.cache import user_cache
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.routes.github_routes import get_current_user_id


router = APIRouter(
    prefix="/freecodecamp",
    tags=["freeCodeCamp Integration"],
)


# --------------------------------------------------
# Connect freeCodeCamp
# --------------------------------------------------

@router.post("/connect")
def connect_freecodecamp(
    username: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="freeCodeCamp username is required",
        )

    connection = (
        db.query(FreeCodeCampConnection)
        .filter(
            FreeCodeCampConnection.user_id == user_id
        )
        .first()
    )

    profile_url = (
        f"https://www.freecodecamp.org/{username}"
    )

    if connection:
        connection.freecodecamp_username = username
        connection.profile_url = profile_url
    else:
        connection = FreeCodeCampConnection(
            user_id=user_id,
            freecodecamp_username=username,
            profile_url=profile_url,
        )
        db.add(connection)

    db.commit()
    db.refresh(connection)

    # Invalidate cache on connection
    user_cache.invalidate_user(user_id)

    return {
        "connected": True,
        "message": "freeCodeCamp account connected successfully",
        "freecodecamp": {
            "username": connection.freecodecamp_username,
            "profile_url": connection.profile_url,
            "certifications_count": connection.certifications_count,
        },
    }


# --------------------------------------------------
# Connection Status
# --------------------------------------------------

@router.get("/status")
def freecodecamp_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "platform_status:freecodecamp")
    if cached is not None:
        return cached

    connection = (
        db.query(FreeCodeCampConnection)
        .filter(
            FreeCodeCampConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "message": "freeCodeCamp account is not connected",
        }
        user_cache.set(user_id, "platform_status:freecodecamp", res, ttl=30)
        return res

    profile_url = (
        connection.profile_url
        if connection.profile_url
        else f"https://www.freecodecamp.org/{connection.freecodecamp_username}"
    )

    res = {
        "connected": True,
        "username": connection.freecodecamp_username,
        "profile_url": profile_url,
        "freecodecamp": {
            "username": connection.freecodecamp_username,
            "profile_url": profile_url,
            "certifications_count": connection.certifications_count,
        },
    }
    user_cache.set(user_id, "platform_status:freecodecamp", res, ttl=30)
    return res


# --------------------------------------------------
# Profile
# --------------------------------------------------

@router.get("/profile")
def freecodecamp_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(FreeCodeCampConnection)
        .filter(
            FreeCodeCampConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="freeCodeCamp account is not connected",
        )

    profile_url = (
        connection.profile_url
        if connection.profile_url
        else f"https://www.freecodecamp.org/{connection.freecodecamp_username}"
    )

    return {
        "username": connection.freecodecamp_username,
        "profile_url": profile_url,
        "certifications_count": connection.certifications_count,
    }


# --------------------------------------------------
# Disconnect
# --------------------------------------------------

@router.delete("/disconnect")
@router.post("/disconnect")
def disconnect_freecodecamp(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(FreeCodeCampConnection)
        .filter(
            FreeCodeCampConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="freeCodeCamp account is not connected",
        )

    db.delete(connection)
    db.commit()

    # Invalidate cache on disconnect
    user_cache.invalidate_user(user_id)

    return {
        "connected": False,
        "message": "freeCodeCamp account disconnected",
    }