from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class LeetCodeConnection(Base):
    __tablename__ = "leetcode_connections"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    leetcode_username = Column(
        String(255),
        nullable=False,
    )

    problems_solved = Column(
        Integer,
        default=0,
    )

    easy_solved = Column(
        Integer,
        default=0,
    )

    medium_solved = Column(
        Integer,
        default=0,
    )

    hard_solved = Column(
        Integer,
        default=0,
    )

    contest_rating = Column(
        Integer,
        default=0,
    )

    global_ranking = Column(
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