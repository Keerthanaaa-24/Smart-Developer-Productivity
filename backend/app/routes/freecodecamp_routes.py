from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
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
    connection = (
        db.query(FreeCodeCampConnection)
        .filter(
            FreeCodeCampConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        return {
            "connected": False,
            "message": "freeCodeCamp account is not connected",
        }

    return {
        "connected": True,
        "freecodecamp": {
            "username": connection.freecodecamp_username,
            "profile_url": connection.profile_url,
            "certifications_count": connection.certifications_count,
        },
    }


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

    return {
        "username": connection.freecodecamp_username,
        "profile_url": connection.profile_url,
        "certifications_count": connection.certifications_count,
    }


# --------------------------------------------------
# Disconnect
# --------------------------------------------------

@router.delete("/disconnect")
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

    return {
        "connected": False,
        "message": "freeCodeCamp account disconnected",
    }