from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    __table_args__ = (
        Index("ix_projects_user_status", "user_id", "status"),
        Index("ix_projects_user_created", "user_id", "created_at"),
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

    name = Column(
        String(150),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    tech_stack = Column(
        String(255),
        nullable=True,
    )

    # Planned / In Progress / Completed / Archived
    status = Column(
        String(50),
        nullable=False,
        default="In Progress",
    )

    github_repo_url = Column(
        String(255),
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
