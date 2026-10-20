import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.services.career_impact_service import career_impact_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/career-impact", tags=["Career Growth & Impact"])


@router.get("/report")
def get_career_impact_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a comprehensive 30-day and 90-day progress report on Focus Time,
    Task Throughput, Learning, 5-Pillar Career Readiness Evolution, and Next Steps.
    """
    try:
        return career_impact_service.generate_career_impact_report(db, current_user.id)
    except Exception as exc:
        logger.error(f"[CareerImpactRoute] Failed to generate career impact report for user {current_user.id}: {exc}")
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate career impact report: {str(exc)}",
        )
