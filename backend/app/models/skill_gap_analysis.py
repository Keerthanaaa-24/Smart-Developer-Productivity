"""
Skill Gap Analysis Model (Phase 3)
Stores user job description skill matching results, evidence mapping,
missing capabilities, and tailored learning paths.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class SkillGapAnalysis(Base):
    __tablename__ = "skill_gap_analyses"

    __table_args__ = (
        Index("ix_sga_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    target_role = Column(String(150), nullable=False)
    job_title = Column(String(200), nullable=True)
    job_description_snippet = Column(Text, nullable=True)

    # Match Statistics
    match_percentage = Column(Float, nullable=False)  # 0 - 100
    matched_skills_count = Column(Integer, default=0, nullable=False)
    partial_skills_count = Column(Integer, default=0, nullable=False)
    missing_skills_count = Column(Integer, default=0, nullable=False)

    # JSON Structures for matched, partial, missing skills, and evidence
    matched_skills_json = Column(Text, nullable=False)
    partial_skills_json = Column(Text, nullable=False)
    missing_skills_json = Column(Text, nullable=False)
    recommendations_json = Column(Text, nullable=True)

    analysis_method = Column(String(100), default="Transparent Taxonomy & Evidence Extraction v2.0", nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
