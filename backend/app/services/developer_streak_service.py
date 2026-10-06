from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from app.core.cache import user_cache
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings


PLATFORMS = [
    "github",
    "leetcode",
    "geeksforgeeks",
    "freecodecamp",
    "nptel",
    "coursera",
    "pomodoro",
    "tasks",
    "manual",
]


def _get_user_today(db: Session, user_id: int, client_date: date | None = None) -> date:
    """
    Returns today's date in the user's configured timezone or client date fallback.
    """
    if client_date:
        return client_date
    return date.today()


def record_activity(
    db: Session,
    user_id: int,
    platform: str,
    activity_type: str,
    activity_count: int = 1,
    activity_date: date | None = None,
    title: str | None = None,
    message: str | None = None,
    duration_seconds: int = 0,
    external_id: str | None = None,
):
    target_date = activity_date or _get_user_today(db, user_id)
    # Allow target date within 1 day ahead for timezone offsets (e.g. UTC+12)
    server_today = date.today()
    if target_date > server_today + timedelta(days=1):
        return None

    clean_platform = platform.lower().strip()
    ext_id = external_id or f"{clean_platform}_{activity_type}_{target_date}"

    existing = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.platform == clean_platform,
            DeveloperActivity.activity_date == target_date,
        )
        .first()
    )

    if existing:
        existing.activity_count = (existing.activity_count or 0) + activity_count
        if duration_seconds > 0:
            existing.duration_seconds = (existing.duration_seconds or 0) + duration_seconds
        if message:
            existing.message = message
        if title:
            existing.title = title
    else:
        category = "coding"
        if clean_platform in ("leetcode", "geeksforgeeks", "hackerrank"):
            category = "problem_solving"
        elif clean_platform in ("coursera", "nptel", "freecodecamp"):
            category = "learning"
        elif clean_platform in ("pomodoro", "tasks", "focus"):
            category = "productivity"
        elif clean_platform in ("linkedin", "naukri"):
            category = "career"

        activity = DeveloperActivity(
            user_id=user_id,
            platform=clean_platform,
            category=category,
            activity_date=target_date,
            activity_type=activity_type,
            activity_count=max(1, activity_count),
            title=title or f"{activity_type.replace('_', ' ').capitalize()} on {clean_platform.capitalize()}",
            message=message or f"Activity recorded on {clean_platform}",
            duration_seconds=max(0, duration_seconds),
            source=f"{clean_platform}_api" if clean_platform in ("github", "leetcode", "geeksforgeeks", "freecodecamp") else "automatic",
            external_id=ext_id,
        )
        db.add(activity)

    db.commit()
    user_cache.invalidate_user(user_id)


def get_developer_streak(
    db: Session,
    user_id: int,
    target_date: date | None = None,
    force_refresh: bool = False,
) -> dict:
    """
    Unified Developer Streak Engine:
    Calculates consecutive active developer days based on distinct calendar dates with verified activity
    from GitHub, LeetCode, GeeksforGeeks, freeCodeCamp, Pomodoro, Tasks, NPTEL, Coursera, or Manual logs.
    - Multiple activities on the same day count as 1 productive day.
    - Preserves historical longest streak across past activity gaps.
    - Grace period: If user was active yesterday, streak is kept active while today is in progress.
    """
    if not force_refresh and target_date is None:
        cached = user_cache.get(user_id, "developer_streak")
        if cached is not None:
            return cached

    today = target_date or _get_user_today(db, user_id)

    activities = (
        db.query(
            DeveloperActivity.activity_date,
            DeveloperActivity.platform,
        )
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date <= today,
        )
        .all()
    )

    # Distinct active calendar dates
    active_dates = {
        activity.activity_date
        for activity in activities
        if activity.activity_date and activity.activity_date <= today
    }

    if not active_dates:
        res = {
            "current_streak": 0,
            "longest_streak": 0,
            "today_active": False,
            "today_platforms": [],
            "active_platform_count": 0,
            "total_active_days": 0,
            "last_active_date": None,
        }
        if target_date is None:
            user_cache.set(user_id, "developer_streak", res, ttl=30)
        return res

    # -----------------------------------------------------
    # 1. CURRENT STREAK CALCULATION
    # Continues from today if active today, or from yesterday if waiting for today's activity.
    # -----------------------------------------------------
    current_streak = 0
    if today in active_dates:
        check_date = today
    elif (today - timedelta(days=1)) in active_dates:
        check_date = today - timedelta(days=1)
    else:
        check_date = None

    if check_date:
        while check_date in active_dates:
            current_streak += 1
            check_date -= timedelta(days=1)

    # -----------------------------------------------------
    # 2. LONGEST STREAK CALCULATION (Historical unbroken maximum)
    # -----------------------------------------------------
    longest_streak = 0
    running_streak = 0
    previous_date = None

    for act_date in sorted(active_dates):
        if previous_date and act_date == previous_date + timedelta(days=1):
            running_streak += 1
        else:
            running_streak = 1

        if running_streak > longest_streak:
            longest_streak = running_streak
        previous_date = act_date

    # Ensure longest_streak is at least current_streak
    longest_streak = max(longest_streak, current_streak)

    # Platforms active today
    today_platforms = [
        activity.platform
        for activity in activities
        if activity.activity_date == today and activity.platform
    ]
    today_platforms = list(dict.fromkeys(today_platforms))

    last_active = max(active_dates) if active_dates else None

    res = {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "today_active": (today in active_dates),
        "today_platforms": today_platforms,
        "active_platform_count": len(today_platforms),
        "total_active_days": len(active_dates),
        "last_active_date": str(last_active) if last_active else None,
    }
    if target_date is None:
        user_cache.set(user_id, "developer_streak", res, ttl=30)
    return res