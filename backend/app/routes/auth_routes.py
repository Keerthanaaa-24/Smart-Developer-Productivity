from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user_schema import UserCreate
from app.services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

@router.post("/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
):

    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    new_user = create_user(db, user)

    return {
        "message":
        "User created successfully",

        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
        },
    }

@router.post("/login")
def login_user(
    form_data:
    OAuth2PasswordRequestForm = Depends(),

    db: Session = Depends(get_db),
):

    user = authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        data={
            "sub": user.email
        }
    )

    return {
        "access_token":
        access_token,

        "token_type":
        "bearer",
    }