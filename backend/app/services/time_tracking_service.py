"""
Time Tracking & Browser Telemetry Service
Handles active website session ingestion, server-side interval validation,
idempotent deduplication, idle exclusion, and comprehensive time analytics.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.browser_time_session import BrowserTimeSession
from app.models.developer_activity import DeveloperActivity
from app.models.user_settings import UserSettings
from app.core.cache import user_cache
from app.services.provider_registry import provider_registry, PROVIDER_CAPABILITY_REGISTRY
from app.services.unified_activity_service import (
    record_unified_activity,
    normalize_category,
    is_activity_tracking_enabled,
)

# Supported platform domains map
SUPPORTED_PLATFORMS_MAP = {
    "github": {
        "platform": "github",
        "name": "GitHub",
        "category": "coding",
        "domains": ["github.com", "gist.github.com"],
        "icon": "🐙",
    },
    "leetcode": {
        "platform": "leetcode",
        "name": "LeetCode",
        "category": "problem_solving",
        "domains": ["leetcode.com"],
        "icon": "💻",
    },
    "freecodecamp": {
        "platform": "freecodecamp",
        "name": "freeCodeCamp",
        "category": "learning",
        "domains": ["freecodecamp.org", "www.freecodecamp.org"],
        "icon": "🔥",
    },
    "geeksforgeeks": {
        "platform": "geeksforgeeks",
        "name": "GeeksforGeeks",
        "category": "problem_solving",
        "domains": ["geeksforgeeks.org", "www.geeksforgeeks.org", "practice.geeksforgeeks.org"],
        "icon": "🟢",
    },
    "coursera": {
        "platform": "coursera",
        "name": "Coursera",
        "category": "learning",
        "domains": ["coursera.org", "www.coursera.org"],
        "icon": "📚",
    },
    "nptel": {
        "platform": "nptel",
        "name": "NPTEL / Swayam",
        "category": "learning",
        "domains": ["nptel.ac.in", "archive.nptel.ac.in", "swayam.gov.in"],
        "icon": "🎓",
    },
    "linkedin": {
        "platform": "linkedin",
        "name": "LinkedIn",
        "category": "career",
        "domains": ["linkedin.com", "www.linkedin.com"],
        "icon": "💼",
    },
    "naukri": {
        "platform": "naukri",
        "name": "Naukri",
        "category": "career",
        "domains": ["naukri.com", "www.naukri.com"],
        "icon": "👔",
    },
    "vscode": {
        "platform": "vscode",
        "name": "VS Code / IDE",
        "category": "coding",
        "domains": ["vscode.dev", "github.dev"],
        "icon": "⚡",
    },
}

DEFAULT_IDLE_THRESHOLD_SECONDS = 60
MIN_VALID_SESSION_SECONDS = 3
MAX_SESSION_INTERVAL_SECONDS = 86400  # 24 hours max per session chunk


def _format_seconds(seconds: int) -> str:
    """Formats duration in seconds into human-readable representation."""
    if not seconds or seconds <= 0:
        return "0m"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0 and minutes > 0:
        return f"{hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h"
    if minutes > 0:
        return f"{minutes}m"
    return f"{secs}s"


class TimeTrackingService:
    """Core domain logic for browser session management and analytics."""

    def get_supported_platforms(self) -> List[Dict[str, Any]]:
        """Returns the list of supported productivity platforms and monitored domains."""
        return list(SUPPORTED_PLATFORMS_MAP.values())

    def sync_browser_sessions(
        self,
        db: Session,
        user_id: int,
        sessions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Validates, deduplicates, and ingests a batch of browser time sessions.
        Idempotent: repeating the sync with identical session_keys will not duplicate time.
        """
        if not is_activity_tracking_enabled(db, user_id):
            return {
                "status": "disabled",
                "message": "Activity and time tracking is currently disabled in your privacy settings.",
                "synced_count": 0,
                "total_active_seconds": 0,
                "sessions": [],
            }

        synced_count = 0
        total_active_seconds = 0
        processed_sessions = []

        now = datetime.utcnow()

        for raw in sessions:
            platform_key = (raw.get("platform") or "").lower().strip()
            if not platform_key or platform_key not in SUPPORTED_PLATFORMS_MAP:
                continue

            # Parse and validate timestamps
            started_at_raw = raw.get("started_at")
            ended_at_raw = raw.get("ended_at")

            try:
                if isinstance(started_at_raw, str):
                    started_at = datetime.fromisoformat(started_at_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                elif isinstance(started_at_raw, datetime):
                    started_at = started_at_raw
                else:
                    started_at = now

                if isinstance(ended_at_raw, str):
                    ended_at = datetime.fromisoformat(ended_at_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                elif isinstance(ended_at_raw, datetime):
                    ended_at = ended_at_raw
                else:
                    ended_at = started_at
            except Exception:
                continue

            # Basic timestamp integrity checks
            if ended_at < started_at:
                started_at, ended_at = ended_at, started_at

            elapsed_seconds = int((ended_at - started_at).total_seconds())

            # Validate active & idle duration
            active_seconds = max(0, int(raw.get("active_seconds") or raw.get("duration_seconds") or elapsed_seconds))
            idle_seconds = max(0, int(raw.get("idle_seconds") or 0))

            # Bound sanity checks: active seconds cannot exceed elapsed + clock drift buffer
            if active_seconds > elapsed_seconds + 10 and elapsed_seconds > 0:
                active_seconds = elapsed_seconds

            if active_seconds < MIN_VALID_SESSION_SECONDS or active_seconds > MAX_SESSION_INTERVAL_SECONDS:
                continue

            # Deduplication key
            session_key = (
                raw.get("session_key")
                or raw.get("extension_event_id")
                or raw.get("idempotency_key")
                or f"bts_{user_id}_{platform_key}_{int(started_at.timestamp())}_{int(ended_at.timestamp())}"
            )

            domain = raw.get("domain") or SUPPORTED_PLATFORMS_MAP[platform_key]["domains"][0]
            source = raw.get("source") or "browser_extension"

            # Check for existing session record by session_key for this user
            existing = (
                db.query(BrowserTimeSession)
                .filter(
                    BrowserTimeSession.user_id == user_id,
                    BrowserTimeSession.session_key == session_key,
                )
                .first()
            )

            if existing:
                # Update without duplicating
                existing.active_seconds = max(existing.active_seconds, active_seconds)
                existing.idle_seconds = max(existing.idle_seconds, idle_seconds)
                existing.ended_at = ended_at
                db_session = existing
            else:
                db_session = BrowserTimeSession(
                    user_id=user_id,
                    platform=platform_key,
                    domain=domain,
                    started_at=started_at,
                    ended_at=ended_at,
                    active_seconds=active_seconds,
                    idle_seconds=idle_seconds,
                    session_key=session_key,
                    source=source,
                )
                db.add(db_session)
                synced_count += 1
                total_active_seconds += active_seconds

            # Mirror to unified DeveloperActivity table for consolidated timeline
            category = SUPPORTED_PLATFORMS_MAP[platform_key]["category"]
            platform_name = SUPPORTED_PLATFORMS_MAP[platform_key]["name"]

            record_unified_activity(
                db=db,
                user_id=user_id,
                platform=platform_key,
                category=category,
                activity_type="platform_session",
                title=f"Active on {platform_name}: {_format_seconds(active_seconds)}",
                message=f"Estimated active website time on {platform_name} ({_format_seconds(active_seconds)} active)",
                details=f"Verified Browser Active Session ({domain}) | Idle Excluded: {_format_seconds(idle_seconds)}",
                duration_seconds=active_seconds,
                started_at=started_at,
                ended_at=ended_at,
                activity_date=started_at.date(),
                source="browser_extension",
                external_id=f"bts_{session_key}",
                activity_count=1,
            )

            processed_sessions.append({
                "session_key": session_key,
                "platform": platform_key,
                "active_seconds": active_seconds,
                "idle_seconds": idle_seconds,
                "started_at": started_at.isoformat() + "Z",
                "ended_at": ended_at.isoformat() + "Z",
            })

        db.commit()
        user_cache.invalidate_user(user_id)

        return {
            "status": "success",
            "message": f"Successfully synchronized {synced_count} new session(s) ({_format_seconds(total_active_seconds)} total active time).",
            "synced_count": synced_count,
            "total_active_seconds": total_active_seconds,
            "total_active_formatted": _format_seconds(total_active_seconds),
            "sessions": processed_sessions,
        }

    def get_time_tracking_summary(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Calculates today, weekly, and monthly active website time metrics,
        comparison against user goals, and most used platform.
        """
        today = date.today()
        start_week = today - timedelta(days=6)
        start_month = today - timedelta(days=29)

        # 1. Today Sessions
        today_sessions = (
            db.query(BrowserTimeSession)
            .filter(
                BrowserTimeSession.user_id == user_id,
                func.date(BrowserTimeSession.started_at) == today,
            )
            .all()
        )

        today_active_seconds = sum(s.active_seconds for s in today_sessions)
        today_idle_seconds = sum(s.idle_seconds for s in today_sessions)

        today_by_platform: Dict[str, int] = {}
        for s in today_sessions:
            today_by_platform[s.platform] = today_by_platform.get(s.platform, 0) + s.active_seconds

        # 2. Week Sessions (Last 7 Days)
        week_sessions = (
            db.query(BrowserTimeSession)
            .filter(
                BrowserTimeSession.user_id == user_id,
                func.date(BrowserTimeSession.started_at) >= start_week,
                func.date(BrowserTimeSession.started_at) <= today,
            )
            .all()
        )

        week_active_seconds = sum(s.active_seconds for s in week_sessions)
        week_by_platform: Dict[str, int] = {}
        for s in week_sessions:
            week_by_platform[s.platform] = week_by_platform.get(s.platform, 0) + s.active_seconds

        # Daily distribution for chart
        daily_distribution = []
        for i in range(7):
            d = start_week + timedelta(days=i)
            day_secs = sum(s.active_seconds for s in week_sessions if s.started_at.date() == d)
            daily_distribution.append({
                "date": str(d),
                "day_name": d.strftime("%a"),
                "active_seconds": day_secs,
                "active_minutes": round(day_secs / 60, 1),
                "active_hours": round(day_secs / 3600, 2),
            })

        # 3. Month Sessions (Last 30 Days)
        month_sessions = (
            db.query(BrowserTimeSession)
            .filter(
                BrowserTimeSession.user_id == user_id,
                func.date(BrowserTimeSession.started_at) >= start_month,
                func.date(BrowserTimeSession.started_at) <= today,
            )
            .all()
        )
        month_active_seconds = sum(s.active_seconds for s in month_sessions)

        # 4. Most-Used Platform
        most_used_platform = None
        max_platform_seconds = 0
        for p, secs in week_by_platform.items():
            if secs > max_platform_seconds:
                max_platform_seconds = secs
                most_used_platform = {
                    "platform": p,
                    "name": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("name", p.capitalize()),
                    "active_seconds": secs,
                    "formatted": _format_seconds(secs),
                    "icon": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("icon", "💻"),
                }

        # 5. User Target Comparisons
        user_settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        coding_target_hours = float(user_settings.daily_coding_target_hours or 2.0) if user_settings else 2.0
        learning_target_hours = float(user_settings.daily_learning_target_hours or 1.0) if user_settings else 1.0

        coding_seconds_today = today_by_platform.get("github", 0) + today_by_platform.get("vscode", 0)
        learning_seconds_today = (
            today_by_platform.get("coursera", 0)
            + today_by_platform.get("nptel", 0)
            + today_by_platform.get("freecodecamp", 0)
            + today_by_platform.get("leetcode", 0)
            + today_by_platform.get("geeksforgeeks", 0)
        )

        coding_target_secs = int(coding_target_hours * 3600)
        learning_target_secs = int(learning_target_hours * 3600)

        # 6. Recent Sessions
        recent = (
            db.query(BrowserTimeSession)
            .filter(BrowserTimeSession.user_id == user_id)
            .order_by(BrowserTimeSession.started_at.desc())
            .limit(10)
            .all()
        )

        last_sync_session = recent[0] if recent else None

        return {
            "metric_name": "Estimated Active Website Time",
            "metric_disclaimer": "Measures focused active browser time on supported domains with idle periods excluded.",
            "today": {
                "active_seconds": today_active_seconds,
                "active_minutes": round(today_active_seconds / 60, 1),
                "active_hours": round(today_active_seconds / 3600, 2),
                "formatted": _format_seconds(today_active_seconds),
                "idle_excluded_seconds": today_idle_seconds,
                "idle_excluded_formatted": _format_seconds(today_idle_seconds),
                "sessions_count": len(today_sessions),
                "by_platform": [
                    {
                        "platform": p,
                        "name": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("name", p.capitalize()),
                        "category": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("category", "other"),
                        "active_seconds": secs,
                        "formatted": _format_seconds(secs),
                        "percentage": round((secs / today_active_seconds * 100), 1) if today_active_seconds > 0 else 0,
                        "icon": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("icon", "💻"),
                    }
                    for p, secs in sorted(today_by_platform.items(), key=lambda x: x[1], reverse=True)
                ],
            },
            "this_week": {
                "active_seconds": week_active_seconds,
                "formatted": _format_seconds(week_active_seconds),
                "sessions_count": len(week_sessions),
                "daily_distribution": daily_distribution,
                "by_platform": [
                    {
                        "platform": p,
                        "name": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("name", p.capitalize()),
                        "active_seconds": secs,
                        "formatted": _format_seconds(secs),
                        "percentage": round((secs / week_active_seconds * 100), 1) if week_active_seconds > 0 else 0,
                        "icon": SUPPORTED_PLATFORMS_MAP.get(p, {}).get("icon", "💻"),
                    }
                    for p, secs in sorted(week_by_platform.items(), key=lambda x: x[1], reverse=True)
                ],
            },
            "this_month": {
                "active_seconds": month_active_seconds,
                "formatted": _format_seconds(month_active_seconds),
                "sessions_count": len(month_sessions),
            },
            "most_used_platform": most_used_platform,
            "targets": {
                "coding": {
                    "target_hours": coding_target_hours,
                    "target_seconds": coding_target_secs,
                    "actual_seconds": coding_seconds_today,
                    "actual_formatted": _format_seconds(coding_seconds_today),
                    "percentage": min(100.0, round((coding_seconds_today / coding_target_secs * 100), 1)) if coding_target_secs > 0 else 0,
                },
                "learning": {
                    "target_hours": learning_target_hours,
                    "target_seconds": learning_target_secs,
                    "actual_seconds": learning_seconds_today,
                    "actual_formatted": _format_seconds(learning_seconds_today),
                    "percentage": min(100.0, round((learning_seconds_today / learning_target_secs * 100), 1)) if learning_target_secs > 0 else 0,
                },
            },
            "coverage": {
                "total_recorded_sessions": db.query(BrowserTimeSession).filter(BrowserTimeSession.user_id == user_id).count(),
                "last_synced_at": last_sync_session.created_at.isoformat() + "Z" if last_sync_session and last_sync_session.created_at else None,
                "supported_platforms_count": len(SUPPORTED_PLATFORMS_MAP),
            },
        }

    def get_time_tracking_sessions(
        self,
        db: Session,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        platform: Optional[str] = None,
        date_filter: Optional[date] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Returns paginated, filtered session records for the authenticated user."""
        query = db.query(BrowserTimeSession).filter(BrowserTimeSession.user_id == user_id)

        if platform and platform != "all":
            query = query.filter(BrowserTimeSession.platform == platform.lower().strip())

        if date_filter:
            query = query.filter(func.date(BrowserTimeSession.started_at) == date_filter)
        else:
            if start_date:
                query = query.filter(func.date(BrowserTimeSession.started_at) >= start_date)
            if end_date:
                query = query.filter(func.date(BrowserTimeSession.started_at) <= end_date)

        total_count = query.count()
        sessions = (
            query.order_by(BrowserTimeSession.started_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items = []
        for s in sessions:
            items.append({
                "id": s.id,
                "platform": s.platform,
                "name": SUPPORTED_PLATFORMS_MAP.get(s.platform, {}).get("name", s.platform.capitalize()),
                "domain": s.domain,
                "started_at": s.started_at.isoformat() + "Z",
                "ended_at": s.ended_at.isoformat() + "Z",
                "active_seconds": s.active_seconds,
                "active_formatted": _format_seconds(s.active_seconds),
                "idle_seconds": s.idle_seconds,
                "idle_formatted": _format_seconds(s.idle_seconds),
                "session_key": s.session_key,
                "source": s.source,
                "icon": SUPPORTED_PLATFORMS_MAP.get(s.platform, {}).get("icon", "💻"),
            })

        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "sessions": items,
        }


time_tracking_service = TimeTrackingService()
