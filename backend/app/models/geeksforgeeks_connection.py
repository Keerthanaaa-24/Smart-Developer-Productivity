from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class GeeksForGeeksConnection(Base):
    __tablename__ = "geeksforgeeks_connections"

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

    gfg_username = Column(
        String(255),
        nullable=False,
    )

    problems_solved = Column(
        Integer,
        default=0,
    )

    coding_score = Column(
        Integer,
        default=0,
    )

    articles_published = Column(
        Integer,
        default=0,
    )

    courses_completed = Column(
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