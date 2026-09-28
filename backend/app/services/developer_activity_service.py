from datetime import datetime

from sqlalchemy.orm import Session

from app.models.developer_activity import DeveloperActivity


def record_activity(
    db: Session,
    user_id: int,
    platform: str,
    activity_type: str,
    message: str,
    details: str = None,
    activity_count: int = 1,
):

    now = datetime.utcnow()

    activity = DeveloperActivity(
        user_id=user_id,
        platform=platform.lower(),
        activity_date=now.date(),
        activity_type=activity_type.lower(),
        message=message,
        details=details,
        activity_count=activity_count,
        started_at=now,
        ended_at=now,
        duration_seconds=0,
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity