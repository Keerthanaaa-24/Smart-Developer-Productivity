from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func

from app.core.database import Base


class GitHubConnection(Base):
    __tablename__ = "github_connections"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    github_id = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    github_username = Column(
        String(100),
        nullable=False,
    )

    github_name = Column(
        String(255),
        nullable=True,
    )

    github_email = Column(
        String(255),
        nullable=True,
    )

    avatar_url = Column(
        String(500),
        nullable=True,
    )

    access_token = Column(
        Text,
        nullable=False,
    )

    connected_at = Column(
        DateTime,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )