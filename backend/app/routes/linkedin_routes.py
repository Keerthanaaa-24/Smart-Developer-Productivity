from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.cache import user_cache
from app.models.linkedin_connection import LinkedInConnection
from app.routes.github_routes import get_current_user_id

router = APIRouter(
    prefix="/linkedin",
    tags=["LinkedIn Integration"],
)


@router.post("/connect")
def connect_linkedin(
    username: str,
    headline: str | None = None,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()
    if not username:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn profile username or public identifier is required",
        )

    connection = (
        db.query(LinkedInConnection)
        .filter(LinkedInConnection.user_id == user_id)
        .first()
    )

    clean_user = username.replace("https://www.linkedin.com/in/", "").replace("https://linkedin.com/in/", "").strip("/")
    profile_url = f"https://www.linkedin.com/in/{clean_user}/"

    if connection:
        connection.linkedin_username = clean_user
        connection.profile_url = profile_url
        if headline:
            connection.headline = headline.strip()
    else:
        connection = LinkedInConnection(
            user_id=user_id,
            linkedin_username=clean_user,
            headline=headline.strip() if headline else None,
            profile_url=profile_url,
        )
        db.add(connection)

    db.commit()
    db.refresh(connection)

    # Invalidate cache on connect
    user_cache.invalidate_user(user_id)

    return {
        "message": "LinkedIn profile connected successfully",
        "username": connection.linkedin_username,
        "profile_url": connection.profile_url,
        "sync_mode": "LIMITED / PROFILE ACCESS",
        "activity_mode": "Manual career milestone tracking",
    }


@router.get("/status")
def linkedin_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "platform_status:linkedin")
    if cached is not None:
        return cached

    connection = (
        db.query(LinkedInConnection)
        .filter(LinkedInConnection.user_id == user_id)
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "username": None,
            "profile_url": None,
            "sync_mode": "LIMITED / UNAVAILABLE",
            "activity_mode": "Manual career tracking",
            "notice": "Open activity feed API is restricted by LinkedIn. Manual career milestones supported.",
        }
        user_cache.set(user_id, "platform_status:linkedin", res, ttl=30)
        return res

    profile_url = connection.profile_url or f"https://www.linkedin.com/in/{connection.linkedin_username}/"

    res = {
        "connected": True,
        "username": connection.linkedin_username,
        "headline": connection.headline,
        "profile_url": profile_url,
        "linkedin": {
            "username": connection.linkedin_username,
            "headline": connection.headline,
            "profile_url": profile_url,
            "connected_at": connection.created_at.isoformat() if connection.created_at else None,
        },
        "connected_at": connection.created_at.isoformat() if connection.created_at else None,
        "sync_mode": "PROFILE ACCESS ONLY",
        "activity_mode": "Manual career tracking",
        "notice": "Connected ≠ Automatically tracked. LinkedIn open activity feed is restricted; manual career milestones supported.",
    }
    user_cache.set(user_id, "platform_status:linkedin", res, ttl=30)
    return res


@router.post("/disconnect")
@router.delete("/disconnect")
def disconnect_linkedin(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(LinkedInConnection)
        .filter(LinkedInConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="No LinkedIn connection found to disconnect",
        )

    db.delete(connection)
    db.commit()

    # Invalidate cache on disconnect
    user_cache.invalidate_user(user_id)

    return {"message": "LinkedIn profile disconnected successfully"}

