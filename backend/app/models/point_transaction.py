from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.sql import func
from app.core.database import Base


class PointTransaction(Base):
    """
    Persistent, immutable audit ledger for developer productivity points.
    Idempotent guarantee:
    The unique constraint `uq_user_source_event` prevents duplicate point awards
    from being granted for the same underlying event (e.g., repeatedly toggling a task).
    """
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    points = Column(Integer, nullable=False)
    source_type = Column(String(50), nullable=False, index=True)
    source_id = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="productivity")
    description = Column(String(255), nullable=True, default="")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "source_type", "source_id", name="uq_user_source_event"),
        Index("ix_point_tx_user_created", "user_id", "created_at"),
        Index("ix_point_tx_source_lookup", "source_type", "source_id"),
    )
