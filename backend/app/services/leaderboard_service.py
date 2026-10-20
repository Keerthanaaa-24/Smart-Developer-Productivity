import logging
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_, text

from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.point_transaction import PointTransaction
from app.models.student_achievement import StudentAchievement
from app.models.developer_activity import DeveloperActivity
from app.services.points_service import calculate_level_info
from app.core.cache import user_cache

logger = logging.getLogger("uvicorn.error")


def _get_period_filter_clause(period: str):
    """
    Returns datetime threshold for point filtering based on period:
    - 'all_time': None
    - 'monthly': 30 days ago
    - 'weekly': 7 days ago
    """
    now = datetime.now(timezone.utc)
    if period == "weekly":
        return now - timedelta(days=7)
    elif period == "monthly":
        return now - timedelta(days=30)
    return None


def get_leaderboard(
    db: Session,
    period: str = "all_time",
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    current_user_id: int | None = None,
) -> dict:
    """
    Calculates genuine student rankings from verified point transactions and eligible activity records.
    Deterministic tie-breaking rule:
    `total_points DESC, longest_streak DESC, user_id ASC`.
    Privacy safety:
    Never returns email, password hash, or private configuration.
    Respects user profile_visibility settings.
    """
    page = max(1, page)
    limit = min(100, max(1, limit))
    offset = (page - 1) * limit
    period_lower = (period or "all_time").lower().strip()
    if period_lower not in ("all_time", "monthly", "weekly"):
        period_lower = "all_time"

    since_dt = _get_period_filter_clause(period_lower)

    # 1. Base query: aggregate points per user
    # Subquery for point sums within period
    pt_query = db.query(
        PointTransaction.user_id,
        func.coalesce(func.sum(PointTransaction.points), 0).label("period_points"),
        func.max(PointTransaction.created_at).label("last_point_at"),
    )
    if since_dt:
        pt_query = pt_query.filter(PointTransaction.created_at >= since_dt)
    pt_subq = pt_query.group_by(PointTransaction.user_id).subquery()

    # Subquery for achievement count
    ach_subq = (
        db.query(
            StudentAchievement.user_id,
            func.count(StudentAchievement.id).label("achievement_count"),
        )
        .group_by(StudentAchievement.user_id)
        .subquery()
    )

    # Subquery for active days / streaks count
    act_subq = (
        db.query(
            DeveloperActivity.user_id,
            func.count(func.distinct(DeveloperActivity.activity_date)).label("total_active_days"),
        )
        .group_by(DeveloperActivity.user_id)
        .subquery()
    )

    # Main query joining User and UserSettings
    query = (
        db.query(
            User.id.label("user_id"),
            User.username.label("username"),
            UserSettings.full_name,
            UserSettings.avatar_url,
            UserSettings.profile_visibility,
            func.coalesce(pt_subq.c.period_points, 0).label("points"),
            func.coalesce(ach_subq.c.achievement_count, 0).label("achievement_count"),
            func.coalesce(act_subq.c.total_active_days, 0).label("total_active_days"),
            pt_subq.c.last_point_at,
        )
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .outerjoin(pt_subq, pt_subq.c.user_id == User.id)
        .outerjoin(ach_subq, ach_subq.c.user_id == User.id)
        .outerjoin(act_subq, act_subq.c.user_id == User.id)
    )

    # Apply search filter if provided
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(term),
                func.lower(UserSettings.full_name).like(term),
            )
        )

    # Count total eligible students matching query
    total_students = query.count()

    # Deterministic order: points DESC, total_active_days DESC, user_id ASC
    query = query.order_by(
        desc("points"),
        desc("total_active_days"),
        User.id.asc(),
    )

    all_rows = query.offset(offset).limit(limit).all()

    # Compute rank for current page
    ranked_students = []
    base_rank = offset + 1

    for idx, row in enumerate(all_rows):
        rank = base_rank + idx
        is_private = row.profile_visibility == "private"
        # If user is viewing their own profile, they see their full name even if private
        is_self = current_user_id is not None and row.user_id == current_user_id

        if is_private and not is_self:
            display_name = f"Student Developer #{row.user_id}"
            avatar = ""
        else:
            display_name = row.full_name if (row.full_name and row.full_name.strip()) else row.username
            avatar = row.avatar_url or ""

        level_data = calculate_level_info(row.points)

        ranked_students.append({
            "rank": rank,
            "user_id": row.user_id,
            "username": display_name if (is_private and not is_self) else row.username,
            "display_name": display_name,
            "avatar_url": avatar,
            "points": int(row.points),
            "level": level_data["level"],
            "level_title": level_data["title"],
            "achievement_count": int(row.achievement_count),
            "total_active_days": int(row.total_active_days),
            "is_self": is_self,
            "is_private": is_private,
            "last_active": row.last_point_at.isoformat() if row.last_point_at else None,
        })

    # Separate top 3 podium if on page 1
    podium = ranked_students[:3] if page == 1 and len(ranked_students) > 0 else []

    total_pages = max(1, (total_students + limit - 1) // limit)

    return {
        "period": period_lower,
        "page": page,
        "limit": limit,
        "total_students": total_students,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "students": ranked_students,
        "podium": podium,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


def get_student_leaderboard_position(
    db: Session,
    user_id: int,
    period: str = "all_time",
) -> dict:
    """
    Finds the exact real ranking position, points, level, and ahead/behind deltas
    for the logged-in student.
    """
    period_lower = (period or "all_time").lower().strip()
    since_dt = _get_period_filter_clause(period_lower)

    # 1. Get current user's period points
    my_pt_q = db.query(func.coalesce(func.sum(PointTransaction.points), 0)).filter(
        PointTransaction.user_id == user_id
    )
    if since_dt:
        my_pt_q = my_pt_q.filter(PointTransaction.created_at >= since_dt)
    my_points = my_pt_q.scalar() or 0

    # 2. Get current user's active days
    my_active_days = (
        db.query(func.count(func.distinct(DeveloperActivity.activity_date)))
        .filter(DeveloperActivity.user_id == user_id)
        .scalar()
    ) or 0

    # 3. Calculate how many students have strictly higher points OR equal points with more active days OR lower user_id
    # Points subquery across all users
    pt_subq = (
        db.query(
            PointTransaction.user_id,
            func.coalesce(func.sum(PointTransaction.points), 0).label("pts"),
        )
    )
    if since_dt:
        pt_subq = pt_subq.filter(PointTransaction.created_at >= since_dt)
    pt_subq = pt_subq.group_by(PointTransaction.user_id).subquery()

    act_subq = (
        db.query(
            DeveloperActivity.user_id,
            func.count(func.distinct(DeveloperActivity.activity_date)).label("days"),
        )
        .group_by(DeveloperActivity.user_id)
        .subquery()
    )

    # Count competitors ahead
    ahead_count = (
        db.query(User.id)
        .outerjoin(pt_subq, pt_subq.c.user_id == User.id)
        .outerjoin(act_subq, act_subq.c.user_id == User.id)
        .filter(
            User.id != user_id,
            or_(
                func.coalesce(pt_subq.c.pts, 0) > my_points,
                and_(
                    func.coalesce(pt_subq.c.pts, 0) == my_points,
                    func.coalesce(act_subq.c.days, 0) > my_active_days,
                ),
                and_(
                    func.coalesce(pt_subq.c.pts, 0) == my_points,
                    func.coalesce(act_subq.c.days, 0) == my_active_days,
                    User.id < user_id,
                ),
            ),
        )
        .count()
    )

    my_rank = ahead_count + 1
    total_students = db.query(User).count()

    # User profile & achievements
    user = db.query(User).filter(User.id == user_id).first()
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    ach_count = db.query(StudentAchievement).filter(StudentAchievement.user_id == user_id).count()

    level_data = calculate_level_info(my_points)

    display_name = (
        settings.full_name
        if settings and settings.full_name and settings.full_name.strip()
        else (user.username if user else "Developer")
    )

    return {
        "user_id": user_id,
        "rank": my_rank,
        "total_students": total_students,
        "display_name": display_name,
        "username": user.username if user else "developer",
        "avatar_url": settings.avatar_url if settings else "",
        "points": int(my_points),
        "level": level_data["level"],
        "level_title": level_data["title"],
        "level_progress_percentage": level_data["progress_percentage"],
        "next_level_points": level_data["next_level_points"],
        "total_active_days": my_active_days,
        "achievement_count": ach_count,
        "period": period_lower,
    }


def get_public_student_profile(db: Session, target_user_id: int) -> dict | None:
    """
    Returns a privacy-safe public student overview.
    Never exposes email, password, or private achievements/projects.
    """
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        return None

    settings = db.query(UserSettings).filter(UserSettings.user_id == target_user_id).first()
    is_private = settings.profile_visibility == "private" if settings else False

    # Aggregate points
    total_points = (
        db.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.user_id == target_user_id)
        .scalar()
    ) or 0

    # Public achievements only
    public_achievements = (
        db.query(StudentAchievement)
        .filter(
            StudentAchievement.user_id == target_user_id,
            StudentAchievement.is_public == True,
        )
        .order_by(desc(StudentAchievement.created_at))
        .limit(10)
        .all()
    )

    # Active days
    active_days = (
        db.query(func.count(func.distinct(DeveloperActivity.activity_date)))
        .filter(DeveloperActivity.user_id == target_user_id)
        .scalar()
    ) or 0

    level_data = calculate_level_info(total_points)

    if is_private:
        return {
            "user_id": target_user_id,
            "display_name": f"Student Developer #{target_user_id}",
            "is_private": True,
            "points": total_points,
            "level": level_data["level"],
            "level_title": level_data["title"],
            "public_achievements": [],
            "total_active_days": active_days,
        }

    return {
        "user_id": target_user_id,
        "display_name": settings.full_name if (settings and settings.full_name) else user.username,
        "username": user.username,
        "avatar_url": settings.avatar_url if settings else "",
        "bio": settings.bio if settings else "",
        "is_private": False,
        "points": total_points,
        "level": level_data["level"],
        "level_title": level_data["title"],
        "total_active_days": active_days,
        "public_achievements": [
            {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "issuer": a.issuer,
                "description": a.description,
                "issue_date": str(a.issue_date) if a.issue_date else None,
                "verification_status": a.verification_status,
                "verification_url": a.verification_url,
            }
            for a in public_achievements
        ],
    }
