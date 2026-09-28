from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.developer_activity import (
    DeveloperActivity,
)


PLATFORMS = [
    "github",
    "leetcode",
    "geeksforgeeks",
    "freecodecamp",
    "nptel",
    "coursera",
]


def record_activity(
    db: Session,
    user_id: int,
    platform: str,
    activity_type: str,
    activity_count: int = 1,
):
    today = date.today()

    existing = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.platform == platform,
            DeveloperActivity.activity_date == today,
        )
        .first()
    )

    if existing:

        existing.activity_count += activity_count

    else:

        activity = DeveloperActivity(
            user_id=user_id,
            platform=platform,
            activity_date=today,
            activity_type=activity_type,
            activity_count=activity_count,
        )

        db.add(activity)

    db.commit()


def get_developer_streak(
    db: Session,
    user_id: int,
):
    activities = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id
        )
        .order_by(
            DeveloperActivity.activity_date.asc()
        )
        .all()
    )

    active_dates = {
        activity.activity_date
        for activity in activities
    }

    today = date.today()

    current_streak = 0

    check_date = today

    if check_date not in active_dates:

        yesterday = (
            today - timedelta(days=1)
        )

        if yesterday in active_dates:
            check_date = yesterday
        else:
            check_date = None

    if check_date:

        while check_date in active_dates:

            current_streak += 1

            check_date -= timedelta(days=1)

    # -----------------------------------------------------
    # LONGEST STREAK
    # -----------------------------------------------------

    longest_streak = 0
    running_streak = 0
    previous_date = None

    for activity_date in sorted(active_dates):

        if (
            previous_date
            and activity_date
            == previous_date + timedelta(days=1)
        ):

            running_streak += 1

        else:

            running_streak = 1

        longest_streak = max(
            longest_streak,
            running_streak,
        )

        previous_date = activity_date

    today_platforms = [
        activity.platform
        for activity in activities
        if activity.activity_date == today
    ]

    today_platforms = list(
        dict.fromkeys(today_platforms)
    )

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "today_active": (
            today in active_dates
        ),
        "today_platforms": today_platforms,
        "active_platform_count": len(
            today_platforms
        ),
        "total_active_days": len(
            active_dates
        ),
    }