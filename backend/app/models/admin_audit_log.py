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


class AdminAuditLog(Base):
    """
    Immutable audit log recording all administrative actions:
    - User account suspension / reactivation / role changes
    - Score adjustments and duplicate points deletions
    - Streak adjustments and corrections
    - Achievement & certificate verification decisions
    - Platform configuration or security events
    """
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    admin_username = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=False, index=True)  # user, point_transaction, streak, achievement, system
    target_id = Column(String(100), nullable=False, index=True)
    target_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_admin_audit_action_created", "action", "created_at"),
        Index("ix_admin_audit_target_created", "target_type", "target_id", "created_at"),
        Index("ix_admin_audit_target_user", "target_user_id", "created_at"),
    )
