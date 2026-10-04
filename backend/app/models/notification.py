from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.sql import func
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
        Index("ix_notifications_user_event", "user_id", "event_key"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    message = Column(String(500), nullable=False)

    # 'task_due', 'task_overdue', 'streak_at_risk', 'milestone', 'pomodoro_goal', 'daily_goal', 'system'
    type = Column(String(50), default="system", nullable=False)

    # 'low', 'normal', 'high', 'urgent'
    priority = Column(String(20), default="normal", nullable=False)

    is_read = Column(Boolean, default=False, nullable=False, index=True)

    # Target navigation url e.g. '/tasks', '/pomodoro', '/analytics', '/settings'
    link = Column(String(255), nullable=True)

    # Event key for idempotent deduplication (e.g., 'overdue_task_10_2026-10-04')
    event_key = Column(String(150), nullable=True, index=True)

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    read_at = Column(
        DateTime,
        nullable=True,
    )
