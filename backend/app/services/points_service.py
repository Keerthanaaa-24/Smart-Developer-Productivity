import logging
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, desc

from app.models.point_transaction import PointTransaction
from app.models.user import User
from app.core.cache import user_cache

logger = logging.getLogger("uvicorn.error")

# ==============================================================================
# TRANSPARENT SCORING POLICY
# ==============================================================================
SCORING_POLICY = {
    "task_completed": 10,
    "pomodoro_completed": 5,
    "coding_practice": 5,
    "project_milestone": 10,
    "daily_streak_bonus": 2,
    "achievement_verified": 15,
}

# Level progression thresholds: (Level, min_points, max_points_or_none)
LEVEL_THRESHOLDS = [
    (1, 0, 99, "Novice Developer"),
    (2, 100, 249, "Apprentice Coder"),
    (3, 250, 499, "Productive Engineer"),
    (4, 500, 999, "Senior Crafter"),
    (5, 1000, 1999, "Lead Architect"),
    (6, 2000, None, "Principal Virtuoso"),
]


def calculate_level_info(total_points: int) -> dict:
    """Calculates student level, title, progress %, and next tier target."""
    points = max(0, total_points or 0)
    for lvl, min_pts, max_pts, title in LEVEL_THRESHOLDS:
        if max_pts is None:
            return {
                "level": lvl,
                "title": title,
                "current_points": points,
                "min_points": min_pts,
                "next_level_points": None,
                "progress_percentage": 100,
            }
        if min_pts <= points <= max_pts:
            span = max_pts - min_pts + 1
            progress = round(((points - min_pts) / span) * 100, 1)
            return {
                "level": lvl,
                "title": title,
                "current_points": points,
                "min_points": min_pts,
                "next_level_points": max_pts + 1,
                "progress_percentage": min(100, max(0, progress)),
            }
    return {
        "level": 1,
        "title": "Novice Developer",
        "current_points": points,
        "min_points": 0,
        "next_level_points": 100,
        "progress_percentage": 0,
    }


def award_points(
    db: Session,
    user_id: int,
    source_type: str,
    source_id: str | int,
    points: int,
    category: str = "productivity",
    description: str = "",
) -> PointTransaction | None:
    """
    Transactionally awards points to a student if not already awarded.
    Idempotency:
    Enforced by database UniqueConstraint('user_id', 'source_type', 'source_id').
    If the transaction already exists, the function gracefully returns the existing record.
    """
    clean_source_type = str(source_type).strip().lower()
    clean_source_id = str(source_id).strip()

    if points <= 0 or not clean_source_type or not clean_source_id:
        return None

    # 1. Fast check if already awarded
    existing = (
        db.query(PointTransaction)
        .filter(
            PointTransaction.user_id == user_id,
            PointTransaction.source_type == clean_source_type,
            PointTransaction.source_id == clean_source_id,
        )
        .first()
    )
    if existing:
        return existing

    # 2. Insert new transaction
    tx = PointTransaction(
        user_id=user_id,
        points=points,
        source_type=clean_source_type,
        source_id=clean_source_id,
        category=category,
        description=description,
    )

    try:
        db.add(tx)
        db.commit()
        db.refresh(tx)
        # Invalidate cached leaderboard and user points summary
        user_cache.invalidate_user(user_id)
        return tx
    except IntegrityError:
        db.rollback()
        # Concurrency safety: Another thread recorded the same transaction
        return (
            db.query(PointTransaction)
            .filter(
                PointTransaction.user_id == user_id,
                PointTransaction.source_type == clean_source_type,
                PointTransaction.source_id == clean_source_id,
            )
            .first()
        )
    except Exception as e:
        db.rollback()
        logger.error(f"[PointsService] Error awarding points: {e}")
        return None


def get_user_points_summary(db: Session, user_id: int) -> dict:
    """
    Returns an auditable breakdown of student productivity points:
    total points, current level, progress, breakdown by category, and recent activity transactions.
    """
    cached = user_cache.get(user_id, "user_points_summary")
    if cached is not None:
        return cached

    # 1. Total points
    total_points = (
        db.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.user_id == user_id)
        .scalar()
    ) or 0

    # 2. Points by category
    category_rows = (
        db.query(
            PointTransaction.category,
            func.coalesce(func.sum(PointTransaction.points), 0).label("cat_points"),
            func.count(PointTransaction.id).label("cat_count"),
        )
        .filter(PointTransaction.user_id == user_id)
        .group_by(PointTransaction.category)
        .all()
    )

    category_breakdown = {
        row.category: {
            "points": int(row.cat_points),
            "count": int(row.cat_count),
        }
        for row in category_rows
    }

    # 3. Recent 10 point transactions
    recent_txs = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == user_id)
        .order_by(desc(PointTransaction.created_at))
        .limit(10)
        .all()
    )

    tx_list = [
        {
            "id": tx.id,
            "points": tx.points,
            "source_type": tx.source_type,
            "source_id": tx.source_id,
            "category": tx.category,
            "description": tx.description,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        }
        for tx in recent_txs
    ]

    level_info = calculate_level_info(total_points)

    summary = {
        "user_id": user_id,
        "total_points": total_points,
        "level_info": level_info,
        "category_breakdown": category_breakdown,
        "recent_transactions": tx_list,
        "scoring_policy": SCORING_POLICY,
    }

    user_cache.set(user_id, "user_points_summary", summary, ttl=30)
    return summary
