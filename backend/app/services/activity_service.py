from datetime import datetime

from sqlalchemy.orm import Session

from app.core.cache import user_cache
from app.models.developer_activity import DeveloperActivity


def log_developer_activity(
    db: Session,
    user_id: int,
    platform: str,
    activity_type: str,
    message: str,
    details: str | None = None,
    activity_count: int = 1,
):
    activity = DeveloperActivity(
        user_id=user_id,
        platform=platform.lower(),
        activity_date=datetime.utcnow().date(),
        activity_type=activity_type,
        message=message,
        details=details,
        activity_count=activity_count,
        created_at=datetime.utcnow(),
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    user_cache.invalidate_user(user_id)

    return activity