import os

from dotenv import load_dotenv
from jose import JWTError, jwt

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User


# =====================================================
# LOAD ENVIRONMENT VARIABLES
# =====================================================

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is missing from the .env file."
    )


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

    return user