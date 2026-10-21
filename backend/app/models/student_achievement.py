from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class StudentAchievement(Base):
    """
    Persistent model for verified and self-reported student accomplishments:
    - Hackathon participation and awards
    - Coding platform accomplishments (HackerRank, LeetCode, Codeforces)
    - Certifications & Course Completions (Coursera, NPTEL, freeCodeCamp)
    - Personal and collaborative projects
    """
    __tablename__ = "student_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(150), nullable=False)
    category = Column(
        String(50),
        nullable=False,
        default="certification",
        index=True,
    )  # hackathon, certification, competitive_programming, course, project, other
    issuer = Column(String(100), nullable=False, default="")  # HackerRank, LeetCode, Coursera, NPTEL, etc.
    description = Column(Text, nullable=True)
    issue_date = Column(Date, nullable=True)
    credential_id = Column(String(100), nullable=True)
    verification_url = Column(String(500), nullable=True)
    certificate_url = Column(String(500), nullable=True)  # URL or relative storage key
    verification_status = Column(
        String(30),
        nullable=False,
        default="self_reported",
        index=True,
    )  # self_reported, evidence_uploaded, link_supplied, verified, rejected, correction_requested
    is_public = Column(Boolean, nullable=False, default=True)
    points_awarded = Column(Integer, nullable=False, default=0)
    verification_notes = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_achievements_user_cat", "user_id", "category"),
        Index("ix_achievements_user_public", "user_id", "is_public"),
    )
