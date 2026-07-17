from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.oauth2 import get_current_user

from app.models.user import User

from app.services.dashboard_service import (
    get_dashboard_stats
)

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    stats = get_dashboard_stats(
        db,
        current_user.id
    )

    return stats