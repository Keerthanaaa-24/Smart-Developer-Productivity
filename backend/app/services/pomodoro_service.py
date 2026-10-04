from datetime import datetime, date, timedelta
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.cache import user_cache
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.task import Task


def _upsert_pomodoro_developer_activity(
    db: Session,
    user_id: int,
    session: PomodoroSession,
    actual_duration_seconds: int,
    task_title: str | None = None,
):
    if session.session_type != "focus" or actual_duration_seconds <= 0:
        return

    now = datetime.utcnow()
    today = now.date()

    existing_activity = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.platform == "pomodoro",
            DeveloperActivity.activity_date == today,
        )
        .first()
    )

    if existing_activity:
        existing_activity.duration_seconds = (existing_activity.duration_seconds or 0) + actual_duration_seconds
        existing_activity.activity_count = (existing_activity.activity_count or 0) + 1
        existing_activity.ended_at = now
        total_mins = max(1, existing_activity.duration_seconds // 60)
        existing_activity.message = f"Completed {existing_activity.activity_count} focus session(s) ({total_mins}m focus)"
        existing_activity.details = f"Last cycle #{session.cycle_number} • Deep Work"
    else:
        mins = max(1, actual_duration_seconds // 60)
        task_suffix = f" on task: {task_title}" if task_title else ""
        new_activity = DeveloperActivity(
            user_id=user_id,
            platform="pomodoro",
            category="productivity",
            activity_type="focus_session",
            activity_date=today,
            message=f"Completed {mins}m focus session{task_suffix}",
            details=f"Cycle #{session.cycle_number} • Deep Work",
            duration_seconds=actual_duration_seconds,
            source="pomodoro_timer",
            started_at=session.started_at or now,
            ended_at=now,
            activity_count=1,
        )
        db.add(new_activity)


def start_pomodoro_session(
    db: Session,
    user_id: int,
    task_id: int | None = None,
    session_type: str = "focus",
    planned_duration_seconds: int = 1500,
    cycle_number: int = 1,
) -> dict:
    # 1. Check for existing running or paused sessions and clean them up
    existing_active = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status.in_(["running", "paused"]),
        )
        .all()
    )

    for old_session in existing_active:
        old_session.status = "interrupted"
        old_session.ended_at = datetime.utcnow()

    # 2. Verify task if supplied
    task_title = None
    if task_id:
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
        if task:
            task_title = task.title
        else:
            task_id = None

    # 3. Create new session
    now = datetime.utcnow()
    new_session = PomodoroSession(
        user_id=user_id,
        task_id=task_id,
        session_type=session_type,
        planned_duration_seconds=planned_duration_seconds,
        actual_duration_seconds=0,
        status="running",
        cycle_number=cycle_number,
        started_at=now,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    user_cache.invalidate_user(user_id)

    return {
        "id": new_session.id,
        "user_id": new_session.user_id,
        "task_id": new_session.task_id,
        "task_title": task_title,
        "session_type": new_session.session_type,
        "planned_duration_seconds": new_session.planned_duration_seconds,
        "actual_duration_seconds": new_session.actual_duration_seconds,
        "status": new_session.status,
        "cycle_number": new_session.cycle_number,
        "started_at": new_session.started_at.isoformat() if new_session.started_at else None,
    }


def pause_pomodoro_session(
    db: Session,
    user_id: int,
    session_id: int,
    elapsed_seconds: int,
) -> dict | None:
    session = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.id == session_id,
            PomodoroSession.user_id == user_id,
        )
        .first()
    )

    if not session:
        return None

    session.status = "paused"
    session.actual_duration_seconds = max(session.actual_duration_seconds, elapsed_seconds)
    db.commit()
    db.refresh(session)
    user_cache.invalidate_user(user_id)

    return {
        "id": session.id,
        "status": session.status,
        "actual_duration_seconds": session.actual_duration_seconds,
    }


def resume_pomodoro_session(
    db: Session,
    user_id: int,
    session_id: int,
) -> dict | None:
    session = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.id == session_id,
            PomodoroSession.user_id == user_id,
        )
        .first()
    )

    if not session:
        return None

    session.status = "running"
    db.commit()
    db.refresh(session)
    user_cache.invalidate_user(user_id)

    return {
        "id": session.id,
        "status": session.status,
    }


def complete_pomodoro_session(
    db: Session,
    user_id: int,
    session_id: int,
    actual_duration_seconds: int,
) -> dict | None:
    session = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.id == session_id,
            PomodoroSession.user_id == user_id,
        )
        .first()
    )

    if not session:
        return None

    now = datetime.utcnow()
    session.status = "completed"
    session.actual_duration_seconds = actual_duration_seconds
    session.ended_at = now

    task_title = None
    if session.task_id:
        task = db.query(Task).filter(Task.id == session.task_id, Task.user_id == user_id).first()
        if task:
            task_title = task.title

    # Log real Developer Activity for completed focus sessions with upsert handling
    _upsert_pomodoro_developer_activity(
        db=db,
        user_id=user_id,
        session=session,
        actual_duration_seconds=actual_duration_seconds,
        task_title=task_title,
    )

    db.commit()
    db.refresh(session)
    user_cache.invalidate_user(user_id)

    return {
        "id": session.id,
        "status": session.status,
        "actual_duration_seconds": session.actual_duration_seconds,
        "task_title": task_title,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
    }


def cancel_pomodoro_session(
    db: Session,
    user_id: int,
    session_id: int,
    elapsed_seconds: int,
) -> dict | None:
    session = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.id == session_id,
            PomodoroSession.user_id == user_id,
        )
        .first()
    )

    if not session:
        return None

    now = datetime.utcnow()
    session.status = "interrupted"
    session.actual_duration_seconds = elapsed_seconds
    session.ended_at = now

    task_title = None
    if session.task_id:
        task = db.query(Task).filter(Task.id == session.task_id, Task.user_id == user_id).first()
        if task:
            task_title = task.title

    # If user focused for at least 5 minutes before interrupting, record the partial focus time
    if session.session_type == "focus" and elapsed_seconds >= 300:
        _upsert_pomodoro_developer_activity(
            db=db,
            user_id=user_id,
            session=session,
            actual_duration_seconds=elapsed_seconds,
            task_title=task_title,
        )

    db.commit()
    db.refresh(session)
    user_cache.invalidate_user(user_id)

    return {
        "id": session.id,
        "status": session.status,
        "actual_duration_seconds": session.actual_duration_seconds,
    }


def get_active_pomodoro_session(
    db: Session,
    user_id: int,
) -> dict | None:
    session = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status.in_(["running", "paused"]),
        )
        .order_by(PomodoroSession.id.desc())
        .first()
    )

    if not session:
        return None

    task_title = None
    if session.task_id:
        task = db.query(Task).filter(Task.id == session.task_id, Task.user_id == user_id).first()
        if task:
            task_title = task.title

    return {
        "id": session.id,
        "task_id": session.task_id,
        "task_title": task_title,
        "session_type": session.session_type,
        "planned_duration_seconds": session.planned_duration_seconds,
        "actual_duration_seconds": session.actual_duration_seconds,
        "status": session.status,
        "cycle_number": session.cycle_number,
        "started_at": session.started_at.isoformat() if session.started_at else None,
    }


def get_pomodoro_stats(
    db: Session,
    user_id: int,
) -> dict:
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())

    # 1. Today's sessions & focus seconds
    today_sessions = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.created_at >= today_start,
        )
        .all()
    )

    today_completed_focus = [
        s for s in today_sessions
        if s.session_type == "focus" and s.status == "completed"
    ]

    today_focus_seconds = sum(
        s.actual_duration_seconds for s in today_sessions if s.session_type == "focus"
    )

    from app.models.user_settings import UserSettings
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    daily_goal_minutes = user_settings.daily_focus_target_minutes if (user_settings and user_settings.daily_focus_target_minutes) else 120
    cycle_max = user_settings.pomodoro_cycle_count if (user_settings and user_settings.pomodoro_cycle_count) else 4

    today_sessions_count = len(today_completed_focus)
    daily_goal_seconds = daily_goal_minutes * 60
    goal_progress_percent = min(100.0, round((today_focus_seconds / daily_goal_seconds) * 100, 1)) if daily_goal_seconds > 0 else 0
    avg_mins = round((today_focus_seconds / today_sessions_count / 60), 1) if today_sessions_count > 0 else 0

    # Current cycle: (completed today % cycle_max) + 1
    current_cycle = (today_sessions_count % cycle_max) + 1

    # 2. Weekly statistics (last 7 days)
    start_date = today - timedelta(days=6)
    start_datetime = datetime.combine(start_date, datetime.min.time())

    weekly_sessions = (
        db.query(PomodoroSession)
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.created_at >= start_datetime,
        )
        .all()
    )

    weekly_completed_focus = [
        s for s in weekly_sessions if s.session_type == "focus" and s.status == "completed"
    ]
    weekly_focus_seconds = sum(
        s.actual_duration_seconds for s in weekly_sessions if s.session_type == "focus"
    )

    # Group daily trend
    daily_focus_map = {}
    daily_count_map = {}
    for s in weekly_sessions:
        if s.session_type == "focus":
            d = s.created_at.date()
            daily_focus_map[d] = daily_focus_map.get(d, 0) + s.actual_duration_seconds
            if s.status == "completed":
                daily_count_map[d] = daily_count_map.get(d, 0) + 1

    weekly_trend = []
    for d in range(6, -1, -1):
        target_date = today - timedelta(days=d)
        focus_secs = daily_focus_map.get(target_date, 0)
        weekly_trend.append({
            "day": target_date.strftime("%a"),
            "date": str(target_date),
            "focus_minutes": round(focus_secs / 60, 1),
            "sessions_count": daily_count_map.get(target_date, 0),
        })

    return {
        "today_sessions_completed": today_sessions_count,
        "today_focus_seconds": today_focus_seconds,
        "daily_goal_seconds": daily_goal_seconds,
        "goal_progress_percent": goal_progress_percent,
        "avg_session_duration_minutes": avg_mins,
        "current_cycle": current_cycle,
        "weekly_sessions_count": len(weekly_completed_focus),
        "weekly_focus_seconds": weekly_focus_seconds,
        "weekly_trend": weekly_trend,
        "has_sessions": len(weekly_sessions) > 0 or len(today_sessions) > 0,
    }


def get_pomodoro_history(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
    status_filter: str | None = None,
) -> list[dict]:
    query = (
        db.query(PomodoroSession, Task.title.label("task_title"))
        .outerjoin(Task, PomodoroSession.task_id == Task.id)
        .filter(PomodoroSession.user_id == user_id)
    )

    if status_filter:
        query = query.filter(PomodoroSession.status == status_filter)

    records = (
        query.order_by(PomodoroSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    results = []
    for session, task_title in records:
        time_str = session.created_at.strftime("%H:%M") if session.created_at else ""
        date_str = str(session.created_at.date()) if session.created_at else ""
        results.append({
            "id": session.id,
            "session_type": session.session_type,
            "task_id": session.task_id,
            "task_title": task_title or "Unassigned Focus",
            "planned_duration_seconds": session.planned_duration_seconds,
            "actual_duration_seconds": session.actual_duration_seconds,
            "duration_minutes": max(1, session.actual_duration_seconds // 60) if session.actual_duration_seconds > 0 else (session.planned_duration_seconds // 60),
            "status": session.status,
            "cycle_number": session.cycle_number,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "date": date_str,
            "time": time_str,
        })

    return results
