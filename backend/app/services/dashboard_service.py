from datetime import date, timedelta
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.task import Task

from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection
from app.models.linkedin_connection import LinkedInConnection

from app.models.developer_activity import DeveloperActivity
from app.services.developer_streak_service import get_developer_streak


def clamp_score(value):
    return round(
        max(0, min(float(value), 100)),
        2,
    )


def get_dashboard_stats(
    db: Session,
    user_id: int,
):
    # =====================================================
    # TASKS (Single aggregation query)
    # =====================================================

    task_aggregates = db.query(
        func.count(Task.id).label("total_tasks"),
        func.coalesce(func.sum(case((Task.status == "Completed", 1), else_=0)), 0).label("completed_tasks"),
        func.coalesce(func.sum(case((Task.status == "Pending", 1), else_=0)), 0).label("pending_tasks"),
        func.coalesce(func.sum(case((Task.priority == "High", 1), else_=0)), 0).label("high_priority_tasks"),
    ).filter(
        Task.user_id == user_id
    ).first()

    total_tasks = int(task_aggregates.total_tasks) if task_aggregates else 0
    completed_tasks = int(task_aggregates.completed_tasks) if task_aggregates else 0
    pending_tasks = int(task_aggregates.pending_tasks) if task_aggregates else 0
    high_priority_tasks = int(task_aggregates.high_priority_tasks) if task_aggregates else 0

    completion_rate = 0

    if total_tasks:
        completion_rate = (
            completed_tasks /
            total_tasks
        ) * 100

    completion_rate = clamp_score(
        completion_rate
    )

    # =====================================================
    # PLATFORM CONNECTIONS
    # =====================================================

    github = db.query(
        GitHubConnection
    ).filter(
        GitHubConnection.user_id == user_id
    ).first()

    leetcode = db.query(
        LeetCodeConnection
    ).filter(
        LeetCodeConnection.user_id == user_id
    ).first()

    freecodecamp = db.query(
        FreeCodeCampConnection
    ).filter(
        FreeCodeCampConnection.user_id == user_id
    ).first()

    geeksforgeeks = db.query(
        GeeksForGeeksConnection
    ).filter(
        GeeksForGeeksConnection.user_id == user_id
    ).first()

    nptel = db.query(
        NPTELConnection
    ).filter(
        NPTELConnection.user_id == user_id
    ).first()

    coursera = db.query(
        CourseraConnection
    ).filter(
        CourseraConnection.user_id == user_id
    ).first()

    # =====================================================
    # LEETCODE
    # =====================================================

    leetcode_score = 0

    if leetcode:

        problems = leetcode.problems_solved or 0
        rating = leetcode.contest_rating or 0

        problem_score = min(
            problems / 2,
            50,
        )

        rating_score = min(
            rating / 40,
            25,
        )

        difficulty_score = min(
            (
                (leetcode.easy_solved or 0)
                + (leetcode.medium_solved or 0) * 2
                + (leetcode.hard_solved or 0) * 3
            ) / 20,
            25,
        )

        leetcode_score = (
            problem_score
            + rating_score
            + difficulty_score
        )

    leetcode_score = clamp_score(
        leetcode_score
    )

    # =====================================================
    # GEEKSFORGEEKS
    # =====================================================

    gfg_score = 0

    if geeksforgeeks:

        problems = (
            geeksforgeeks.problems_solved or 0
        )

        coding = (
            geeksforgeeks.coding_score or 0
        )

        articles = (
            geeksforgeeks.articles_published or 0
        )

        courses = (
            geeksforgeeks.courses_completed or 0
        )

        gfg_score = (
            min(problems / 2, 40)
            + min(coding / 2, 30)
            + min(articles * 2, 10)
            + min(courses * 5, 20)
        )

    gfg_score = clamp_score(
        gfg_score
    )

    # =====================================================
    # GITHUB
    # =====================================================

    github_score = 0

    if github:
        github_score = 25

    # =====================================================
    # FREECODECAMP
    # =====================================================

    freecodecamp_score = 0

    if freecodecamp:

        certifications = (
            freecodecamp.certifications_count or 0
        )

        freecodecamp_score = min(
            certifications * 10,
            100,
        )

    freecodecamp_score = clamp_score(
        freecodecamp_score
    )

    # =====================================================
    # NPTEL
    # =====================================================

    nptel_score = 0

    if nptel:

        completed = (
            nptel.courses_completed or 0
        )

        certificates = (
            nptel.certificates_count or 0
        )

        nptel_score = (
            min(completed * 10, 60)
            + min(certificates * 20, 40)
        )

    nptel_score = clamp_score(
        nptel_score
    )

    # =====================================================
    # COURSERA
    # =====================================================

    coursera_score = 0

    if coursera:

        completed = (
            coursera.courses_completed or 0
        )

        certificates = (
            coursera.certificates_count or 0
        )

        progress = (
            coursera.courses_in_progress or 0
        )

        coursera_score = (
            min(completed * 10, 50)
            + min(certificates * 15, 30)
            + min(progress * 5, 20)
        )

    coursera_score = clamp_score(
        coursera_score
    )

    # =====================================================
    # CODING SCORE
    # 60% OF OVERALL
    # =====================================================

    coding_scores = []

    if github:
        coding_scores.append(
            github_score
        )

    if leetcode:
        coding_scores.append(
            leetcode_score
        )

    if geeksforgeeks:
        coding_scores.append(
            gfg_score
        )

    if coding_scores:

        coding_score = (
            sum(coding_scores) /
            len(coding_scores)
        )

    else:
        coding_score = 0

    coding_score = clamp_score(
        coding_score
    )

    # =====================================================
    # LEARNING SCORE
    # 20% OF OVERALL
    # =====================================================

    learning_scores = []

    if freecodecamp:
        learning_scores.append(
            freecodecamp_score
        )

    if nptel:
        learning_scores.append(
            nptel_score
        )

    if coursera:
        learning_scores.append(
            coursera_score
        )

    if learning_scores:

        learning_score = (
            sum(learning_scores) /
            len(learning_scores)
        )

    else:
        learning_score = 0

    learning_score = clamp_score(
        learning_score
    )

    # =====================================================
    # ACTIVITY DATA
    # =====================================================

    total_activity_seconds = int(
        db.query(
            func.coalesce(func.sum(DeveloperActivity.duration_seconds), 0)
        ).filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.ended_at.is_not(None),
        ).scalar() or 0
    )

    # =====================================================
    # CONSISTENCY SCORE
    # 20% OF OVERALL
    #
    # 2 hours total activity = 100
    # This is a simple baseline and can be improved later.
    # =====================================================

    consistency_score = min(
        (
            total_activity_seconds /
            3600
        ) * 50,
        100,
    )

    # Task completion contributes to consistency
    consistency_score = (
        consistency_score * 0.80
        + completion_rate * 0.20
    )

    consistency_score = clamp_score(
        consistency_score
    )

    # =====================================================
    # OVERALL SCORE
    #
    # 60% CODING
    # 20% LEARNING
    # 20% CONSISTENCY
    # =====================================================

    overall_score = (
        coding_score * 0.60
        + learning_score * 0.20
        + consistency_score * 0.20
    )

    overall_score = clamp_score(
        overall_score
    )

    # =====================================================
    # PLATFORM STATUS
    # =====================================================

    platforms = {
        "github": github is not None,
        "leetcode": leetcode is not None,
        "freecodecamp": freecodecamp is not None,
        "geeksforgeeks": geeksforgeeks is not None,
        "nptel": nptel is not None,
        "coursera": coursera is not None,
    }

    # =====================================================
    # RECENT ACTIVITY (Limit 10)
    # =====================================================

    recent_activities = db.query(
        DeveloperActivity
    ).filter(
        DeveloperActivity.user_id == user_id,
        DeveloperActivity.ended_at.is_not(None),
    ).order_by(
        DeveloperActivity.ended_at.desc()
    ).limit(10).all()

    recent_activity = []

    for activity in recent_activities:

        seconds = activity.duration_seconds or 0

        hours = seconds // 3600
        minutes = (seconds % 3600) // 60

        if hours > 0:
            duration = f"{hours}h {minutes}m"
        else:
            duration = f"{minutes}m"

        recent_activity.append({
            "id": activity.id,
            "platform": activity.platform,
            "activity_type": activity.activity_type,
            "duration_seconds": seconds,
            "duration": duration,
            "started_at": activity.started_at,
            "ended_at": activity.ended_at,
        })

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "high_priority_tasks": high_priority_tasks,
        "completion_rate": completion_rate,

        "overall_score": overall_score,
        "coding_score": coding_score,
        "learning_score": learning_score,
        "consistency_score": consistency_score,

        "platform_scores": {
            "github": github_score,
            "leetcode": leetcode_score,
            "freecodecamp": freecodecamp_score,
            "geeksforgeeks": gfg_score,
            "nptel": nptel_score,
            "coursera": coursera_score,
        },

        "platform_connections": platforms,

        "connected_platforms": sum(
            platforms.values()
        ),

        "total_platforms": 6,

        "total_activity_seconds":
            total_activity_seconds,

        "recent_activity":
            recent_activity,
    }


# =========================================================
# SMART DEVELOPER COMMAND CENTER (DASHBOARD 2.0 & 5 CORE METRICS)
# =========================================================

def calculate_productivity_score(
    coding_seconds: int,
    focus_seconds: int,
    tasks_completed: int,
    total_tasks: int,
    login_streak: int,
    target_coding_hours: float = 2.0,
    target_focus_minutes: int = 120,
    github_activities: int = 0,
) -> tuple[float, dict]:
    """
    Transparent 5-Metric Developer Productivity Score (0 - 100):
    1. Coding Progress (35%): Based on verified coding duration (or commits if duration not available) normalized against daily coding goal.
    2. Focus Goal Completion (25%): Based on verified Pomodoro focus duration normalized against daily focus goal.
    3. Task Execution (25%): Based on completed tasks and task completion percentage.
    4. Login Consistency (15%): Based on genuine consecutive daily application login streak.
    """
    # 1. Coding Progress (0 - 35 pts)
    target_coding_secs = max(1800, int(target_coding_hours * 3600))
    if coding_seconds > 0:
        coding_pts = min(35.0, (coding_seconds / target_coding_secs) * 35.0)
    elif github_activities > 0:
        coding_pts = min(35.0, (github_activities / 4.0) * 35.0)
    else:
        coding_pts = 0.0

    # 2. Focus / Pomodoro Goal (0 - 25 pts)
    target_focus_secs = max(1500, int(target_focus_minutes * 60))
    focus_pts = min(25.0, (focus_seconds / target_focus_secs) * 25.0)

    # 3. Task Execution (0 - 25 pts)
    if total_tasks > 0:
        task_pts = (tasks_completed / total_tasks) * 25.0
    elif tasks_completed > 0:
        task_pts = min(25.0, tasks_completed * 12.5)
    else:
        task_pts = 0.0

    # 4. Login Consistency (0 - 15 pts)
    if login_streak >= 3:
        login_pts = 15.0
    elif login_streak == 2:
        login_pts = 12.0
    elif login_streak == 1:
        login_pts = 8.0
    else:
        login_pts = 0.0

    raw_total = coding_pts + focus_pts + task_pts + login_pts
    final_score = round(max(0.0, min(100.0, raw_total)), 1)

    breakdown = {
        "coding": round(coding_pts, 1),
        "focus": round(focus_pts, 1),
        "tasks": round(task_pts, 1),
        "login": round(login_pts, 1),
        "coding_max": 35.0,
        "focus_max": 25.0,
        "tasks_max": 25.0,
        "login_max": 15.0,
    }
    return final_score, breakdown


def generate_ai_insights(
    user_name: str,
    today_summary: dict,
    task_stats: dict,
    login_streak_data: dict,
    platforms: dict,
    weekly_productivity: list,
    career_summary: dict | None = None,
) -> list[str]:
    insights = []

    coding_secs = today_summary.get("coding_seconds", 0)
    focus_secs = today_summary.get("focus_seconds", 0)
    github_acts = today_summary.get("github_activities_today", 0)
    streak = login_streak_data.get("current_streak", 0)
    completed_tasks = task_stats.get("completed", 0)
    pending_tasks = task_stats.get("pending", 0)
    high_priority = task_stats.get("high_priority", 0)
    overdue_tasks = task_stats.get("overdue", 0)

    has_activity = (
        coding_secs > 0
        or focus_secs > 0
        or github_acts > 0
        or completed_tasks > 0
        or streak > 0
        or (career_summary and career_summary.get("total", 0) > 0)
    )

    if not has_activity and task_stats.get("total", 0) == 0:
        return [
            "Welcome! Start tracking your coding, tasks, and focus sessions to receive personalized AI developer coaching."
        ]

    # 1. Coding & GitHub
    if coding_secs >= 7200 or github_acts >= 5:
        hours = round(coding_secs / 3600, 1)
        insights.append(
            f"Strong coding momentum today with {hours}h active development logged. Your repository output is high."
        )
    elif coding_secs > 0 or github_acts > 0:
        mins = int(coding_secs / 60)
        insights.append(
            f"Active coding session registered ({mins}m). Wrapping up with a clean git commit will preserve today's progress."
        )
    elif platforms.get("github", {}).get("connected"):
        insights.append(
            "No repository activity recorded yet today. An active coding block will boost your daily productivity score."
        )

    # 2. Career Insights
    if career_summary:
        summary_obj = career_summary.get("summary", career_summary) if isinstance(career_summary, dict) else {}
        apps = summary_obj.get("applications", 0)
        interviews = summary_obj.get("interviews", 0)
        assessments = summary_obj.get("assessments", 0)
        if apps >= 4 and interviews == 0:
            insights.append(
                f"High job search momentum with {apps} applications logged. Balance application volume with deep technical interview preparation."
            )
        elif interviews > 0:
            insights.append(
                f"You have {interviews} interview round(s) logged. Review core system design and problem-solving highlights."
            )
        elif assessments > 0:
            insights.append(
                f"Great job completing {assessments} technical assessment(s). Review any tricky questions to reinforce concepts."
            )

    # 3. Tasks
    if overdue_tasks > 0:
        insights.append(
            f"You have {overdue_tasks} overdue task(s) requiring attention. Clearing these prevents milestone delays."
        )
    elif high_priority > 0 and completed_tasks == 0:
        insights.append(
            f"You have {high_priority} high-priority task(s) queued. Tackling high-priority tasks early maximizes impact."
        )
    elif completed_tasks > 0:
        insights.append(
            f"Great task execution! You have completed {completed_tasks} task(s) today with a solid completion rate."
        )

    # 4. Streak & Focus
    if streak >= 3:
        insights.append(
            f"Your application login streak is thriving at {streak} consecutive days! Keep logging activity to maintain momentum."
        )
    elif streak == 1:
        insights.append(
            "Application login recorded for today! Consistency beats intensity—return tomorrow to keep your streak alive."
        )

    if focus_secs >= 1500:
        focus_mins = int(focus_secs / 60)
        insights.append(
            f"Deep work achieved: {focus_mins}m of focused Pomodoro time recorded today."
        )

    return insights[:4] if insights else [
        "Keep logging your daily developer activities to receive real-time personalized AI coaching."
    ]


def get_dashboard_overview(db: Session, user_id: int) -> dict:
    from app.models.user_settings import UserSettings
    from app.models.pomodoro_session import PomodoroSession
    from app.services.login_streak_service import get_login_streak
    from app.services.project_service import get_user_projects

    user = db.query(User).filter(User.id == user_id).first()
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    user_name = (
        settings.full_name.strip()
        if (settings and settings.full_name and settings.full_name.strip())
        else (user.username if user and user.username else "Developer")
    )
    user_email = user.email if user and user.email else ""
    today = date.today()

    target_coding_hours = float(settings.daily_coding_target_hours or 2.0) if settings else 2.0
    target_focus_minutes = int(settings.daily_focus_target_minutes or 120) if settings else 120

    # 1. Tasks Aggregates
    task_aggs = db.query(
        func.count(Task.id).label("total"),
        func.coalesce(func.sum(case((Task.status == "Completed", 1), else_=0)), 0).label("completed"),
        func.coalesce(func.sum(case((Task.status == "Pending", 1), else_=0)), 0).label("pending"),
        func.coalesce(func.sum(case((Task.priority == "High", 1), else_=0)), 0).label("high_priority"),
        func.coalesce(func.sum(case(((Task.due_date < today) & (Task.status != "Completed"), 1), else_=0)), 0).label("overdue"),
    ).filter(Task.user_id == user_id).first()

    total_tasks = int(task_aggs.total) if task_aggs else 0
    completed_tasks = int(task_aggs.completed) if task_aggs else 0
    pending_tasks = int(task_aggs.pending) if task_aggs else 0
    high_priority_tasks = int(task_aggs.high_priority) if task_aggs else 0
    overdue_tasks = int(task_aggs.overdue) if task_aggs else 0
    completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

    recent_tasks_db = db.query(Task).filter(Task.user_id == user_id).order_by(Task.id.desc()).limit(5).all()
    recent_tasks = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": str(t.due_date) if t.due_date else None,
        }
        for t in recent_tasks_db
    ]

    task_stats = {
        "total": total_tasks,
        "completed": completed_tasks,
        "pending": pending_tasks,
        "high_priority": high_priority_tasks,
        "overdue": overdue_tasks,
        "completion_rate": completion_rate,
        "recent_tasks": recent_tasks,
    }

    # 2. Today's Activity Breakdown
    today_acts = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_id,
        DeveloperActivity.activity_date == today,
    ).all()

    coding_seconds = 0
    learning_seconds = 0
    problem_solving_seconds = 0
    github_activities_today = 0
    today_platforms_set = set()

    for act in today_acts:
        plat = (act.platform or "").lower()
        cat = (act.category or "").lower()
        dur = act.duration_seconds or 0
        cnt = act.activity_count or 1
        today_platforms_set.add(plat)

        if cat == "coding" or plat in ("github", "vscode", "coding", "git"):
            if plat == "github":
                github_activities_today += cnt
            coding_seconds += dur
        elif cat == "problem_solving" or plat in ("leetcode", "geeksforgeeks", "hackerrank"):
            problem_solving_seconds += dur
        elif cat == "learning" or plat in ("freecodecamp", "coursera", "nptel"):
            learning_seconds += dur

    # 3. Focus / Pomodoro Time from verified completed sessions
    today_pomodoros = db.query(PomodoroSession).filter(
        PomodoroSession.user_id == user_id,
        PomodoroSession.status == "completed",
        func.date(PomodoroSession.started_at) == today,
    ).all()

    focus_seconds = sum(p.actual_duration_seconds or p.planned_duration_seconds or 0 for p in today_pomodoros)
    if focus_seconds == 0:
        # Check developer_activity for pomodoro events
        pom_acts = [a for a in today_acts if (a.platform == "pomodoro" or "focus" in (a.activity_type or "").lower())]
        focus_seconds = sum(a.duration_seconds or 0 for a in pom_acts)

    # Format helpers
    def fmt_dur(secs):
        if secs <= 0:
            return "0m"
        h = secs // 3600
        m = (secs % 3600) // 60
        if h > 0 and m > 0:
            return f"{h}h {m}m"
        if h > 0:
            return f"{h}h"
        return f"{m}m"

    # 4. Login Streak
    login_streak_data = get_login_streak(db, user_id)
    current_login_streak = login_streak_data.get("current_streak", 0)
    dev_streak = get_developer_streak(db, user_id)

    # 5. Productivity Score
    productivity_score, score_breakdown = calculate_productivity_score(
        coding_seconds=coding_seconds,
        focus_seconds=focus_seconds,
        tasks_completed=completed_tasks,
        total_tasks=total_tasks,
        login_streak=current_login_streak,
        target_coding_hours=target_coding_hours,
        target_focus_minutes=target_focus_minutes,
        github_activities=github_activities_today,
    )

    # 5 PRIMARY METRIC DATA OBJECTS
    coding_metric = {
        "seconds": coding_seconds,
        "formatted": fmt_dur(coding_seconds),
        "events_count": github_activities_today,
        "target_hours": target_coding_hours,
        "progress_pct": round(min(100.0, (coding_seconds / max(1800, target_coding_hours * 3600)) * 100), 1),
    }

    focus_metric = {
        "seconds": focus_seconds,
        "formatted": fmt_dur(focus_seconds),
        "completed_sessions": len(today_pomodoros),
        "target_minutes": target_focus_minutes,
        "progress_pct": round(min(100.0, (focus_seconds / max(1500, target_focus_minutes * 60)) * 100), 1),
    }

    tasks_metric = {
        "completed": completed_tasks,
        "total": total_tasks,
        "percentage": completion_rate,
        "pending": pending_tasks,
    }

    login_streak_metric = {
        "current_streak": current_login_streak,
        "longest_streak": login_streak_data.get("longest_streak", 0),
        "today_logged_in": login_streak_data.get("today_logged_in", False),
        "total_login_days": login_streak_data.get("total_login_days", 0),
    }

    productivity_metric = {
        "score": productivity_score,
        "breakdown": score_breakdown,
        "target_coding_hours": target_coding_hours,
        "target_focus_minutes": target_focus_minutes,
    }

    # GitHub aggregate stats
    gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
    total_github_stored = db.query(func.count(DeveloperActivity.id)).filter(
        DeveloperActivity.user_id == user_id,
        DeveloperActivity.platform == "github",
    ).scalar() or 0

    today_summary = {
        "coding_seconds": coding_seconds,
        "learning_seconds": learning_seconds,
        "problem_solving_seconds": problem_solving_seconds,
        "focus_seconds": focus_seconds,
        "github_activities_today": github_activities_today,
        "github_total_stored": total_github_stored,
        "github_connected": gh is not None,
        "github_username": gh.github_username if gh else None,
        "today_platforms": list(today_platforms_set),
        "productivity_score": productivity_score,
        "score_breakdown": score_breakdown,
        "has_activity_today": len(today_acts) > 0 or completed_tasks > 0 or login_streak_data.get("today_logged_in", False),
    }

    # 6. Connected Platforms & Telemetry Integration
    from app.services.platform_sync_service import platform_sync_service
    sync_status_data = platform_sync_service.get_sync_status(db, user_id)
    platforms = sync_status_data.get("platforms", {})
    platform_summary = sync_status_data.get("summary", {})

    # 7. Projects
    active_projects = get_user_projects(db, user_id, include_archived=False)

    # 8. Career Telemetry Summary
    from app.services.unified_activity_service import get_career_summary
    career_summary = get_career_summary(db, user_id)

    # 9. Weekly Trend (last 7 days)
    start_date = today - timedelta(days=6)
    weekly_db = dict(
        db.query(
            DeveloperActivity.activity_date,
            func.count(DeveloperActivity.id),
        )
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date >= start_date,
            DeveloperActivity.activity_date <= today,
        )
        .group_by(DeveloperActivity.activity_date)
        .all()
    )

    weekly_productivity = [
        {
            "day": (today - timedelta(days=d)).strftime("%a"),
            "date": str(today - timedelta(days=d)),
            "activities": weekly_db.get(today - timedelta(days=d), 0),
        }
        for d in range(6, -1, -1)
    ]

    # 10. Timeline / Recent Verified Activity
    recent_acts_db = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_id,
    ).order_by(DeveloperActivity.created_at.desc()).limit(8).all()

    timeline = []
    for a in recent_acts_db:
        time_str = a.created_at.strftime("%H:%M") if a.created_at else "Today"
        timeline.append({
            "id": a.id,
            "platform": a.platform,
            "activity_type": a.activity_type,
            "message": a.message or f"Activity on {a.platform}",
            "details": a.details,
            "duration_seconds": a.duration_seconds or 0,
            "source": a.source,
            "time": time_str,
            "date": str(a.activity_date),
        })

    # 11. AI Insights from Real Telemetry
    ai_insights = generate_ai_insights(
        user_name=user_name,
        today_summary=today_summary,
        task_stats=task_stats,
        login_streak_data=login_streak_data,
        platforms=platforms,
        weekly_productivity=weekly_productivity,
        career_summary=career_summary,
    )

    return {
        "user": {
            "id": user_id,
            "username": user_name,
            "email": user_email,
        },
        "primary_metrics": {
            "coding": coding_metric,
            "focus": focus_metric,
            "tasks": tasks_metric,
            "login_streak": login_streak_metric,
            "productivity": productivity_metric,
        },
        "today_summary": today_summary,
        "task_stats": task_stats,
        "streak": dev_streak,
        "platforms": platforms,
        "projects": active_projects[:4],
        "career_summary": career_summary,
        "weekly_productivity": weekly_productivity,
        "timeline": timeline,
        "ai_insights": ai_insights,
    }