from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class LoginHistory(Base):
    __tablename__ = "login_history"

    __table_args__ = (
        Index("ix_login_history_user_date", "user_id", "login_date"),
        Index("ix_login_history_user_created", "user_id", "login_time"),
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

    login_date = Column(
        Date,
        nullable=False,
        index=True,
    )

    login_time = Column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    ip_address = Column(
        String(50),
        nullable=True,
    )

    user_agent = Column(
        String(255),
        nullable=True,
    )
