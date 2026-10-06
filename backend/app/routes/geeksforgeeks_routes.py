from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.cache import user_cache
from app.models.geeksforgeeks_connection import (
    GeeksForGeeksConnection,
)
from app.routes.github_routes import get_current_user_id


router = APIRouter(
    prefix="/geeksforgeeks",
    tags=["GeeksforGeeks Integration"],
)


# =========================================================
# CONNECT / SAVE GFG USERNAME
# =========================================================

@router.post("/connect")
def connect_geeksforgeeks(
    username: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="GeeksforGeeks username is required",
        )

    connection = (
        db.query(GeeksForGeeksConnection)
        .filter(
            GeeksForGeeksConnection.user_id == user_id
        )
        .first()
    )

    profile_url = (
        f"https://www.geeksforgeeks.org/user/{username}/"
    )

    if connection:
        connection.gfg_username = username
        connection.profile_url = profile_url
    else:
        connection = GeeksForGeeksConnection(
            user_id=user_id,
            gfg_username=username,
            profile_url=profile_url,
        )
        db.add(connection)

    db.commit()
    db.refresh(connection)

    # Invalidate cache on connection
    user_cache.invalidate_user(user_id)

    return {
        "connected": True,
        "message": "GeeksforGeeks account connected successfully",
        "geeksforgeeks": {
            "username": connection.gfg_username,
            "profile_url": connection.profile_url,
            "problems_solved": connection.problems_solved,
            "coding_score": connection.coding_score,
            "articles_published": connection.articles_published,
            "courses_completed": connection.courses_completed,
        },
    }


# =========================================================
# STATUS
# =========================================================

@router.get("/status")
def geeksforgeeks_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "platform_status:geeksforgeeks")
    if cached is not None:
        return cached

    connection = (
        db.query(GeeksForGeeksConnection)
        .filter(
            GeeksForGeeksConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "message": "GeeksforGeeks account is not connected",
        }
        user_cache.set(user_id, "platform_status:geeksforgeeks", res, ttl=30)
        return res

    profile_url = (
        connection.profile_url
        if connection.profile_url and "geeksforgeeks.org/user/" in connection.profile_url
        else f"https://www.geeksforgeeks.org/user/{connection.gfg_username}/"
    )

    res = {
        "connected": True,
        "username": connection.gfg_username,
        "profile_url": profile_url,
        "geeksforgeeks": {
            "username": connection.gfg_username,
            "profile_url": profile_url,
            "problems_solved": connection.problems_solved,
            "coding_score": connection.coding_score,
            "articles_published": connection.articles_published,
            "courses_completed": connection.courses_completed,
        },
    }
    user_cache.set(user_id, "platform_status:geeksforgeeks", res, ttl=30)
    return res


# =========================================================
# PROFILE
# =========================================================

@router.get("/profile")
def geeksforgeeks_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GeeksForGeeksConnection)
        .filter(
            GeeksForGeeksConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GeeksforGeeks account is not connected",
        )

    profile_url = (
        connection.profile_url
        if connection.profile_url and "geeksforgeeks.org/user/" in connection.profile_url
        else f"https://www.geeksforgeeks.org/user/{connection.gfg_username}/"
    )

    return {
        "username": connection.gfg_username,
        "profile_url": profile_url,
        "problems_solved": connection.problems_solved,
        "coding_score": connection.coding_score,
        "articles_published": connection.articles_published,
        "courses_completed": connection.courses_completed,
    }


# =========================================================
# DISCONNECT
# =========================================================

@router.delete("/disconnect")
@router.post("/disconnect")
def disconnect_geeksforgeeks(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GeeksForGeeksConnection)
        .filter(
            GeeksForGeeksConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GeeksforGeeks account is not connected",
        )

    db.delete(connection)
    db.commit()

    # Invalidate cache on disconnect
    user_cache.invalidate_user(user_id)

    return {
        "connected": False,
        "message": "GeeksforGeeks account disconnected",
    }