"""
Data Trust Center & Integration Health Service
Provides deep provenance tracking, data freshness calculation, export functionality,
and overall ecosystem health diagnostics.
"""

import io
import csv
import json
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.models.linkedin_connection import LinkedInConnection
from app.models.pomodoro_session import PomodoroSession
from app.models.task import Task
from app.services.provider_registry import provider_registry, PROVIDER_CAPABILITY_REGISTRY


def _calculate_freshness(last_dt: Optional[datetime]) -> Dict[str, Any]:
    """Calculates human-readable freshness and freshness status tier."""
    if not last_dt:
        return {"freshness_label": "Not synced yet", "freshness_tier": "stale", "seconds_ago": None}

    now = datetime.utcnow()
    diff_seconds = max(0, int((now - last_dt).total_seconds()))

    if diff_seconds < 120:
        label = "Just now"
        tier = "fresh"
    elif diff_seconds < 3600:
        label = f"{diff_seconds // 60}m ago"
        tier = "fresh"
    elif diff_seconds < 86400:
        label = f"{diff_seconds // 3600}h ago"
        tier = "recent"
    elif diff_seconds < 86400 * 7:
        label = f"{diff_seconds // 86400}d ago"
        tier = "moderate"
    else:
        label = f"{diff_seconds // 86400}d ago (Stale)"
        tier = "stale"

    return {
        "freshness_label": label,
        "freshness_tier": tier,
        "seconds_ago": diff_seconds,
        "timestamp_utc": last_dt.isoformat() + "Z",
    }


def get_data_trust_center_overview(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Constructs the complete Data Trust Center & Integration Health report for a user.
    """
    now = datetime.utcnow()
    today = date.today()

    # 1. Fetch DB Connection entities
    gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
    lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
    fcc = db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).first()
    gfg = db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).first()
    coursera = db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).first()
    nptel = db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).first()
    linkedin = db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).first()

    # 2. Query stored activities provenance counts
    activities = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_id).all()
    total_activities = len(activities)

    provenance_counts = {
        "verified_provider": 0,
        "app_recorded": 0,
        "user_entered": 0,
        "estimated": 0,
    }

    platform_activity_counts: Dict[str, int] = {}
    for a in activities:
        plat = (a.platform or "other").lower()
        platform_activity_counts[plat] = platform_activity_counts.get(plat, 0) + (a.activity_count or 1)

        src = (a.source or "").lower()
        if src in ("github_api", "leetcode_api", "freecodecamp_api", "geeksforgeeks_api", "vscode_telemetry"):
            provenance_counts["verified_provider"] += 1
        elif src in ("pomodoro_timer", "task_system", "automatic"):
            provenance_counts["app_recorded"] += 1
        elif src in ("manual", "manual_career_tracker", "user_log"):
            provenance_counts["user_entered"] += 1
        else:
            provenance_counts["user_entered"] += 1

    # 3. Build Provider Health Diagnostics for each of the 8 accounts
    providers_health: List[Dict[str, Any]] = []

    # --- GitHub ---
    gh_connected = gh is not None and not getattr(gh, "token_expired", False)
    gh_status = "Connected" if gh_connected else ("Authorization expired" if (gh and getattr(gh, "token_expired", False)) else "Not connected")
    gh_last_sync = gh.updated_at if gh else None
    gh_profile_url = provider_registry.get_safe_destination_url("github", gh.github_username if gh else None, gh.profile_url if gh else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["github"],
        "connection_status": gh_status,
        "connected": gh_connected,
        "username": gh.github_username if gh else None,
        "display_profile_url": gh_profile_url,
        "last_successful_sync": gh_last_sync.isoformat() + "Z" if gh_last_sync else None,
        "last_attempted_sync": gh_last_sync.isoformat() + "Z" if gh_last_sync else None,
        "freshness": _calculate_freshness(gh_last_sync),
        "last_error": "OAuth token expired or revoked. Please reconnect." if (gh and getattr(gh, "token_expired", False)) else None,
        "total_events_stored": platform_activity_counts.get("github", 0),
        "supported_actions": ["connect", "reconnect", "disconnect", "open_profile", "open_dashboard", "sync"] if gh else ["connect", "open_dashboard"],
    })

    # --- LeetCode ---
    lc_connected = lc is not None and bool(lc.leetcode_username)
    lc_status = "Connected" if lc_connected else "Not connected"
    lc_last_sync = lc.updated_at if lc else None
    lc_profile_url = provider_registry.get_safe_destination_url("leetcode", lc.leetcode_username if lc else None, lc.profile_url if lc else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["leetcode"],
        "connection_status": lc_status,
        "connected": lc_connected,
        "username": lc.leetcode_username if lc else None,
        "display_profile_url": lc_profile_url,
        "last_successful_sync": lc_last_sync.isoformat() + "Z" if lc_last_sync else None,
        "last_attempted_sync": lc_last_sync.isoformat() + "Z" if lc_last_sync else None,
        "freshness": _calculate_freshness(lc_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("leetcode", 0),
        "supported_actions": ["connect", "disconnect", "open_profile", "open_dashboard", "sync"] if lc else ["connect", "open_dashboard"],
    })

    # --- freeCodeCamp ---
    fcc_connected = fcc is not None and bool(fcc.freecodecamp_username)
    fcc_status = "Connected" if fcc_connected else "Not connected"
    fcc_last_sync = fcc.updated_at if fcc else None
    fcc_profile_url = provider_registry.get_safe_destination_url("freecodecamp", fcc.freecodecamp_username if fcc else None, fcc.profile_url if fcc else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["freecodecamp"],
        "connection_status": fcc_status,
        "connected": fcc_connected,
        "username": fcc.freecodecamp_username if fcc else None,
        "display_profile_url": fcc_profile_url,
        "last_successful_sync": fcc_last_sync.isoformat() + "Z" if fcc_last_sync else None,
        "last_attempted_sync": fcc_last_sync.isoformat() + "Z" if fcc_last_sync else None,
        "freshness": _calculate_freshness(fcc_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("freecodecamp", 0),
        "supported_actions": ["connect", "disconnect", "open_profile", "open_dashboard", "sync"] if fcc else ["connect", "open_dashboard"],
    })

    # --- GeeksforGeeks ---
    gfg_connected = gfg is not None and bool(gfg.gfg_username)
    gfg_status = "Connected" if gfg_connected else "Not connected"
    gfg_last_sync = gfg.updated_at if gfg else None
    gfg_profile_url = provider_registry.get_safe_destination_url("geeksforgeeks", gfg.gfg_username if gfg else None, gfg.profile_url if gfg else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["geeksforgeeks"],
        "connection_status": gfg_status,
        "connected": gfg_connected,
        "username": gfg.gfg_username if gfg else None,
        "display_profile_url": gfg_profile_url,
        "last_successful_sync": gfg_last_sync.isoformat() + "Z" if gfg_last_sync else None,
        "last_attempted_sync": gfg_last_sync.isoformat() + "Z" if gfg_last_sync else None,
        "freshness": _calculate_freshness(gfg_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("geeksforgeeks", 0),
        "supported_actions": ["connect", "disconnect", "open_profile", "open_dashboard", "sync"] if gfg else ["connect", "open_dashboard"],
    })

    # --- Coursera ---
    co_connected = coursera is not None and bool(coursera.coursera_username)
    co_status = "Connected" if co_connected else "Unsupported integration"
    co_last_sync = coursera.updated_at if coursera else None
    co_profile_url = provider_registry.get_safe_destination_url("coursera", coursera.coursera_username if coursera else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["coursera"],
        "connection_status": co_status,
        "connected": co_connected,
        "username": coursera.coursera_username if coursera else None,
        "display_profile_url": co_profile_url,
        "last_successful_sync": co_last_sync.isoformat() + "Z" if co_last_sync else None,
        "last_attempted_sync": co_last_sync.isoformat() + "Z" if co_last_sync else None,
        "freshness": _calculate_freshness(co_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("coursera", 0),
        "supported_actions": ["connect", "disconnect", "open_dashboard"],
    })

    # --- NPTEL ---
    nptel_connected = nptel is not None and bool(nptel.nptel_username)
    nptel_status = "Connected" if nptel_connected else "Unsupported integration"
    nptel_last_sync = nptel.updated_at if nptel else None
    nptel_profile_url = provider_registry.get_safe_destination_url("nptel", nptel.nptel_username if nptel else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["nptel"],
        "connection_status": nptel_status,
        "connected": nptel_connected,
        "username": nptel.nptel_username if nptel else None,
        "display_profile_url": nptel_profile_url,
        "last_successful_sync": nptel_last_sync.isoformat() + "Z" if nptel_last_sync else None,
        "last_attempted_sync": nptel_last_sync.isoformat() + "Z" if nptel_last_sync else None,
        "freshness": _calculate_freshness(nptel_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("nptel", 0),
        "supported_actions": ["connect", "disconnect", "open_dashboard"],
    })

    # --- LinkedIn ---
    li_connected = linkedin is not None and bool(linkedin.linkedin_username)
    li_status = "Connected" if li_connected else "Not connected"
    li_last_sync = linkedin.updated_at if linkedin else None
    li_profile_url = provider_registry.get_safe_destination_url("linkedin", linkedin.linkedin_username if linkedin else None, linkedin.profile_url if linkedin else None)
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["linkedin"],
        "connection_status": li_status,
        "connected": li_connected,
        "username": linkedin.linkedin_username if linkedin else None,
        "display_profile_url": li_profile_url,
        "last_successful_sync": li_last_sync.isoformat() + "Z" if li_last_sync else None,
        "last_attempted_sync": li_last_sync.isoformat() + "Z" if li_last_sync else None,
        "freshness": _calculate_freshness(li_last_sync),
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("linkedin", 0),
        "supported_actions": ["connect", "disconnect", "open_profile", "open_dashboard"],
    })

    # --- Naukri ---
    naukri_profile_url = provider_registry.get_safe_destination_url("naukri")
    providers_health.append({
        **PROVIDER_CAPABILITY_REGISTRY["naukri"],
        "connection_status": "Unsupported integration",
        "connected": False,
        "username": None,
        "display_profile_url": naukri_profile_url,
        "last_successful_sync": None,
        "last_attempted_sync": None,
        "freshness": {"freshness_label": "Manual pipeline", "freshness_tier": "manual", "seconds_ago": None},
        "last_error": None,
        "total_events_stored": platform_activity_counts.get("naukri", 0),
        "supported_actions": ["open_dashboard"],
    })

    # 4. Overall Health Calculations
    connected_count = sum(1 for p in providers_health if p["connected"])
    total_providers = len(providers_health)
    health_percentage = int((connected_count / 4) * 100) if connected_count <= 4 else 100

    overall_status = "optimal" if connected_count >= 3 else ("good" if connected_count >= 1 else "attention_needed")

    return {
        "user_id": user_id,
        "generated_at_utc": now.isoformat() + "Z",
        "overall_health": {
            "score": min(100, health_percentage),
            "status": overall_status,
            "connected_count": connected_count,
            "total_providers": total_providers,
            "total_verified_activities": total_activities,
        },
        "provenance_breakdown": {
            "total_records": total_activities,
            "counts": provenance_counts,
            "percentages": {
                k: round((v / total_activities * 100), 1) if total_activities > 0 else 0
                for k, v in provenance_counts.items()
            },
        },
        "providers": providers_health,
    }


def export_user_activity_telemetry(db: Session, user_id: int, export_format: str = "json") -> Dict[str, Any] | str:
    """
    Exports all activity records belonging to authenticated user with full provenance and UTC timestamps.
    """
    activities = (
        db.query(DeveloperActivity)
        .filter(DeveloperActivity.user_id == user_id)
        .order_by(DeveloperActivity.activity_date.desc(), DeveloperActivity.created_at.desc())
        .all()
    )

    records = []
    for a in activities:
        records.append({
            "id": a.id,
            "platform": a.platform,
            "category": a.category,
            "activity_type": a.activity_type,
            "title": a.title or "",
            "message": a.message or "",
            "details": a.details or "",
            "duration_seconds": a.duration_seconds or 0,
            "activity_count": a.activity_count or 1,
            "source": a.source or "automatic",
            "external_id": a.external_id or "",
            "activity_date": str(a.activity_date) if a.activity_date else "",
            "created_at_utc": a.created_at.isoformat() + "Z" if a.created_at else "",
            "started_at_utc": a.started_at.isoformat() + "Z" if a.started_at else "",
        })

    if export_format.lower() == "csv":
        output = io.StringIO()
        fieldnames = [
            "id",
            "platform",
            "category",
            "activity_type",
            "title",
            "message",
            "details",
            "duration_seconds",
            "activity_count",
            "source",
            "external_id",
            "activity_date",
            "created_at_utc",
            "started_at_utc",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow(r)
        return output.getvalue()

    return {
        "user_id": user_id,
        "exported_at_utc": datetime.utcnow().isoformat() + "Z",
        "total_records": len(records),
        "activities": records,
    }
