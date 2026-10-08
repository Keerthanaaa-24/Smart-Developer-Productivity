from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# =====================================================
# IMPORT MODELS
# =====================================================

from app.models.user import User
from app.models.task import Task
from app.models.notification import Notification

from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection
from app.models.linkedin_connection import LinkedInConnection
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.models.user_settings import UserSettings
from app.models.project import Project
from app.models.login_history import LoginHistory
from app.models.organization import (
    Organization,
    OrganizationMember,
    OrganizationRepository,
)


# =====================================================
# IMPORT ROUTES
# =====================================================

from app.routes.auth_routes import router as auth_router
from app.routes.task_routes import router as task_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.github_routes import router as github_router
from app.routes.leetcode_routes import router as leetcode_router
from app.routes.freecodecamp_routes import router as freecodecamp_router
from app.routes.geeksforgeeks_routes import (
    router as geeksforgeeks_router,
)
from app.routes.nptel_routes import router as nptel_router
from app.routes.coursera_routes import router as coursera_router
from app.routes.linkedin_routes import router as linkedin_router
from app.routes.activity_routes import router as activity_router
from app.routes.developer_activity_routes import (
    router as developer_activity_router,
)
from app.routes.pomodoro_routes import router as pomodoro_router
from app.routes.settings_routes import router as settings_router
from app.routes.project_routes import router as project_router
from app.routes.organization_routes import router as organization_router
from app.routes.notification_routes import router as notification_router
from app.routes.ml_routes import router as ml_router


# =====================================================
# BACKGROUND SCHEDULER (LIFESPAN)
# =====================================================

import asyncio
from contextlib import asynccontextmanager
from app.core.database import SessionLocal
from app.services.notification_service import notification_service


async def _periodic_notification_worker():
    """Background worker that periodically updates dynamic notifications every 15 minutes."""
    while True:
        try:
            await asyncio.sleep(900)  # 15 minutes
            db = SessionLocal()
            try:
                users = db.query(User.id).all()
                for (u_id,) in users:
                    try:
                        notification_service.generate_dynamic_notifications(db, u_id)
                    except Exception:
                        pass
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema check
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        import logging
        logging.getLogger("uvicorn.error").warning(f"Schema verify warning: {e}")

    # Start background notification task
    task = asyncio.create_task(_periodic_notification_worker())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# =====================================================
# CREATE FASTAPI APP
# =====================================================

app = FastAPI(
    title="Smart Developer Productivity Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)



# =====================================================
# CORS CONFIGURATION (Local Dev & Production Deployments)
# =====================================================

import os
default_origins = [
    "https://smart-developer-productivity.vercel.app",
    "https://smart-developer-productivity.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
origins = list(set(default_origins + env_origins))

# Regex matches all localhost/127.0.0.1 ports and preview Vercel deployments
cors_origin_regex = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https?://.*\.vercel\.app$|^https?://smart-developer-productivity\.onrender\.com$",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# CREATE DATABASE TABLES
# =====================================================

try:
    Base.metadata.create_all(bind=engine)
except Exception as ddl_err:
    import logging
    safe_db = engine.url.render_as_string(hide_password=True)
    logging.getLogger("uvicorn.error").error(
        f"Database schema initialization failed for {safe_db}: {ddl_err}"
    )
    raise


# =====================================================
# ROUTES
# =====================================================

app.include_router(
    auth_router
)

app.include_router(
    task_router
)

app.include_router(
    dashboard_router
)

app.include_router(
    github_router
)

app.include_router(
    leetcode_router
)

app.include_router(
    freecodecamp_router
)

app.include_router(
    geeksforgeeks_router
)

app.include_router(
    nptel_router
)

app.include_router(
    coursera_router
)

app.include_router(
    linkedin_router
)

app.include_router(
    activity_router
)
app.include_router(
    developer_activity_router
)

app.include_router(
    pomodoro_router
)

app.include_router(
    settings_router
)

app.include_router(
    project_router
)

app.include_router(
    organization_router
)

app.include_router(
    notification_router
)

app.include_router(
    ml_router
)


# =====================================================
# HEALTH CHECKS
# =====================================================

@app.get("/")
def home():
    return {
        "message": "Smart Developer Productivity Dashboard API",
        "status": "running",
        "port": 8001,
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "smart-developer-productivity-api",
    }