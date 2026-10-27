from fastapi import (
    APIRouter,
    BackgroundTasks,
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
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

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

    from app.core.jwt_handler import create_access_token
    token = create_access_token(data={"sub": str(new_user.id), "username": new_user.username, "role": new_user.role})

    return {
        "success": True,
        "message": "User registered successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
        },
    }


def _record_login_in_background(user_id: int, client_ip: str | None, user_agent: str | None):
    """
    Asynchronously records login streak history using a dedicated database session.
    Guarantees that login streak database operations never block the authentication
    HTTP response or contend for the request's database session across threads.
    """
    try:
        from app.core.database import SessionLocal
        from app.services.login_streak_service import record_user_login
        with SessionLocal() as db_streak:
            record_user_login(
                db_streak,
                user_id,
                ip_address=client_ip,
                user_agent=user_agent,
            )
    except Exception as bg_err:
        import logging
        logging.getLogger("uvicorn.error").warning(
            f"[AUTH_DIAG] Background login streak recording notice: {bg_err}"
        )


# =========================================================
# LOGIN (Compatible with Swagger OAuth2 Form & JSON Clients)
# =========================================================

@router.post("/login")
async def login_user(
    request: Request,
    background_tasks: BackgroundTasks = None,
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

    import time
    from starlette.concurrency import run_in_threadpool
    t0 = time.monotonic()
    try:
        user = await run_in_threadpool(
            authenticate_user,
            db,
            username,
            password,
        )
    except (OperationalError, SQLAlchemyError, TimeoutError, Exception) as db_exc:
        # Re-raise standard HTTPExceptions if any
        if isinstance(db_exc, HTTPException):
            raise db_exc
        import logging
        logging.getLogger("uvicorn.error").error(
            f"[AUTH_DIAG] Database connectivity error during login: {type(db_exc).__name__}"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is temporarily unavailable or warming up. Please try again shortly.",
        )

    duration_ms = round((time.monotonic() - t0) * 1000, 2)

    if not user:
        import logging
        logging.getLogger("uvicorn.error").warning(
            f"[AUTH_DIAG] Login failed: invalid credentials duration_ms={duration_ms}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Enforce account active status
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account has been suspended. Reason: {user.suspension_reason or 'Contact platform administrator.'}",
        )

    import logging
    logging.getLogger("uvicorn.error").info(
        f"[AUTH_DIAG] Login successful user_id={user.id} role={getattr(user, 'role', 'student')} duration_ms={duration_ms}"
    )

    user_role = getattr(user, "role", "student") or "student"

    # Safely record login history for developer streak calculation (students only)
    # Uses background tasks or dedicated session so it never delays authentication response
    if user_role not in ("admin", "superadmin"):
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        if background_tasks is not None:
            background_tasks.add_task(
                _record_login_in_background,
                user.id,
                client_ip,
                user_agent,
            )
        else:
            # Fallback for environments where background_tasks parameter is omitted
            _record_login_in_background(user.id, client_ip, user_agent)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "user_id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user_role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user_role,
            "is_active": user.is_active,
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
    settings = None
    try:
        from app.models.user_settings import UserSettings
        settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    except Exception as settings_err:
        import logging
        logging.getLogger("uvicorn.error").warning(f"/auth/me settings lookup warning: {settings_err}")

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": getattr(current_user, "role", "student") or "student",
        "is_active": getattr(current_user, "is_active", True),
        "suspension_reason": current_user.suspension_reason,
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
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """Alias for /auth/login providing standard OAuth2 token endpoint compatibility."""
    return await login_user(request, background_tasks, db)


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