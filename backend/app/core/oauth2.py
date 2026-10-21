import os

from dotenv import load_dotenv
from jose import JWTError, jwt

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM



# =====================================================
# OAUTH2
# =====================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# =====================================================
# GET CURRENT USER
# =====================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:
        # -------------------------------------------------
        # Decode JWT
        # -------------------------------------------------

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        # -------------------------------------------------
        # Read possible identity fields
        # -------------------------------------------------

        subject = payload.get("sub")

        email = payload.get("email")

        user_id = payload.get("user_id")

        # -------------------------------------------------
        # If only sub exists, determine what it contains
        # -------------------------------------------------

        if not email and subject:

            # Some versions of the login system store
            # the email inside "sub".
            if isinstance(subject, str) and "@" in subject:
                email = subject

            # Some versions store user ID inside "sub".
            elif str(subject).isdigit():
                user_id = int(subject)

            else:
                email = subject

        # -------------------------------------------------
        # No identity found
        # -------------------------------------------------

        if not email and not user_id:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # =====================================================
    # FIND USER
    # =====================================================

    user = None

    # Search by user ID first
    if user_id is not None:

        try:
            user = db.query(User).filter(
                User.id == int(user_id)
            ).first()

        except (ValueError, TypeError):
            user = None

    # Search by email if ID lookup didn't find user
    if user is None and email:

        user = db.query(User).filter(
            User.email == email
        ).first()

    # =====================================================
    # USER NOT FOUND
    # =====================================================

    if user is None:
        raise credentials_exception

    # Verify account is active
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=403,
            detail="Your account has been suspended. Please contact platform administration.",
        )

    return user


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Enforces that the current authenticated user has administrative privileges (admin or superadmin).
    Strictly forbids access by standard students with HTTP 403.
    """
    if getattr(current_user, "role", "student") not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=403,
            detail="Administrative privileges required to access this resource.",
        )
    return current_user


def decode_token_user_id(token: str) -> int | None:
    """
    Decodes a JWT token and returns user_id if valid, or None if expired/invalid.
    Used for query-param/header-authenticated downloads and media access.
    """
    info = decode_token_user_info(token)
    return info.get("user_id") if info else None


def decode_token_user_info(token: str) -> dict | None:
    """
    Decodes JWT payload returning a dict with user_id, email, username, and role.
    Returns None if expired or invalid.
    """
    if not token or not isinstance(token, str):
        return None
    try:
        payload = jwt.decode(
            token.strip(),
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = payload.get("user_id")
        if user_id is None:
            sub = payload.get("sub")
            if sub is not None and str(sub).isdigit():
                user_id = int(sub)
        if user_id is None:
            return None
        return {
            "user_id": int(user_id),
            "email": payload.get("email"),
            "username": payload.get("username"),
            "role": payload.get("role", "student"),
        }
    except Exception:
        return None