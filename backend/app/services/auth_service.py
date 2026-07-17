from sqlalchemy.orm import Session

from app.models.user import User

from app.schemas.user_schema import UserCreate

from app.core.security import (
    hash_password,
    verify_password,
)

from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = "mysecretkey"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60


def create_user(
    db: Session,
    user: UserCreate,
):

    hashed_password = hash_password(
        user.password
    )

    db_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password,
    )

    db.add(db_user)

    db.commit()

    db.refresh(db_user)

    return db_user


def authenticate_user(
    db: Session,
    username: str,
    password: str,
):

    user = (
        db.query(User)
        .filter(User.email == username)
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


def create_access_token(
    data: dict,
):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {"exp": expire}
    )

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return encoded_jwt
    