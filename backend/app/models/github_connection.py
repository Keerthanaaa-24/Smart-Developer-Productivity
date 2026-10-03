from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func

from app.core.database import Base
from app.core.encryption import encrypt_token, decrypt_token


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
        String(255),
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

    profile_url = Column(
        String(500),
        nullable=True,
    )

    access_token = Column(
        Text,
        nullable=False,
    )

    scopes = Column(
        String(255),
        nullable=True,
        default="read:user,user:email,repo",
    )

    last_sync_at = Column(
        DateTime,
        nullable=True,
    )

    last_sync_status = Column(
        String(50),
        nullable=True,
        default="success",
    )

    token_expired = Column(
        Boolean,
        default=False,
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

    def set_access_token(self, plain_token: str):
        self.access_token = encrypt_token(plain_token)

    def get_decrypted_token(self) -> str | None:
        return decrypt_token(self.access_token)