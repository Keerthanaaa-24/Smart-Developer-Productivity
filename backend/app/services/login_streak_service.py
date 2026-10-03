from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.login_history import LoginHistory


def record_user_login(
    db: Session,
    user_id: int,
    ip_address: str | None = None,
    user_agent: str | None = None,
    login_date: date | None = None,
) -> LoginHistory:
    """
    Idempotently records login history event for the specified date.
    """
    act_date = login_date or date.today()
    login_entry = LoginHistory(
        user_id=user_id,
        login_date=act_date,
        ip_address=ip_address,
        user_agent=user_agent[:250] if user_agent else None,
    )
    db.add(login_entry)
    db.commit()
    db.refresh(login_entry)
    return login_entry


def get_login_streak(db: Session, user_id: int, target_date: date | None = None) -> dict:
    """
    Calculates genuine consecutive login streak from LoginHistory records.
    - Multiple logins on same day = 1 day.
    - Consecutive calendar dates = active streak.
    - Missing day = reset streak.
    - Longest streak = max consecutive streak in history.
    """
    today = target_date or date.today()

    # Query distinct login dates sorted descending
    records = (
        db.query(LoginHistory.login_date)
        .filter(LoginHistory.user_id == user_id)
        .distinct()
        .order_by(desc(LoginHistory.login_date))
        .all()
    )

    login_dates = sorted({r[0] for r in records if r[0] is not None})
    if not login_dates:
        return {
            "current_streak": 0,
            "longest_streak": 0,
            "total_login_days": 0,
            "today_logged_in": False,
            "last_login_date": None,
        }

    date_set = set(login_dates)
    total_days = len(login_dates)
    last_date = login_dates[-1]
    today_logged_in = today in date_set

    # 1. Calculate Current Streak
    current_streak = 0
    # Streak starts from today if logged in, otherwise from yesterday if logged in yesterday
    if today in date_set:
        check_date = today
    elif (today - timedelta(days=1)) in date_set:
        check_date = today - timedelta(days=1)
    else:
        check_date = None

    if check_date:
        while check_date in date_set:
            current_streak += 1
            check_date -= timedelta(days=1)

    # 2. Calculate Longest Streak in history
    longest_streak = 0
    temp_streak = 0
    prev_date = None

    for d in login_dates:
        if prev_date is None:
            temp_streak = 1
        elif d == prev_date + timedelta(days=1):
            temp_streak += 1
        else:
            temp_streak = 1
        prev_date = d
        if temp_streak > longest_streak:
            longest_streak = temp_streak

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest_streak, current_streak),
        "total_login_days": total_days,
        "today_logged_in": today_logged_in,
        "last_login_date": str(last_date),
    }
