from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.core.database import Base


class LinkedInConnection(Base):
    __tablename__ = "linkedin_connections"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    linkedin_username = Column(
        String(255),
        nullable=False,
    )

    headline = Column(
        String(255),
        nullable=True,
    )

    profile_url = Column(
        String(500),
        nullable=True,
    )

    access_token = Column(
        Text,
        nullable=True,
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
