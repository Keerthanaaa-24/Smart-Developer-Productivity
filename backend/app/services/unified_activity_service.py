from datetime import datetime, date, timedelta
from sqlalchemy import func, case
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection
from app.models.linkedin_connection import LinkedInConnection


# =========================================================
# ACTIVITY TAXONOMY & NORMALIZATION
# =========================================================

PLATFORM_CATEGORY_MAP = {
    "github": "coding",
    "vscode": "coding",
    "git": "coding",
    "coding": "coding",
    "leetcode": "problem_solving",
    "geeksforgeeks": "problem_solving",
    "hackerrank": "problem_solving",
    "codeforces": "problem_solving",
    "coursera": "learning",
    "nptel": "learning",
    "freecodecamp": "learning",
    "udemy": "learning",
    "edugen": "learning",
    "learning": "learning",
    "pomodoro": "productivity",
    "tasks": "productivity",
    "focus": "productivity",
    "deepwork": "productivity",
    "linkedin": "career",
    "naukri": "career",
    "career": "career",
    "manual": "other",
    "other": "other",
}

VALID_CATEGORIES = {
    "coding",
    "learning",
    "problem_solving",
    "productivity",
    "career",
    "other",
}


def normalize_category(platform: str, explicit_category: str | None = None) -> str:
    if explicit_category and explicit_category.lower() in VALID_CATEGORIES:
        return explicit_category.lower()
    plat_key = (platform or "").lower().strip()
    return PLATFORM_CATEGORY_MAP.get(plat_key, "other")


def is_activity_tracking_enabled(db: Session, user_id: int) -> bool:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings and settings.activity_tracking is False:
        return False
    return True


# =========================================================
# CORE ACTIVITY RECORDING & DEDUPLICATION
# =========================================================

def record_unified_activity(
    db: Session,
    user_id: int,
    platform: str,
    activity_type: str,
    title: str | None = None,
    message: str | None = None,
    details: str | None = None,
    category: str | None = None,
    duration_seconds: int = 0,
    started_at: datetime | None = None,
    ended_at: datetime | None = None,
    activity_date: date | None = None,
    source: str = "automatic",
    external_id: str | None = None,
    activity_count: int = 1,
) -> DeveloperActivity | None:
    # 1. Respect privacy / activity tracking setting
    if source != "manual" and not is_activity_tracking_enabled(db, user_id):
        return None

    now = datetime.utcnow()
    act_date = activity_date or (started_at.date() if started_at else now.date())
    normalized_cat = normalize_category(platform, category)
    plat_clean = platform.lower().strip()
    type_clean = activity_type.lower().strip()

    # 2. Strict Deduplication by external_id if provided
    if external_id:
        existing = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.user_id == user_id,
                DeveloperActivity.platform == plat_clean,
                DeveloperActivity.external_id == external_id,
            )
            .first()
        )
        if existing:
            # Update existing record if needed without creating duplicate
            existing.message = message or existing.message
            existing.details = details or existing.details
            existing.duration_seconds = max(existing.duration_seconds, duration_seconds)
            if ended_at:
                existing.ended_at = ended_at
            db.commit()
            db.refresh(existing)
            return existing

    # 3. Create new discrete activity record
    activity = DeveloperActivity(
        user_id=user_id,
        platform=plat_clean,
        category=normalized_cat,
        activity_type=type_clean,
        title=title or (message[:100] if message else f"{type_clean.capitalize()} on {plat_clean.capitalize()}"),
        message=message or f"Logged {type_clean} on {plat_clean}",
        details=details,
        activity_date=act_date,
        started_at=started_at or now,
        ended_at=ended_at or (now if duration_seconds > 0 else None),
        duration_seconds=max(0, duration_seconds),
        source=source,
        external_id=external_id,
        activity_count=max(1, activity_count),
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


# =========================================================
# MANUAL ACTIVITY
# =========================================================

def create_manual_activity(
    db: Session,
    user_id: int,
    platform: str,
    category: str,
    activity_type: str,
    title: str,
    description: str | None = None,
    duration_minutes: int = 0,
    activity_date: date | None = None,
) -> dict:
    if not title or not title.strip():
        raise HTTPException(status_code=400, detail="Activity title is required")

    duration_secs = max(0, duration_minutes * 60)
    now = datetime.utcnow()
    act_date = activity_date or now.date()

    act = record_unified_activity(
        db=db,
        user_id=user_id,
        platform=platform or "manual",
        category=category or "coding",
        activity_type=activity_type or "manual_activity",
        title=title.strip(),
        message=title.strip(),
        details=description.strip() if description else "Logged manually by user",
        duration_seconds=duration_secs,
        activity_date=act_date,
        source="manual",
        activity_count=1,
    )

    return {
        "id": act.id,
        "platform": act.platform,
        "category": act.category,
        "activity_type": act.activity_type,
        "title": act.title,
        "message": act.message,
        "duration_seconds": act.duration_seconds,
        "duration_minutes": duration_minutes,
        "activity_date": str(act.activity_date),
        "source": act.source,
        "created_at": act.created_at.isoformat() if act.created_at else None,
    }


# =========================================================
# TASK COMPLETION INTEGRATION
# =========================================================

def record_task_completed_activity(
    db: Session,
    user_id: int,
    task_id: int,
    task_title: str,
    priority: str = "Medium",
) -> DeveloperActivity | None:
    return record_unified_activity(
        db=db,
        user_id=user_id,
        platform="tasks",
        category="productivity",
        activity_type="task_completed",
        title=f"Completed Task: {task_title}",
        message=f"Completed task: {task_title} [{priority}]",
        details=f"Task ID #{task_id} completed successfully",
        duration_seconds=0,
        source="task_system",
        external_id=f"task_{task_id}",
        activity_count=1,
    )


# =========================================================
# QUERY & TIMELINE APIS
# =========================================================

def get_unified_activities(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
    category_filter: str | None = None,
    platform_filter: str | None = None,
    activity_type_filter: str | None = None,
    date_filter: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search_query: str | None = None,
) -> dict:
    from sqlalchemy import or_

    query = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_id)

    if category_filter and category_filter != "all":
        query = query.filter(DeveloperActivity.category == category_filter.lower())

    if platform_filter and platform_filter != "all":
        query = query.filter(DeveloperActivity.platform == platform_filter.lower())

    if activity_type_filter and activity_type_filter != "all":
        query = query.filter(DeveloperActivity.activity_type == activity_type_filter.lower())

    if date_filter:
        query = query.filter(DeveloperActivity.activity_date == date_filter)
    else:
        if start_date:
            query = query.filter(DeveloperActivity.activity_date >= start_date)
        if end_date:
            query = query.filter(DeveloperActivity.activity_date <= end_date)

    if search_query and search_query.strip():
        term = f"%{search_query.strip()}%"
        query = query.filter(
            or_(
                DeveloperActivity.title.ilike(term),
                DeveloperActivity.message.ilike(term),
                DeveloperActivity.details.ilike(term),
                DeveloperActivity.platform.ilike(term),
                DeveloperActivity.activity_type.ilike(term),
            )
        )

    total_count = query.count()

    activities = (
        query.order_by(DeveloperActivity.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = []
    for a in activities:
        time_str = a.created_at.strftime("%H:%M") if a.created_at else "00:00"
        date_str = str(a.activity_date) if a.activity_date else str(date.today())
        
        # Duration formatted
        secs = a.duration_seconds or 0
        dur_h = secs // 3600
        dur_m = (secs % 3600) // 60
        if dur_h > 0 and dur_m > 0:
            dur_formatted = f"{dur_h}h {dur_m}m"
        elif dur_h > 0:
            dur_formatted = f"{dur_h}h"
        elif dur_m > 0:
            dur_formatted = f"{dur_m}m"
        elif secs > 0:
            dur_formatted = f"{secs}s"
        else:
            dur_formatted = "Instant"

        items.append({
            "id": a.id,
            "platform": a.platform,
            "category": a.category or "other",
            "activity_type": a.activity_type,
            "title": a.title or a.message or "Developer Activity",
            "message": a.message or a.title or "",
            "details": a.details,
            "duration_seconds": secs,
            "duration_formatted": dur_formatted,
            "source": a.source or "automatic",
            "external_id": a.external_id,
            "activity_count": a.activity_count or 1,
            "activity_date": date_str,
            "time": time_str,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "activities": items,
    }


# =========================================================
# ACTIVITY SUMMARY & TIME BREAKDOWN
# =========================================================

def get_activity_summary(db: Session, user_id: int) -> dict:
    today = date.today()
    start_week = today - timedelta(days=6)

    # 1. Today's Activities
    today_records = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date == today,
        )
        .all()
    )

    today_cat_seconds = {cat: 0 for cat in VALID_CATEGORIES}
    today_cat_counts = {cat: 0 for cat in VALID_CATEGORIES}

    for a in today_records:
        cat = a.category if a.category in VALID_CATEGORIES else "other"
        today_cat_seconds[cat] += a.duration_seconds or 0
        today_cat_counts[cat] += a.activity_count or 1

    # 2. Last 7 Days Activities
    week_records = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date >= start_week,
            DeveloperActivity.activity_date <= today,
        )
        .all()
    )

    week_cat_seconds = {cat: 0 for cat in VALID_CATEGORIES}
    week_cat_counts = {cat: 0 for cat in VALID_CATEGORIES}

    for a in week_records:
        cat = a.category if a.category in VALID_CATEGORIES else "other"
        week_cat_seconds[cat] += a.duration_seconds or 0
        week_cat_counts[cat] += a.activity_count or 1

    # 3. Direct Pomodoro Session Query (Source of Truth for Focus Time)
    from app.models.pomodoro_session import PomodoroSession
    pomo_today = (
        db.query(
            func.coalesce(func.sum(PomodoroSession.actual_duration_seconds), 0).label("secs"),
            func.count(PomodoroSession.id).label("cnt"),
        )
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.session_type == "focus",
            PomodoroSession.status == "completed",
            func.date(PomodoroSession.started_at) == today,
        )
        .first()
    )
    pomo_today_secs = int(pomo_today.secs or 0) if pomo_today else 0
    pomo_today_cnt = int(pomo_today.cnt or 0) if pomo_today else 0

    pomo_week = (
        db.query(
            func.coalesce(func.sum(PomodoroSession.actual_duration_seconds), 0).label("secs"),
            func.count(PomodoroSession.id).label("cnt"),
        )
        .filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.session_type == "focus",
            PomodoroSession.status == "completed",
            func.date(PomodoroSession.started_at) >= start_week,
            func.date(PomodoroSession.started_at) <= today,
        )
        .first()
    )
    pomo_week_secs = int(pomo_week.secs or 0) if pomo_week else 0
    pomo_week_cnt = int(pomo_week.cnt or 0) if pomo_week else 0

    focus_today_secs = max(pomo_today_secs, today_cat_seconds["productivity"])
    focus_today_count = max(pomo_today_cnt, today_cat_counts["productivity"])
    focus_week_secs = max(pomo_week_secs, week_cat_seconds["productivity"])
    focus_week_count = max(pomo_week_cnt, week_cat_counts["productivity"])

    # Consolidated Learning + Problem Solving
    learning_today_secs = today_cat_seconds["learning"] + today_cat_seconds["problem_solving"]
    learning_today_count = today_cat_counts["learning"] + today_cat_counts["problem_solving"]
    learning_week_secs = week_cat_seconds["learning"] + week_cat_seconds["problem_solving"]
    learning_week_count = week_cat_counts["learning"] + week_cat_counts["problem_solving"]

    # Career Milestones
    career_acts = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.category == "career",
        )
        .all()
    )
    career_total = len(career_acts)
    career_apps = sum(1 for a in career_acts if a.activity_type in ("job_applied", "applied_for_job", "job_application", "job_saved") or "job" in a.activity_type or "applied" in a.activity_type)
    career_interviews = sum(1 for a in career_acts if "interview" in a.activity_type)
    career_assessments = sum(1 for a in career_acts if "assessment" in a.activity_type)
    career_offers = sum(1 for a in career_acts if "offer" in a.activity_type)

    # Format helper
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

    # Platform status checks
    gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
    lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
    fcc = db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).first()
    gfg = db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).first()
    nptel = db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).first()
    coursera = db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).first()
    linkedin = db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).first()

    today_plats = {a.platform.lower() for a in today_records}

    platforms_status = [
        {
            "key": "github",
            "name": "GitHub",
            "icon": "🐙",
            "connected": gh is not None,
            "status": "Active" if "github" in today_plats else ("Connected" if gh else "Not connected"),
            "sync_mode": "Automatic OAuth API",
        },
        {
            "key": "leetcode",
            "name": "LeetCode",
            "icon": "💻",
            "connected": lc is not None,
            "status": "Active" if "leetcode" in today_plats else ("Connected" if lc else "Not connected"),
            "sync_mode": "Public GraphQL",
        },
        {
            "key": "pomodoro",
            "name": "Pomodoro Focus",
            "icon": "⏱️",
            "connected": True,
            "status": "Active" if "pomodoro" in today_plats or pomo_today_cnt > 0 else "Idle",
            "sync_mode": "Built-in Timer",
        },
        {
            "key": "tasks",
            "name": "Task System",
            "icon": "📋",
            "connected": True,
            "status": "Active" if "tasks" in today_plats else "Idle",
            "sync_mode": "Built-in Tasks",
        },
        {
            "key": "geeksforgeeks",
            "name": "GeeksforGeeks",
            "icon": "🟢",
            "connected": gfg is not None,
            "status": "Active" if "geeksforgeeks" in today_plats else ("Connected" if gfg else "Not connected"),
            "sync_mode": "Profile Telemetry",
        },
        {
            "key": "freecodecamp",
            "name": "freeCodeCamp",
            "icon": "🔥",
            "connected": fcc is not None,
            "status": "Active" if "freecodecamp" in today_plats else ("Connected" if fcc else "Not connected"),
            "sync_mode": "Profile Telemetry",
        },
        {
            "key": "coursera",
            "name": "Coursera",
            "icon": "📚",
            "connected": coursera is not None,
            "status": "Active" if "coursera" in today_plats else ("Connected" if coursera else "Manual Tracking"),
            "sync_mode": "Manual / Username",
        },
        {
            "key": "nptel",
            "name": "NPTEL",
            "icon": "🎓",
            "connected": nptel is not None,
            "status": "Active" if "nptel" in today_plats else ("Connected" if nptel else "Manual Tracking"),
            "sync_mode": "Manual / Username",
        },
        {
            "key": "linkedin",
            "name": "LinkedIn",
            "icon": "💼",
            "connected": linkedin is not None,
            "status": "Active" if "linkedin" in today_plats else ("Connected" if linkedin else "Manual Tracking"),
            "sync_mode": "Career Tracker",
        },
        {
            "key": "naukri",
            "name": "Naukri",
            "icon": "👔",
            "connected": False,
            "status": "Manual Tracking",
            "sync_mode": "Career Tracker",
        },
    ]

    return {
        "today": {
            "coding": {"seconds": today_cat_seconds["coding"], "formatted": fmt_dur(today_cat_seconds["coding"]), "count": today_cat_counts["coding"]},
            "learning": {"seconds": learning_today_secs, "formatted": fmt_dur(learning_today_secs), "count": learning_today_count},
            "problem_solving": {"seconds": today_cat_seconds["problem_solving"], "formatted": fmt_dur(today_cat_seconds["problem_solving"]), "count": today_cat_counts["problem_solving"]},
            "focus": {"seconds": focus_today_secs, "formatted": fmt_dur(focus_today_secs), "count": focus_today_count},
            "career": {"seconds": today_cat_seconds["career"], "formatted": fmt_dur(today_cat_seconds["career"]), "count": career_total},
            "total_activities": len(today_records),
        },
        "weekly": {
            "coding": {"seconds": week_cat_seconds["coding"], "formatted": fmt_dur(week_cat_seconds["coding"]), "count": week_cat_counts["coding"]},
            "learning": {"seconds": learning_week_secs, "formatted": fmt_dur(learning_week_secs), "count": learning_week_count},
            "problem_solving": {"seconds": week_cat_seconds["problem_solving"], "formatted": fmt_dur(week_cat_seconds["problem_solving"]), "count": week_cat_counts["problem_solving"]},
            "focus": {"seconds": focus_week_secs, "formatted": fmt_dur(focus_week_secs), "count": focus_week_count},
            "career": {"seconds": week_cat_seconds["career"], "formatted": fmt_dur(week_cat_seconds["career"]), "count": career_total},
            "total_activities": len(week_records),
        },
        "career_metrics": {
            "total": career_total,
            "applications": career_apps,
            "interviews": career_interviews,
            "assessments": career_assessments,
            "offers": career_offers,
        },
        "platforms": platforms_status,
    }


# =========================================================
# MULTI-PLATFORM ACTIVITY SYNC
# =========================================================

def sync_platform_activities(db: Session, user_id: int) -> dict:
    if not is_activity_tracking_enabled(db, user_id):
        return {
            "status": "disabled",
            "message": "Activity tracking is currently disabled in Settings.",
            "results": {},
        }

    results = {}

    # 1. GitHub Sync
    gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
    if gh:
        try:
            from app.services.github_service import get_github_events
            events = get_github_events(db, user_id) or []
            new_gh_count = 0
            for ev in events[:15]:
                ext_id = f"gh_ev_{ev.get('id', '')}"
                if not ext_id or ext_id == "gh_ev_":
                    continue
                recorded = record_unified_activity(
                    db=db,
                    user_id=user_id,
                    platform="github",
                    category="coding",
                    activity_type=ev.get("type", "PushEvent").replace("Event", "").lower(),
                    title=f"GitHub {ev.get('type', 'Activity')}",
                    message=ev.get("repo_name", "GitHub Repository Event"),
                    details=f"Event ID: {ev.get('id')}",
                    source="github_api",
                    external_id=ext_id,
                    activity_count=1,
                )
                if recorded:
                    new_gh_count += 1
            results["github"] = {"status": "synced", "items_processed": len(events), "new_recorded": new_gh_count}
        except Exception as e:
            results["github"] = {"status": "error", "error": str(e)}
    else:
        results["github"] = {"status": "not_connected"}

    # 2. LeetCode Status
    lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
    if lc:
        results["leetcode"] = {"status": "connected", "username": lc.leetcode_username, "message": "Synced via profile stats"}
    else:
        results["leetcode"] = {"status": "not_connected"}

    # 3. freeCodeCamp Status
    fcc = db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).first()
    if fcc:
        results["freecodecamp"] = {"status": "connected", "username": fcc.freecodecamp_username, "message": "Synced via profile stats"}
    else:
        results["freecodecamp"] = {"status": "not_connected"}

    # 4. GeeksforGeeks Status
    gfg = db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).first()
    if gfg:
        results["geeksforgeeks"] = {"status": "connected", "username": gfg.gfg_username, "message": "Synced via profile stats"}
    else:
        results["geeksforgeeks"] = {"status": "not_connected"}

    # 5. Coursera & NPTEL (No official real-time event webhooks without enterprise keys)
    coursera = db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).first()
    results["coursera"] = {"status": "connected" if coursera else "not_connected", "sync_mode": "Manual tracking available"}

    nptel = db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).first()
    results["nptel"] = {"status": "connected" if nptel else "not_connected", "sync_mode": "Manual tracking available"}

    return {
        "status": "success",
        "synced_at": datetime.utcnow().isoformat(),
        "results": results,
    }


# =========================================================
# CAREER ACTIVITY SUMMARY & TELEMETRY
# =========================================================

def get_career_summary(db: Session, user_id: int) -> dict:
    today = date.today()
    start_week = today - timedelta(days=6)

    career_acts = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.category == "career",
        )
        .order_by(DeveloperActivity.created_at.desc())
        .all()
    )

    total_count = len(career_acts)
    this_week_acts = [a for a in career_acts if a.activity_date and a.activity_date >= start_week]

    applications_count = sum(
        1 for a in career_acts if a.activity_type in ("job_applied", "applied_for_job", "job_application")
    )
    interviews_count = sum(1 for a in career_acts if "interview" in a.activity_type)
    assessments_count = sum(1 for a in career_acts if "assessment" in a.activity_type)
    profile_updates_count = sum(
        1 for a in career_acts if "profile" in a.activity_type or "resume" in a.activity_type
    )

    recent_career = []
    for a in career_acts[:8]:
        recent_career.append({
            "id": a.id,
            "platform": a.platform,
            "activity_type": a.activity_type,
            "title": a.title or a.message or "Career Event",
            "message": a.message or "",
            "details": a.details,
            "activity_date": str(a.activity_date) if a.activity_date else str(today),
            "source": a.source or "manual",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    linkedin_conn = db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).first()

    return {
        "summary": {
            "total_career_activities": total_count,
            "this_week_total": len(this_week_acts),
            "applications": applications_count,
            "interviews": interviews_count,
            "assessments": assessments_count,
            "profile_updates": profile_updates_count,
            "offers": sum(1 for a in career_acts if "offer" in a.activity_type),
        },
        "platforms": {
            "linkedin": {
                "connected": linkedin_conn is not None,
                "username": linkedin_conn.linkedin_username if linkedin_conn else None,
                "profile_url": linkedin_conn.profile_url if linkedin_conn else None,
                "sync_mode": "PROFILE ACCESS ONLY",
                "activity_mode": "Manual career milestone tracking",
                "notice": "Connected ≠ Automatically tracked. Open activity feed is restricted by LinkedIn.",
            },
            "naukri": {
                "connected": False,
                "sync_mode": "MANUAL ONLY",
                "activity_mode": "Manual job application & interview tracking",
                "notice": "No public job-seeker API available.",
            },
        },
        "recent_activities": recent_career,
        "recent_applications": recent_career[:5],
        "total": total_count,
    }


def create_or_update_career_application(
    db: Session,
    user_id: int,
    company: str,
    role: str,
    stage: str = "applied",
    platform: str = "linkedin",
    application_date: date | None = None,
    interview_date: str | None = None,
    notes: str | None = None,
    activity_id: int | None = None,
) -> dict:
    import json
    now = datetime.utcnow()
    act_date = application_date or now.date()
    stage_clean = stage.lower().strip()
    
    stage_map = {
        "saved": "job_saved",
        "applied": "job_applied",
        "assessment": "assessment_scheduled",
        "interview": "interview_scheduled",
        "offer": "offer_received",
        "rejected": "application_rejected",
        "withdrawn": "application_withdrawn",
    }
    act_type = stage_map.get(stage_clean, f"career_{stage_clean}")

    meta = {
        "company": company.strip(),
        "role": role.strip(),
        "stage": stage_clean,
        "platform": platform.lower().strip(),
        "interview_date": interview_date,
        "notes": notes.strip() if notes else "",
        "updated_at": now.isoformat(),
    }
    details_json = json.dumps(meta)

    title = f"{role.strip()} at {company.strip()}"
    message = f"Job Application: {role.strip()} at {company.strip()} [{stage_clean.capitalize()}]"

    if activity_id:
        existing = db.query(DeveloperActivity).filter(
            DeveloperActivity.id == activity_id,
            DeveloperActivity.user_id == user_id,
        ).first()
        if not existing:
            raise HTTPException(status_code=404, detail="Career application record not found")
        
        existing.title = title
        existing.message = message
        existing.details = details_json
        existing.activity_type = act_type
        existing.platform = platform.lower().strip()
        if application_date:
            existing.activity_date = act_date
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "title": existing.title,
            "company": company,
            "role": role,
            "stage": stage_clean,
            "platform": existing.platform,
            "activity_date": str(existing.activity_date),
            "interview_date": interview_date,
            "notes": notes,
            "message": "Career application updated successfully",
        }

    # Create new
    activity = DeveloperActivity(
        user_id=user_id,
        platform=platform.lower().strip(),
        category="career",
        activity_type=act_type,
        title=title,
        message=message,
        details=details_json,
        activity_date=act_date,
        started_at=now,
        duration_seconds=0,
        source="manual_career_tracker",
        activity_count=1,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    return {
        "id": activity.id,
        "title": activity.title,
        "company": company,
        "role": role,
        "stage": stage_clean,
        "platform": activity.platform,
        "activity_date": str(activity.activity_date),
        "interview_date": interview_date,
        "notes": notes,
        "message": "Career application logged successfully",
    }


def get_career_applications(db: Session, user_id: int) -> dict:
    import json
    acts = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.category == "career",
        )
        .order_by(DeveloperActivity.activity_date.desc(), DeveloperActivity.id.desc())
        .all()
    )

    pipeline = {
        "saved": [],
        "applied": [],
        "assessment": [],
        "interview": [],
        "offer": [],
        "rejected": [],
    }

    all_apps = []

    for a in acts:
        meta = {}
        if a.details:
            try:
                meta = json.loads(a.details)
            except Exception:
                meta = {"notes": a.details}

        # derive stage
        stage = meta.get("stage")
        if not stage:
            if "interview" in a.activity_type:
                stage = "interview"
            elif "assessment" in a.activity_type:
                stage = "assessment"
            elif "offer" in a.activity_type:
                stage = "offer"
            elif "reject" in a.activity_type:
                stage = "rejected"
            elif "save" in a.activity_type:
                stage = "saved"
            else:
                stage = "applied"

        company = meta.get("company") or (a.title.split(" at ")[-1] if " at " in a.title else "Company")
        role = meta.get("role") or (a.title.split(" at ")[0] if " at " in a.title else a.title)

        app_obj = {
            "id": a.id,
            "company": company,
            "role": role,
            "stage": stage,
            "platform": a.platform,
            "activity_type": a.activity_type,
            "application_date": str(a.activity_date) if a.activity_date else None,
            "interview_date": meta.get("interview_date"),
            "notes": meta.get("notes") or a.details or "",
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }

        all_apps.append(app_obj)
        if stage in pipeline:
            pipeline[stage].append(app_obj)
        else:
            pipeline["applied"].append(app_obj)

    return {
        "total": len(all_apps),
        "pipeline": pipeline,
        "applications": all_apps,
    }


# =========================================================
# PHASE 8: BROWSER EXTENSION ACTIVITY INGESTION
# =========================================================

SUPPORTED_EXTENSION_PLATFORMS = {
    "vscode": {
        "category": "coding",
        "default_title": "Active coding in VS Code",
        "default_type": "coding_session",
    },
    "github": {
        "category": "coding",
        "default_title": "Active development on GitHub",
        "default_type": "platform_session",
    },
    "leetcode": {
        "category": "problem_solving",
        "default_title": "Problem solving on LeetCode",
        "default_type": "platform_session",
    },
    "coursera": {
        "category": "learning",
        "default_title": "Learning session on Coursera",
        "default_type": "platform_session",
    },
    "nptel": {
        "category": "learning",
        "default_title": "Course session on NPTEL",
        "default_type": "platform_session",
    },
    "geeksforgeeks": {
        "category": "problem_solving",
        "default_title": "Technical practice on GeeksforGeeks",
        "default_type": "platform_session",
    },
    "freecodecamp": {
        "category": "learning",
        "default_title": "Coding practice on freeCodeCamp",
        "default_type": "platform_session",
    },
    "linkedin": {
        "category": "career",
        "default_title": "Platform visit on LinkedIn",
        "default_type": "platform_session",
    },
    "naukri": {
        "category": "career",
        "default_title": "Platform visit on Naukri",
        "default_type": "platform_session",
    },
}


def record_extension_activities(
    db: Session,
    user_id: int,
    items: list[dict],
) -> dict:
    """
    Ingests, validates, deduplicates, and persists browser extension activity records.
    Strictly enforces domain whitelist, privacy consent, and reasonable duration bounds.
    """
    # 1. Respect Privacy / Activity Tracking Setting
    tracking_enabled = is_activity_tracking_enabled(db, user_id)
    if not tracking_enabled:
        return {
            "status": "disabled",
            "message": "Activity tracking is currently disabled in User Settings.",
            "synced_count": 0,
            "duplicate_count": 0,
            "ignored_count": len(items),
            "synced_items": [],
        }

    synced_items = []
    duplicate_count = 0
    ignored_count = 0

    now = datetime.utcnow()

    for item in items:
        raw_platform = str(item.get("platform", "")).lower().strip()
        if raw_platform not in SUPPORTED_EXTENSION_PLATFORMS:
            ignored_count += 1
            continue

        platform_config = SUPPORTED_EXTENSION_PLATFORMS[raw_platform]
        category = platform_config["category"]

        # Duration validation (max 24 hours per session segment)
        try:
            duration_secs = int(item.get("duration_seconds", 0))
        except (ValueError, TypeError):
            duration_secs = 0

        if duration_secs < 0 or duration_secs > 86400:
            ignored_count += 1
            continue

        # Timestamps
        started_at = None
        ended_at = None
        raw_started = item.get("started_at")
        raw_ended = item.get("ended_at")

        if raw_started:
            try:
                started_at = datetime.fromisoformat(str(raw_started).replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                started_at = now - timedelta(seconds=duration_secs)
        else:
            started_at = now - timedelta(seconds=duration_secs)

        if raw_ended:
            try:
                ended_at = datetime.fromisoformat(str(raw_ended).replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                ended_at = now
        else:
            ended_at = now

        act_date = started_at.date() if started_at else now.date()

        # Deduplication via client-generated event ID
        event_id = item.get("extension_event_id") or item.get("event_id")
        external_id = f"ext_{event_id}" if event_id else None

        if external_id:
            existing = (
                db.query(DeveloperActivity)
                .filter(
                    DeveloperActivity.user_id == user_id,
                    DeveloperActivity.platform == raw_platform,
                    DeveloperActivity.external_id == external_id,
                )
                .first()
            )
            if existing:
                duplicate_count += 1
                synced_items.append({
                    "id": existing.id,
                    "platform": existing.platform,
                    "external_id": existing.external_id,
                    "status": "already_synced",
                })
                continue

        # Create human-readable title without scraping or private page content
        duration_mins = max(1, round(duration_secs / 60)) if duration_secs > 0 else 0
        title = item.get("title") or platform_config["default_title"]
        if duration_mins > 0:
            message = f"Active session on {raw_platform.capitalize()} ({duration_mins}m)"
        else:
            message = f"Active session on {raw_platform.capitalize()}"

        details = item.get("details") or f"Active browser session verified via Extension ({duration_secs}s active duration)"
        activity_type = item.get("activity_type") or platform_config["default_type"]

        activity = DeveloperActivity(
            user_id=user_id,
            platform=raw_platform,
            category=category,
            activity_type=activity_type,
            title=title,
            message=message,
            details=details,
            activity_date=act_date,
            started_at=started_at,
            ended_at=ended_at,
            duration_seconds=duration_secs,
            source=item.get("source") or ("vscode_extension" if raw_platform == "vscode" else "browser_extension"),
            external_id=external_id,
            activity_count=1,
        )
        db.add(activity)
        db.flush()
        db.refresh(activity)

        synced_items.append({
            "id": activity.id,
            "platform": activity.platform,
            "category": activity.category,
            "activity_type": activity.activity_type,
            "duration_seconds": activity.duration_seconds,
            "activity_date": str(activity.activity_date),
            "external_id": activity.external_id,
            "status": "created",
        })

    db.commit()

    return {
        "status": "success",
        "synced_count": len([i for i in synced_items if i.get("status") == "created"]),
        "duplicate_count": duplicate_count,
        "ignored_count": ignored_count,
        "synced_items": synced_items,
    }


def create_or_update_career_application(
    db: Session,
    user_id: int,
    company: str,
    role: str,
    stage: str = "applied",
    platform: str = "linkedin",
    application_date: date | None = None,
    interview_date: str | None = None,
    notes: str | None = None,
    activity_id: int | None = None,
):
    import json
    act_date = application_date or date.today()
    stage_normalized = (stage or "applied").lower().strip()

    # Map stage to standard activity_type
    type_map = {
        "saved": "job_saved",
        "applied": "job_applied",
        "assessment": "assessment_completed",
        "interview": "interview_scheduled",
        "offer": "offer_received",
        "rejected": "application_rejected",
        "withdrawn": "application_withdrawn",
    }
    activity_type = type_map.get(stage_normalized, "job_applied")

    details_obj = {
        "company": company.strip(),
        "role": role.strip(),
        "stage": stage_normalized,
        "interview_date": interview_date,
        "notes": notes,
        "updated_at": datetime.utcnow().isoformat(),
    }

    title = f"{role.strip()} at {company.strip()}"
    message = f"Career Application: {stage_normalized.capitalize()} for {role.strip()} at {company.strip()} via {platform.capitalize()}"

    if activity_id:
        record = (
            db.query(DeveloperActivity)
            .filter(
                DeveloperActivity.id == activity_id,
                DeveloperActivity.user_id == user_id,
            )
            .first()
        )
        if not record:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Career application not found")

        record.category = "career"
        record.activity_type = activity_type
        record.platform = platform
        record.title = title
        record.message = message
        record.details = json.dumps(details_obj)
        if application_date:
            record.activity_date = application_date
        db.commit()
        db.refresh(record)
        return {
            "id": record.id,
            "company": company.strip(),
            "role": role.strip(),
            "stage": stage_normalized,
            "platform": record.platform,
            "application_date": str(record.activity_date),
            "interview_date": interview_date,
            "notes": notes,
            "message": "Career application updated successfully",
        }
    else:
        record = DeveloperActivity(
            user_id=user_id,
            platform=platform,
            category="career",
            activity_type=activity_type,
            title=title,
            message=message,
            details=json.dumps(details_obj),
            activity_date=act_date,
            started_at=datetime.utcnow(),
            ended_at=datetime.utcnow(),
            duration_seconds=0,
            source="career_tracker",
            activity_count=1,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "id": record.id,
            "company": company.strip(),
            "role": role.strip(),
            "stage": stage_normalized,
            "platform": record.platform,
            "application_date": str(record.activity_date),
            "interview_date": interview_date,
            "notes": notes,
            "message": "Career application recorded successfully",
        }


def get_career_applications(db: Session, user_id: int):
    import json
    records = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.category == "career",
        )
        .order_by(DeveloperActivity.activity_date.desc(), DeveloperActivity.id.desc())
        .all()
    )

    apps = []
    submitted = 0
    interviews = 0
    assessments = 0
    offers = 0
    updates = 0

    for r in records:
        details_data = {}
        if r.details:
            try:
                details_data = json.loads(r.details)
            except Exception:
                details_data = {"raw": r.details}

        stage = details_data.get("stage")
        if not stage:
            if r.activity_type in ["job_applied", "application_submitted"]:
                stage = "applied"
            elif r.activity_type in ["interview_scheduled", "interview"]:
                stage = "interview"
            elif r.activity_type in ["assessment_completed", "assessment"]:
                stage = "assessment"
            elif r.activity_type in ["offer_received", "offer"]:
                stage = "offer"
            elif r.activity_type in ["job_saved", "saved"]:
                stage = "saved"
            else:
                stage = "applied"

        if stage in ["applied", "assessment", "interview", "offer", "rejected"]:
            submitted += 1
        if stage == "interview" or r.activity_type in ["interview_scheduled", "interview"]:
            interviews += 1
        if stage == "assessment" or r.activity_type in ["assessment_completed", "assessment"]:
            assessments += 1
        if stage == "offer" or r.activity_type in ["offer_received", "offer"]:
            offers += 1
        if r.activity_type in ["resume_update", "profile_update"]:
            updates += 1

        company = details_data.get("company")
        role = details_data.get("role")
        if not company or not role:
            if " at " in (r.title or ""):
                parts = r.title.split(" at ", 1)
                role = role or parts[0]
                company = company or parts[1]
            else:
                role = role or (r.title or "Developer Role")
                company = company or (r.platform.capitalize() if r.platform else "Tech Company")

        apps.append({
            "id": r.id,
            "company": company,
            "role": role,
            "stage": stage,
            "platform": r.platform,
            "application_date": str(r.activity_date) if r.activity_date else str(date.today()),
            "interview_date": details_data.get("interview_date"),
            "notes": details_data.get("notes") or r.message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    pipeline = {
        "saved": [],
        "applied": [],
        "assessment": [],
        "interview": [],
        "offer": [],
        "rejected": [],
    }

    for app in apps:
        stg = app.get("stage")
        if stg in pipeline:
            pipeline[stg].append(app)
        else:
            pipeline["applied"].append(app)

    return {
        "total": len(apps),
        "pipeline": pipeline,
        "applications": apps,
        "metrics": {
            "applications_submitted": submitted,
            "interviews_scheduled": interviews,
            "assessments_completed": assessments,
            "offers_received": offers,
            "profile_updates": updates,
        },
    }


