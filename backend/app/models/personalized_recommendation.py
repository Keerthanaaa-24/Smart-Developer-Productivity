"""
Personalized Recommendation Model (Phase 3)
Stores actionable, dismissible, and tracked recommendations generated from
real activity trends, career evidence gaps, and goal tracking.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class PersonalizedRecommendation(Base):
    __tablename__ = "personalized_recommendations"

    __table_args__ = (
        Index("ix_pr_user_status", "user_id", "is_completed", "is_dismissed"),
        Index("ix_pr_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    evidence_reason = Column(Text, nullable=False)
    
    # Metadata
    category = Column(String(50), nullable=False)  # "learning", "project", "focus", "career", "practice"
    priority = Column(String(20), default="medium", nullable=False)  # "high", "medium", "low"
    estimated_effort = Column(String(50), default="1-2 hours", nullable=False)
    related_skill_or_goal = Column(String(100), nullable=True)

    # State Tracking
    is_completed = Column(Boolean, default=False, nullable=False)
    is_dismissed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
