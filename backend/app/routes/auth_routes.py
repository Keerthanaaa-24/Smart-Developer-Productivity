from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from fastapi.security import (
    OAuth2PasswordRequestForm,
)

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.oauth2 import (
    get_current_user,
)

from app.core.security import (
    verify_password,
)

from app.models.user import User

from app.schemas.user_schema import (
    UserCreate,
)

from app.services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
    change_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    clean_email = str(user.email).strip().lower()
    clean_username = user.username.strip()

    # 1. Independent Duplicate Email Check
    existing_email = (
        db.query(User)
        .filter(
            func.lower(User.email) == clean_email
        )
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # 2. Independent Duplicate Username Check
    existing_username = (
        db.query(User)
        .filter(
            func.lower(User.username) == clean_username.lower()
        )
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken. Please choose another username",
        )

    try:
        new_user = create_user(
            db,
            user,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists with this username or email",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )

    return {
        "success": True,
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
        },
    }


# =========================================================
# LOGIN (Compatible with Swagger OAuth2 Form & JSON Clients)
# =========================================================

@router.post("/login")
async def login_user(
    request: Request,
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username") or body.get("email") or body.get("email_or_username")
            password = body.get("password")
        except Exception:
            pass
    else:
        try:
            form = await request.form()
            username = form.get("username") or form.get("email") or form.get("email_or_username")
            password = form.get("password")
        except Exception:
            pass

    if username is not None:
        username = str(username).strip()

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username/email and password are required",
        )

    user = authenticate_user(
        db,
        username,
        password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Record login history for authentic login streak calculation
    try:
        from app.services.login_streak_service import record_user_login
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        record_user_login(db, user.id, ip_address=client_ip, user_agent=user_agent)
    except Exception as login_rec_err:
        print("Login streak recording warning:", login_rec_err)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


# =========================================================
# CURRENT USER (SESSION VALIDATION & PERSISTENCE)
# =========================================================

@router.get("/me")
def get_current_authenticated_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.user_settings import UserSettings
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": (settings.full_name if settings and settings.full_name else current_user.username) or current_user.username,
        "avatar_url": settings.avatar_url if settings and settings.avatar_url else None,
        "theme": settings.theme if settings and settings.theme else "light",
    }



@router.get("/login-streak")
def get_user_login_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.login_streak_service import get_login_streak
    return get_login_streak(db, current_user.id)


@router.post("/token")
async def token_endpoint(
    request: Request,
    db: Session = Depends(get_db),
):
    """Alias for /auth/login providing standard OAuth2 token endpoint compatibility."""
    return await login_user(request, db)


# =========================================================
# CHANGE PASSWORD
# =========================================================

@router.post("/change-password")
def change_user_password(
    current_password: str,
    new_password: str,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # VALIDATE NEW PASSWORD
    # -----------------------------------------------------

    if len(new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "New password must contain "
                "at least 6 characters"
            ),
        )

    # -----------------------------------------------------
    # PREVENT SAME PASSWORD
    # -----------------------------------------------------

    if verify_password(
        new_password,
        current_user.password,
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "New password must be "
                "different from the current password"
            ),
        )

    # -----------------------------------------------------
    # CHANGE PASSWORD
    # -----------------------------------------------------

    success = change_password(
        db,
        current_user,
        current_password,
        new_password,
    )

    if not success:

        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    return {
        "success": True,
        "message": "Password changed successfully",
    }