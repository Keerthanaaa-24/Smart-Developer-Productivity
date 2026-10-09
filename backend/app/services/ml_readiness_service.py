"""
ML Readiness & Dataset Audit Service (Phase 3)
Inspects MySQL activity records, browser telemetry, tasks, and connected platforms
to evaluate data coverage, missing rates, freshness, and forecast eligibility.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.browser_time_session import BrowserTimeSession
from app.models.pomodoro_session import PomodoroSession
from app.models.task import Task
from app.models.project import Project
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.linkedin_connection import LinkedInConnection


class MLReadinessService:
    """
    Evaluates dataset readiness, sample sizes, and feature coverage for ML models.
    """

    def audit_user_data_readiness(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Computes an exhaustive ML readiness and feature audit report for the authenticated user.
        """
        now = datetime.utcnow()
        today = date.today()
        start_30d = today - timedelta(days=30)
        start_90d = today - timedelta(days=90)

        # 1. Activities Audit
        activities = db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == user_id
        ).all()
        total_activities = len(activities)

        active_dates = set(a.activity_date for a in activities if a.activity_date)
        active_days_30d = len(set(a.activity_date for a in activities if a.activity_date and a.activity_date >= start_30d))
        
        # 2. Browser Telemetry Audit
        browser_sessions = db.query(BrowserTimeSession).filter(
            BrowserTimeSession.user_id == user_id
        ).all()
        total_browser_sessions = len(browser_sessions)
        total_browser_active_secs = sum(s.active_seconds for s in browser_sessions)

        # 3. Pomodoro Sessions Audit
        pomodoros = db.query(PomodoroSession).filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status == "completed",
        ).all()
        total_pomodoros = len(pomodoros)

        # 4. Tasks & Projects Audit
        tasks = db.query(Task).filter(Task.user_id == user_id).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == "Completed")
        projects = db.query(Project).filter(Project.user_id == user_id).all()
        total_projects = len(projects)

        # 5. Connected Account Signals Audit
        gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
        lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
        co = db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).first()
        nptel = db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).first()
        gfg = db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).first()
        fcc = db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).first()
        li = db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).first()

        connected_count = sum(1 for c in [gh, lc, co, nptel, gfg, fcc, li] if c is not None)

        # 6. Feature Coverage & Missing Rates (over 30-day window)
        days_window = 30
        coding_days = len(set(a.activity_date for a in activities if (a.category == "coding" or a.platform in ("github", "vscode")) and a.activity_date and a.activity_date >= start_30d))
        focus_days = len(set(p.started_at.date() for p in pomodoros if hasattr(p, "started_at") and p.started_at and p.started_at.date() >= start_30d))
        task_days = len(set(t.due_date for t in tasks if getattr(t, "due_date", None) and t.due_date >= start_30d and t.status == "Completed"))


        coverage_matrix = {
            "active_development_time": {
                "available_observations": coding_days,
                "coverage_pct": round((coding_days / days_window) * 100, 1),
                "missing_pct": round(((days_window - coding_days) / days_window) * 100, 1),
                "status": "sufficient" if coding_days >= 5 else "sparse",
            },
            "pomodoro_focus_sessions": {
                "available_observations": focus_days,
                "coverage_pct": round((focus_days / days_window) * 100, 1),
                "missing_pct": round(((days_window - focus_days) / days_window) * 100, 1),
                "status": "sufficient" if focus_days >= 3 else "sparse",
            },
            "task_completion_records": {
                "available_observations": completed_tasks,
                "coverage_pct": round((min(days_window, completed_tasks) / days_window) * 100, 1),
                "missing_pct": round(((days_window - min(days_window, completed_tasks)) / days_window) * 100, 1),
                "status": "sufficient" if completed_tasks >= 2 else "sparse",
            },
            "connected_platform_telemetry": {
                "available_integrations": connected_count,
                "total_supported": 8,
                "coverage_pct": round((connected_count / 8) * 100, 1),
                "status": "sufficient" if connected_count >= 2 else "sparse",
            },
        }

        # 7. Overall Readiness Classification
        is_sufficient_for_ml = (active_days_30d >= 3 or total_activities >= 10 or completed_tasks >= 3)
        readiness_status = "sufficient" if is_sufficient_for_ml else "insufficient_data"

        # Latest activity timestamp
        last_activity_dt = None
        if activities:
            sorted_acts = sorted([a.created_at for a in activities if a.created_at], reverse=True)
            if sorted_acts:
                last_activity_dt = sorted_acts[0]

        # Ecosystem dataset stats (global platform metadata)
        total_platform_users = db.query(User).count()
        total_platform_activities = db.query(DeveloperActivity).count()

        return {
            "user_id": user_id,
            "audited_at_utc": now.isoformat() + "Z",
            "readiness_status": readiness_status,
            "is_sufficient_for_forecasting": is_sufficient_for_ml,
            "minimum_data_threshold": "At least 3 active days of recorded activity or tasks",
            "readiness_summary": (
                "Dataset is sufficient for evidence-backed 7-day productivity forecasting and skill analysis."
                if is_sufficient_for_ml
                else "Insufficient historical data for a reliable statistical forecast. Connect platforms or log activity to unlock high-confidence predictions."
            ),
            "user_telemetry_stats": {
                "total_activity_events": total_activities,
                "distinct_active_days": len(active_dates),
                "active_days_past_30d": active_days_30d,
                "total_browser_sessions": total_browser_sessions,
                "total_browser_active_hours": round(total_browser_active_secs / 3600, 2),
                "completed_pomodoros": total_pomodoros,
                "completed_tasks": completed_tasks,
                "total_tasks": total_tasks,
                "total_projects": total_projects,
                "connected_accounts_count": connected_count,
                "last_activity_utc": last_activity_dt.isoformat() + "Z" if last_activity_dt else None,
            },
            "feature_coverage": coverage_matrix,
            "data_provenance_summary": {
                "verified_provider_events": sum(1 for a in activities if a.source in ("github_api", "leetcode_api", "freecodecamp_api", "geeksforgeeks_api")),
                "app_recorded_events": sum(1 for a in activities if a.source in ("browser_extension", "pomodoro_timer", "task_system", "automatic")),
                "user_entered_events": sum(1 for a in activities if a.source in ("manual", "manual_career_tracker", "user_log")),
            },
            "platform_wide_dataset_context": {
                "total_registered_users": total_platform_users,
                "total_recorded_activities": total_platform_activities,
                "training_split_policy": "Time-aware temporal split (no future data leakage)",
                "data_leakage_safeguard": "Strict multi-user isolation with user_id query bounds",
            }
        }


ml_readiness_service = MLReadinessService()
