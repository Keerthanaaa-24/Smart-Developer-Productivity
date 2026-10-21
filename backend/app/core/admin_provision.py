import os
import secrets
import logging
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.admin_audit_log import AdminAuditLog
from app.core.security import hash_password

logger = logging.getLogger("uvicorn.error")


def provision_initial_admin(db: Session) -> User | None:
    """
    Safely provisions the initial super admin account if no administrator exists.
    - Idempotent: Skips completely if any active admin/superadmin already exists.
    - Never resets or overwrites an existing administrator's password on startup.
    - Secure: Uses Render environment variables (INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_USERNAME, INITIAL_ADMIN_PASSWORD).
    - If no password is provided in environment variables, generates a cryptographically secure random password and NEVER uses a publicly known default.
    - Public registration is strictly forbidden from creating admin accounts.
    """
    # 1. Check if ANY admin or superadmin already exists
    existing_admin = (
        db.query(User)
        .filter(User.role.in_(["admin", "superadmin"]))
        .first()
    )
    if existing_admin:
        # Never touch existing administrator credentials during application startup
        logger.info(
            f"[AdminProvision] Administrator account already exists: {existing_admin.username} "
            f"(role={existing_admin.role}). Skipping initialization."
        )
        return existing_admin

    # 2. Read provisioning credentials strictly from Render environment variables
    admin_email = (
        os.getenv("INITIAL_ADMIN_EMAIL") or os.getenv("ADMIN_EMAIL")
    )
    admin_username = (
        os.getenv("INITIAL_ADMIN_USERNAME") or os.getenv("ADMIN_USERNAME")
    )
    admin_password = (
        os.getenv("INITIAL_ADMIN_PASSWORD") or os.getenv("ADMIN_PASSWORD")
    )

    if not admin_email:
        admin_email = "admin@smartdeveloper.io"
    admin_email = admin_email.strip().lower()

    if not admin_username:
        admin_username = "superadmin"
    admin_username = admin_username.strip()

    # Never hardcode or restore a publicly known default admin password
    if not admin_password:
        generated_password = secrets.token_urlsafe(20)
        admin_password = generated_password
        logger.warning(
            f"[AdminProvision] NOTICE: INITIAL_ADMIN_PASSWORD was not set in environment. "
            f"Generated one-time secure random password for {admin_username}: {generated_password}"
        )
    else:
        admin_password = admin_password.strip()

    # 3. Check if user already exists with this email or username
    target_user = (
        db.query(User)
        .filter((User.email == admin_email) | (User.username == admin_username))
        .first()
    )

    if target_user:
        target_user.role = "superadmin"
        target_user.is_active = True
        target_user.suspension_reason = None
        # Preserve their existing password - never reset automatically
        db.commit()
        db.refresh(target_user)
        admin_user = target_user
        logger.info(
            f"[AdminProvision] Promoted existing account {target_user.username} to superadmin "
            f"without modifying password."
        )
    else:
        admin_user = User(
            username=admin_username,
            email=admin_email,
            password=hash_password(admin_password),
            role="superadmin",
            is_active=True,
            suspension_reason=None,
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        logger.info(
            f"[AdminProvision] Successfully provisioned initial superadmin: {admin_user.username} "
            f"({admin_user.email})"
        )

    # 4. Ensure UserSettings exist
    settings = db.query(UserSettings).filter(UserSettings.user_id == admin_user.id).first()
    if not settings:
        settings = UserSettings(
            user_id=admin_user.id,
            full_name="Platform Super Administrator",
            theme="dark",
        )
        db.add(settings)
        db.commit()

    # 5. Record audit log
    try:
        audit_entry = AdminAuditLog(
            admin_id=admin_user.id,
            admin_username=admin_user.username,
            action="SYSTEM_INIT_SUPERADMIN",
            target_type="user",
            target_id=str(admin_user.id),
            target_user_id=admin_user.id,
            details=f"Securely provisioned initial super admin {admin_user.username} with role=superadmin via environment config",
            ip_address="127.0.0.1",
        )
        db.add(audit_entry)
        db.commit()
    except Exception as e:
        logger.warning(f"[AdminProvision] Notice recording initial audit log: {e}")

    return admin_user


if __name__ == "__main__":
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        admin = provision_initial_admin(db)
        if admin:
            print(f"Super admin ready: ID={admin.id}, Username={admin.username}, Email={admin.email}, Role={admin.role}")
    finally:
        db.close()
