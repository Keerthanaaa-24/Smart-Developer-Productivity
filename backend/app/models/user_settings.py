from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # 1. Profile
    full_name = Column(String(100), default="", nullable=True)
    bio = Column(Text, default="", nullable=True)
    avatar_url = Column(String(255), default="", nullable=True)

    # 2. Appearance ("light", "dark", "system")
    theme = Column(String(20), default="light", nullable=False)

    # 3. Notification Preferences
    pomodoro_notifications = Column(Boolean, default=True, nullable=False)
    productivity_reminders = Column(Boolean, default=True, nullable=False)
    daily_summary = Column(Boolean, default=True, nullable=False)
    activity_notifications = Column(Boolean, default=True, nullable=False)
    sound_enabled = Column(Boolean, default=True, nullable=False)

    # 4. Productivity Preferences
    daily_coding_target_hours = Column(Float, default=2.0, nullable=False)
    daily_learning_target_hours = Column(Float, default=1.0, nullable=False)
    daily_focus_target_minutes = Column(Integer, default=120, nullable=False)
    daily_task_target = Column(Integer, default=5, nullable=False)
    pomodoro_focus_duration = Column(Integer, default=25, nullable=False)
    pomodoro_short_break = Column(Integer, default=5, nullable=False)
    pomodoro_long_break = Column(Integer, default=15, nullable=False)
    pomodoro_cycle_count = Column(Integer, default=4, nullable=False)

    # 5. Privacy & Data Controls
    profile_visibility = Column(String(20), default="public", nullable=False)
    analytics_sharing = Column(Boolean, default=True, nullable=False)
    activity_tracking = Column(Boolean, default=True, nullable=False)

    # 6. Browser Extension & Time Tracking Preferences
    browser_extension_enabled = Column(Boolean, default=True, nullable=False)
    idle_threshold_seconds = Column(Integer, default=60, nullable=False)
    auto_sync_interval_seconds = Column(Integer, default=60, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

