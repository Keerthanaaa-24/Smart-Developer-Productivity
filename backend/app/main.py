from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth_routes import router as auth_router
from app.routes.task_routes import router as task_router
from app.routes.dashboard_routes import router as dashboard_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

app.include_router(
    auth_router
)

app.include_router(
    task_router
)

app.include_router(
    dashboard_router
)

@app.get("/")
def home():

    return {
        "message":
        "Smart Developer Productivity Dashboard API"
    }
