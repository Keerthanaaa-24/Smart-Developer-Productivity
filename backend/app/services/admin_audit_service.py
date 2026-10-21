import json
import logging
from typing import Any
from sqlalchemy.orm import Session
from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User

logger = logging.getLogger("uvicorn.error")


def log_admin_action(
    db: Session,
    admin: User,
    action: str,
    target_type: str,
    target_id: str | int,
    target_user_id: int | None = None,
    details: str | dict | list | None = None,
    ip_address: str | None = None,
) -> AdminAuditLog:
    """
    Transactions-safe helper to record administrative actions in the persistent audit log.
    Captures action, target entity, affected user, before/after details, and requesting admin.
    """
    details_str = details
    if isinstance(details, (dict, list)):
        try:
            details_str = json.dumps(details)
        except Exception:
            details_str = str(details)

    audit_entry = AdminAuditLog(
        admin_id=admin.id if admin else None,
        admin_username=admin.username if admin else "system",
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        target_user_id=target_user_id,
        details=details_str,
        ip_address=ip_address,
    )
    try:
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        db.rollback()
        logger.error(f"[AdminAuditService] Error recording audit action {action}: {e}")
        raise
