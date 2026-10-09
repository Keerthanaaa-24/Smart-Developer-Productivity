from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class PortfolioProfile(Base):
    __tablename__ = "portfolio_profiles"

    __table_args__ = (
        Index("ix_portfolio_user_id", "user_id"),
        Index("ix_portfolio_custom_slug", "custom_slug"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Unique public URL identifier (e.g. "keerthana-dev" or "usr-a1b2c3d4")
    custom_slug = Column(String(100), unique=True, nullable=False, index=True)

    # Master Visibility Toggle
    is_public_portfolio_enabled = Column(Boolean, default=True, nullable=False)

    # Professional Summary
    headline = Column(
        String(200),
        default="Full-Stack Developer & Software Engineer",
        nullable=False,
    )
    about_me = Column(
        Text,
        default="Passionate developer focused on building scalable, reliable, and user-centric software systems.",
        nullable=True,
    )
    location = Column(String(100), default="", nullable=True)

    # Safe Public Links (NEVER expose OAuth tokens or internal IDs)
    website_url = Column(String(255), default="", nullable=True)
    linkedin_url = Column(String(255), default="", nullable=True)
    github_url = Column(String(255), default="", nullable=True)
    twitter_url = Column(String(255), default="", nullable=True)

    # Privacy Toggles (Granular control over what recruiters see)
    contact_email_public = Column(Boolean, default=False, nullable=False)
    public_contact_note = Column(
        String(255),
        default="Feel free to connect via LinkedIn or GitHub!",
        nullable=True,
    )
    show_github_stats = Column(Boolean, default=True, nullable=False)
    show_coding_stats = Column(Boolean, default=True, nullable=False)
    show_learning_milestones = Column(Boolean, default=True, nullable=False)
    show_career_readiness = Column(Boolean, default=True, nullable=False)
    show_skill_badges = Column(Boolean, default=True, nullable=False)
    show_featured_projects = Column(Boolean, default=True, nullable=False)

    # Featured Selection (JSON strings)
    featured_project_ids = Column(Text, default="[]", nullable=True)
    custom_skills_json = Column(Text, default="[]", nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
