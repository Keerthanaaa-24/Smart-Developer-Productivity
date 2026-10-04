from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user_schema import UserCreate

from app.core.security import (
    hash_password,
    verify_password,
)

from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES




# =========================================================
# CREATE USER
# =========================================================

def create_user(
    db: Session,
    user: UserCreate,
):
    try:
        hashed_password = hash_password(
            user.password
        )

        db_user = User(
            username=user.username.strip(),
            email=str(user.email).strip().lower(),
            password=hashed_password,
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception:
        db.rollback()
        raise


from sqlalchemy import func


# =========================================================
# AUTHENTICATE USER
# =========================================================

def authenticate_user(
    db: Session,
    username: str,
    password: str,
):
    if not username or not password:
        return None

    clean_username = username.strip()

    user = (
        db.query(User)
        .filter(
            (func.lower(User.email) == clean_username.lower())
            | (func.lower(User.username) == clean_username.lower())
        )
        .first()
    )

    if not user:
        return None

    if not verify_password(
        password,
        user.password,
    ):
        return None

    return user


# =========================================================
# CHANGE PASSWORD
# =========================================================

def change_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
):

    # Verify current password
    if not verify_password(
        current_password,
        user.password,
    ):
        return False

    # Hash new password
    user.password = hash_password(
        new_password
    )

    db.commit()

    db.refresh(user)

    return True


# =========================================================
# CREATE ACCESS TOKEN
# =========================================================

def create_access_token(
    data: dict,
):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return encoded_jwt


