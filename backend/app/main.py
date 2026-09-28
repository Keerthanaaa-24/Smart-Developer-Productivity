from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine

# =====================================================
# IMPORT MODELS
# =====================================================

from app.models.user import User
from app.models.task import Task

from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection
from app.models.developer_activity import DeveloperActivity


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
from app.routes.activity_routes import router as activity_router
from app.routes.developer_activity_routes import (
    router as developer_activity_router,
)


# =====================================================
# CREATE FASTAPI APP
# =====================================================

app = FastAPI(
    title="Smart Developer Productivity Dashboard",
    version="1.0.0",
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =====================================================
# CREATE DATABASE TABLES
# =====================================================

Base.metadata.create_all(
    bind=engine
)


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
    activity_router
)
app.include_router(
    developer_activity_router
)

# =====================================================
# HOME
# =====================================================

@app.get("/")
def home():

    return {
        "message": "Smart Developer Productivity Dashboard API",
        "status": "running",
    }