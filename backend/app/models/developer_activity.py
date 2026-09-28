from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func

from app.core.database import Base


class DeveloperActivity(Base):

    __tablename__ = "developer_activity"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # github / leetcode / nptel / etc.
    platform = Column(
        String(50),
        nullable=False,
        index=True,
    )

    activity_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    # commit / quiz / problem / course / practice
    activity_type = Column(
        String(100),
        nullable=False,
    )

    # Human-readable activity
    message = Column(
        String(255),
        nullable=True,
    )

    # Additional information
    details = Column(
        Text,
        nullable=True,
    )

    activity_count = Column(
        Integer,
        default=1,
        nullable=False,
    )

    started_at = Column(
        DateTime,
        nullable=True,
    )

    ended_at = Column(
        DateTime,
        nullable=True,
    )

    duration_seconds = Column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
    )