from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class NPTELConnection(Base):
    __tablename__ = "nptel_connections"

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
    )

    nptel_username = Column(
        String(255),
        nullable=False,
    )

    courses_completed = Column(
        Integer,
        default=0,
    )

    certificates_count = Column(
        Integer,
        default=0,
    )

    courses_enrolled = Column(
        Integer,
        default=0,
    )

    profile_url = Column(
        String(500),
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