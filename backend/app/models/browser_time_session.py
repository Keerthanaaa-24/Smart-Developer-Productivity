"""
Browser Time Session Model
Stores verified active-time and idle-time duration intervals captured via the Browser Extension
across whitelisted developer and learning platforms.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class BrowserTimeSession(Base):
    __tablename__ = "browser_time_sessions"

    __table_args__ = (
        Index("ix_bts_user_started", "user_id", "started_at"),
        Index("ix_bts_user_plat_started", "user_id", "platform", "started_at"),
        Index("ix_bts_user_session_key", "user_id", "session_key"),
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

    # github / leetcode / freecodecamp / geeksforgeeks / coursera / nptel / linkedin / naukri
    platform = Column(
        String(50),
        nullable=False,
        index=True,
    )

    # e.g. github.com, leetcode.com
    domain = Column(
        String(100),
        nullable=True,
    )

    started_at = Column(
        DateTime,
        nullable=False,
        index=True,
    )

    ended_at = Column(
        DateTime,
        nullable=False,
        index=True,
    )

    # Measured active duration in seconds (idle time excluded)
    active_seconds = Column(
        Integer,
        default=0,
        nullable=False,
    )

    # Excluded idle seconds
    idle_seconds = Column(
        Integer,
        default=0,
        nullable=False,
    )

    # Idempotent deduplication client session key
    session_key = Column(
        String(120),
        nullable=False,
        index=True,
    )

    # browser_extension / vscode_extension
    source = Column(
        String(50),
        default="browser_extension",
        nullable=False,
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
