from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.leetcode_connection import LeetCodeConnection
from app.routes.github_routes import get_current_user_id

router = APIRouter(
    prefix="/leetcode",
    tags=["LeetCode Integration"],
)


# --------------------------------------------------
# Connect / Save LeetCode username
# --------------------------------------------------

@router.post("/connect")
def connect_leetcode(
    username: str,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    username = username.strip()

    if not username:
        raise HTTPException(
            status_code=400,
            detail="LeetCode username is required",
        )

    connection = (
        db.query(LeetCodeConnection)
        .filter(
            LeetCodeConnection.user_id == user_id
        )
        .first()
    )

    profile_url = (
        f"https://leetcode.com/u/{username}/"
    )

    if connection:
        connection.leetcode_username = username
        connection.profile_url = profile_url

    else:
        connection = LeetCodeConnection(
            user_id=user_id,
            leetcode_username=username,
            profile_url=profile_url,
        )

        db.add(connection)

    db.commit()
    db.refresh(connection)

    return {
        "connected": True,
        "message": "LeetCode account connected successfully",
        "leetcode": {
            "username": connection.leetcode_username,
            "profile_url": connection.profile_url,
        },
    }


# --------------------------------------------------
# Check connection status
# --------------------------------------------------

@router.get("/status")
def leetcode_status(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(LeetCodeConnection)
        .filter(
            LeetCodeConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        return {
            "connected": False,
            "message": "LeetCode account is not connected",
        }

    return {
        "connected": True,
        "leetcode": {
            "username": connection.leetcode_username,
            "profile_url": connection.profile_url,
            "problems_solved": connection.problems_solved,
            "easy_solved": connection.easy_solved,
            "medium_solved": connection.medium_solved,
            "hard_solved": connection.hard_solved,
            "contest_rating": connection.contest_rating,
            "global_ranking": connection.global_ranking,
        },
    }


# --------------------------------------------------
# Get connected profile
# --------------------------------------------------

@router.get("/profile")
def leetcode_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(LeetCodeConnection)
        .filter(
            LeetCodeConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="LeetCode account is not connected",
        )

    return {
        "username": connection.leetcode_username,
        "profile_url": connection.profile_url,
        "problems_solved": connection.problems_solved,
        "easy_solved": connection.easy_solved,
        "medium_solved": connection.medium_solved,
        "hard_solved": connection.hard_solved,
        "contest_rating": connection.contest_rating,
        "global_ranking": connection.global_ranking,
    }


# --------------------------------------------------
# Disconnect LeetCode
# --------------------------------------------------

@router.delete("/disconnect")
def disconnect_leetcode(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(LeetCodeConnection)
        .filter(
            LeetCodeConnection.user_id == user_id
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="LeetCode account is not connected",
        )

    db.delete(connection)
    db.commit()

    return {
        "connected": False,
        "message": "LeetCode account disconnected",
    }