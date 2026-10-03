from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base
# Ensure referenced organization table model is loaded in metadata
import app.models.organization  # noqa: F401


class DeveloperActivity(Base):
    __tablename__ = "developer_activity"

    __table_args__ = (
        Index("ix_dev_activity_user_date", "user_id", "activity_date"),
        Index("ix_dev_activity_user_platform_date", "user_id", "platform", "activity_date"),
        Index("ix_dev_activity_user_created", "user_id", "created_at"),
        Index("ix_dev_activity_user_ended", "user_id", "ended_at"),
        Index("ix_dev_activity_user_cat_created", "user_id", "category", "created_at"),
        Index("ix_dev_activity_user_plat_created", "user_id", "platform", "created_at"),
        Index("ix_dev_activity_user_plat_ext", "user_id", "platform", "external_id"),
    )

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

    org_id = Column(
        Integer,
        ForeignKey(
            "organizations.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # github / leetcode / nptel / coursera / pomodoro / tasks / geeksforgeeks / freecodecamp / manual / other
    platform = Column(
        String(50),
        nullable=False,
        index=True,
    )

    # coding / learning / problem_solving / productivity / career / other
    category = Column(
        String(50),
        nullable=False,
        default="coding",
        index=True,
    )

    activity_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    # commit / pull_request / issue / problem_solved / focus_session / task_completed / course_activity / manual_activity
    activity_type = Column(
        String(100),
        nullable=False,
    )

    # Short summary title
    title = Column(
        String(255),
        nullable=True,
    )

    # Human-readable activity message
    message = Column(
        String(255),
        nullable=True,
    )

    # Additional information / JSON or details
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

    # automatic / manual / github_api / pomodoro_timer / task_system
    source = Column(
        String(50),
        default="automatic",
        nullable=False,
    )

    # Provider unique id for strict deduplication (e.g. git commit SHA, task ID, etc.)
    external_id = Column(
        String(100),
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )