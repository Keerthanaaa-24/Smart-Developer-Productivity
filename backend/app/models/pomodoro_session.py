from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func

from app.core.database import Base


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    __table_args__ = (
        Index("ix_pomodoro_user_created", "user_id", "created_at"),
        Index("ix_pomodoro_user_status", "user_id", "status"),
        Index("ix_pomodoro_user_task", "user_id", "task_id"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # 'focus', 'short_break', 'long_break'
    session_type = Column(
        String(50),
        default="focus",
        nullable=False,
    )

    planned_duration_seconds = Column(
        Integer,
        default=1500,
        nullable=False,
    )

    actual_duration_seconds = Column(
        Integer,
        default=0,
        nullable=False,
    )

    # 'running', 'paused', 'completed', 'interrupted', 'skipped'
    status = Column(
        String(50),
        default="running",
        nullable=False,
    )

    cycle_number = Column(
        Integer,
        default=1,
        nullable=False,
    )

    started_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    ended_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
