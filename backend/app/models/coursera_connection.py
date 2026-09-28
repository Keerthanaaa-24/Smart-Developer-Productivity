from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class CourseraConnection(Base):
    __tablename__ = "coursera_connections"

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

    coursera_username = Column(
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

    courses_in_progress = Column(
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