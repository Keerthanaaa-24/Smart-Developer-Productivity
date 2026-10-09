from datetime import date
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.services.unified_activity_service import (
    get_unified_activities,
    get_activity_summary,
    get_career_summary,
    create_manual_activity,
    record_extension_activities,
)
from app.services.platform_sync_service import platform_sync_service

router = APIRouter(
    prefix="/activity",
    tags=["Unified Activity Engine"],
)


# =========================================================
# SCHEMAS
# =========================================================

class ManualActivityRequest(BaseModel):
    platform: str = "manual"
    category: str = "coding"
    activity_type: str = "manual_activity"
    title: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    duration_minutes: int = Field(default=0, ge=0, le=1440)
    activity_date: date | None = None


class ExtensionActivityItem(BaseModel):
    platform: str = Field(..., description="Target platform: github, leetcode, coursera, etc.")
    category: str | None = None
    activity_type: str = "platform_session"
    title: str | None = None
    details: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    duration_seconds: int = Field(default=0, ge=0, le=86400)
    source: str = "browser_extension"
    extension_event_id: str | None = None


class ExtensionSyncRequest(BaseModel):
    events: list[ExtensionActivityItem] = Field(default_factory=list)


class CareerApplicationRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=150)
    role: str = Field(..., min_length=1, max_length=150)
    stage: str = Field(default="applied", description="saved, applied, assessment, interview, offer, rejected, withdrawn")
    platform: str = Field(default="linkedin", description="linkedin, naukri, company_portal, referral, other")
    application_date: date | None = None
    interview_date: str | None = None
    notes: str | None = None


# =========================================================
# ROUTES
# =========================================================

@router.get("")
def list_activities(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    activity_type: str | None = Query(default=None),
    date_val: date | None = Query(default=None, alias="date"),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_unified_activities(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        category_filter=category,
        platform_filter=platform,
        activity_type_filter=activity_type,
        date_filter=date_val,
        start_date=start_date,
        end_date=end_date,
        search_query=search,
    )


@router.get("/summary")
def activity_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_activity_summary(db, current_user.id)


@router.get("/career/summary")
def career_summary_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_career_summary(db, current_user.id)


@router.get("/career/applications")
def list_career_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.unified_activity_service import get_career_applications
    return get_career_applications(db, current_user.id)


@router.post("/career/application")
def log_career_application(
    payload: CareerApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.unified_activity_service import create_or_update_career_application
    return create_or_update_career_application(
        db=db,
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        stage=payload.stage,
        platform=payload.platform,
        application_date=payload.application_date,
        interview_date=payload.interview_date,
        notes=payload.notes,
    )


@router.put("/career/application/{activity_id}")
def update_career_application(
    activity_id: int,
    payload: CareerApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.unified_activity_service import create_or_update_career_application
    return create_or_update_career_application(
        db=db,
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        stage=payload.stage,
        platform=payload.platform,
        application_date=payload.application_date,
        interview_date=payload.interview_date,
        notes=payload.notes,
        activity_id=activity_id,
    )


@router.get("/today")
def today_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_unified_activities(
        db=db,
        user_id=current_user.id,
        limit=50,
        offset=0,
        date_filter=date.today(),
    )


@router.get("/sync-status")
def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return platform_sync_service.get_sync_status(db, current_user.id)


@router.post("/manual")
def record_manual(
    payload: ManualActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_manual_activity(
        db=db,
        user_id=current_user.id,
        platform=payload.platform,
        category=payload.category,
        activity_type=payload.activity_type,
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        activity_date=payload.activity_date,
    )


@router.post("/extension-sync")
def sync_browser_extension(
    payload: ExtensionSyncRequest | ExtensionActivityItem | list[ExtensionActivityItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Normalize payload into list of dictionaries
    items = []
    if isinstance(payload, ExtensionSyncRequest):
        items = [e.dict() for e in payload.events]
    elif isinstance(payload, list):
        items = [e.dict() if hasattr(e, "dict") else dict(e) for e in payload]
    elif isinstance(payload, ExtensionActivityItem):
        items = [payload.dict()]
    elif isinstance(payload, dict):
        if "events" in payload and isinstance(payload["events"], list):
            items = payload["events"]
        else:
            items = [payload]

    return record_extension_activities(
        db=db,
        user_id=current_user.id,
        items=items,
    )


@router.delete("/{activity_id}")
def delete_activity_record(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    act = (
        db.query(DeveloperActivity)
        .filter(
            DeveloperActivity.id == activity_id,
            DeveloperActivity.user_id == current_user.id,
        )
        .first()
    )
    if not act:
        raise HTTPException(status_code=404, detail="Activity record not found")

    db.delete(act)
    db.commit()
    return {"message": "Activity record deleted successfully", "id": activity_id}


@router.post("/sync")
async def sync_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await platform_sync_service.sync_all(db, current_user.id)


@router.post("/sync/{platform_name}")
async def sync_single_platform(
    platform_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await platform_sync_service.sync_platform(db, current_user.id, platform_name)


# =========================================================
# DATA TRUST CENTER & PROVENANCE ENDPOINTS
# =========================================================

@router.get("/providers")
def list_providers_registry():
    """Returns the comprehensive Provider Capability Registry for all 8 platforms."""
    from app.services.provider_registry import provider_registry
    return {
        "providers": provider_registry.get_all_providers()
    }


@router.get("/trust-center")
def get_trust_center_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the real-time Integration Health and Data Trust Provenance report for current user."""
    from app.services.data_trust_service import get_data_trust_center_overview
    return get_data_trust_center_overview(db, current_user.id)


@router.get("/export")
def export_user_activity(
    format: str = Query(default="json", regex="^(json|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exports all verified and recorded developer activity records for the authenticated user."""
    from fastapi.responses import Response
    from app.services.data_trust_service import export_user_activity_telemetry

    data = export_user_activity_telemetry(db, current_user.id, export_format=format)

    if format == "csv":
        filename = f"developer_activity_{current_user.username}_{date.today()}.csv"
        return Response(
            content=data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    return data