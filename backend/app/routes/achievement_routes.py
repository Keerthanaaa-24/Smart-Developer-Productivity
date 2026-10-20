import os
import uuid
import logging
from datetime import datetime, date, timezone
from typing import Optional
from pydantic import BaseModel, HttpUrl, Field
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Header, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.oauth2 import get_current_user, decode_token_user_id
from app.models.user import User
from app.models.student_achievement import StudentAchievement
from app.services.points_service import award_points
from app.core.cache import user_cache

logger = logging.getLogger("uvicorn.error")

router = APIRouter(
    prefix="/achievements",
    tags=["Student Achievements & Certificates"],
)

# Upload constraints
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
LOCAL_UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "certificates")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)


# ==============================================================================
# SCHEMAS
# ==============================================================================
class AchievementCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., pattern="^(hackathon|certification|competitive_programming|course|project|other)$")
    issuer: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    issue_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    verification_url: Optional[str] = Field(None, max_length=500)
    is_public: bool = True


class AchievementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    category: Optional[str] = Field(None, pattern="^(hackathon|certification|competitive_programming|course|project|other)$")
    issuer: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    issue_date: Optional[date] = None
    credential_id: Optional[str] = Field(None, max_length=100)
    verification_url: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


def serialize_achievement(a: StudentAchievement) -> dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "title": a.title,
        "category": a.category,
        "issuer": a.issuer,
        "description": a.description,
        "issue_date": str(a.issue_date) if a.issue_date else None,
        "credential_id": a.credential_id,
        "verification_url": a.verification_url,
        "certificate_url": a.certificate_url,
        "verification_status": a.verification_status,
        "is_public": a.is_public,
        "points_awarded": a.points_awarded,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.get("/me", summary="List current student's achievements")
def list_my_achievements(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all achievements owned by the authenticated student."""
    query = db.query(StudentAchievement).filter(StudentAchievement.user_id == current_user.id)
    if category and category.strip():
        query = query.filter(StudentAchievement.category == category.strip().lower())
    
    achievements = query.order_by(desc(StudentAchievement.created_at)).all()
    return [serialize_achievement(a) for a in achievements]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create a new student achievement")
def create_achievement(
    payload: AchievementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Creates an achievement.
    Automatically assigns verification_status:
    - 'link_supplied' if verification_url provided
    - 'self_reported' otherwise
    Awards transparent bonus points if verifiable.
    """
    verif_status = "self_reported"
    if payload.verification_url and payload.verification_url.strip():
        verif_status = "link_supplied"

    ach = StudentAchievement(
        user_id=current_user.id,
        title=payload.title.strip(),
        category=payload.category,
        issuer=payload.issuer.strip(),
        description=payload.description.strip() if payload.description else None,
        issue_date=payload.issue_date,
        credential_id=payload.credential_id.strip() if payload.credential_id else None,
        verification_url=payload.verification_url.strip() if payload.verification_url else None,
        verification_status=verif_status,
        is_public=payload.is_public,
        points_awarded=15 if verif_status == "link_supplied" else 5,
    )

    db.add(ach)
    db.commit()
    db.refresh(ach)

    # Award points idempotently
    try:
        award_points(
            db=db,
            user_id=current_user.id,
            source_type="achievement",
            source_id=f"ach_{ach.id}",
            points=ach.points_awarded,
            category="achievements",
            description=f"Achievement: {ach.title} ({ach.issuer})",
        )
    except Exception as pe:
        logger.warning(f"Achievement points award notice: {pe}")

    user_cache.invalidate_user(current_user.id)
    return serialize_achievement(ach)


@router.get("/{achievement_id}", summary="Get achievement by ID")
def get_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves an achievement if public or owned by authenticated student."""
    ach = db.query(StudentAchievement).filter(StudentAchievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")
    if ach.user_id != current_user.id and not ach.is_public:
        raise HTTPException(status_code=403, detail="Not authorized to access this private achievement")
    return serialize_achievement(ach)


@router.patch("/{achievement_id}", summary="Update student achievement")
def update_achievement(
    achievement_id: int,
    payload: AchievementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates an achievement owned by the student."""
    ach = db.query(StudentAchievement).filter(
        StudentAchievement.id == achievement_id,
        StudentAchievement.user_id == current_user.id,
    ).first()

    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found or access denied")

    if payload.title is not None:
        ach.title = payload.title.strip()
    if payload.category is not None:
        ach.category = payload.category
    if payload.issuer is not None:
        ach.issuer = payload.issuer.strip()
    if payload.description is not None:
        ach.description = payload.description.strip()
    if payload.issue_date is not None:
        ach.issue_date = payload.issue_date
    if payload.credential_id is not None:
        ach.credential_id = payload.credential_id.strip()
    if payload.verification_url is not None:
        ach.verification_url = payload.verification_url.strip()
        if ach.verification_status == "self_reported" and ach.verification_url:
            ach.verification_status = "link_supplied"
    if payload.is_public is not None:
        ach.is_public = payload.is_public

    db.commit()
    db.refresh(ach)
    user_cache.invalidate_user(current_user.id)
    return serialize_achievement(ach)


@router.delete("/{achievement_id}", summary="Delete student achievement")
def delete_achievement(
    achievement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes an achievement owned by the student."""
    ach = db.query(StudentAchievement).filter(
        StudentAchievement.id == achievement_id,
        StudentAchievement.user_id == current_user.id,
    ).first()

    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found or access denied")

    db.delete(ach)
    db.commit()
    user_cache.invalidate_user(current_user.id)
    return {"message": "Achievement deleted successfully", "id": achievement_id}


@router.post("/{achievement_id}/upload", summary="Upload certificate file (PDF, PNG, JPG, WebP)")
async def upload_certificate_file(
    achievement_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Safely validates and stores certificate evidence:
    - Size limit: <= 5 MB
    - MIME check: application/pdf, image/png, image/jpeg, image/webp
    - Extension check
    - Ownership verification
    - Secure storage key generation
    """
    ach = db.query(StudentAchievement).filter(
        StudentAchievement.id == achievement_id,
        StudentAchievement.user_id == current_user.id,
    ).first()

    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found or access denied")

    # 1. Validate MIME type
    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{content_type}'. Supported formats: PDF, PNG, JPG, WebP.",
        )

    # 2. Validate file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of 5 MB ({round(len(file_bytes) / (1024*1024), 2)} MB received).",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 3. Generate safe unique filename
    ext = ALLOWED_MIME_TYPES[content_type]
    safe_key = f"cert_{current_user.id}_{uuid.uuid4().hex}{ext}"

    # 4. Storage dispatch
    # Check if S3 is configured
    s3_bucket = os.getenv("AWS_S3_BUCKET")
    s3_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    storage_type = "local"
    stored_url = f"/uploads/certificates/{safe_key}"

    if s3_bucket and s3_access_key and s3_secret_key:
        try:
            import boto3
            s3_client = boto3.client(
                "s3",
                aws_access_key_id=s3_access_key,
                aws_secret_access_key=s3_secret_key,
                region_name=os.getenv("AWS_REGION", "us-east-1"),
            )
            s3_client.put_object(
                Bucket=s3_bucket,
                Key=f"certificates/{safe_key}",
                Body=file_bytes,
                ContentType=content_type,
            )
            storage_type = "s3"
            stored_url = f"https://{s3_bucket}.s3.amazonaws.com/certificates/{safe_key}"
        except Exception as s3_err:
            logger.warning(f"S3 upload failed, falling back to local storage: {s3_err}")
            storage_type = "local"

    if storage_type == "local":
        file_path = os.path.join(LOCAL_UPLOAD_DIR, safe_key)
        with open(file_path, "wb") as f:
            f.write(file_bytes)

    # 5. Update achievement record
    ach.certificate_url = stored_url
    ach.verification_status = "evidence_uploaded"
    db.commit()
    db.refresh(ach)
    user_cache.invalidate_user(current_user.id)

    return {
        "message": "Certificate file uploaded successfully.",
        "achievement_id": ach.id,
        "certificate_url": stored_url,
        "verification_status": ach.verification_status,
        "storage_mode": storage_type,
        "storage_note": (
            "Durable S3 object storage verified."
            if storage_type == "s3"
            else "Stored locally on instance filesystem. Configure AWS_S3_BUCKET for permanent multi-region storage across Render dyno restarts."
        ),
    }


@router.get("/{achievement_id}/certificate", summary="Download or view certificate file")
def get_certificate_file(
    achievement_id: int,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    Secure certificate retrieval endpoint:
    - If achievement is public (is_public=True), allows retrieval.
    - If achievement is private (is_public=False), strictly requires authentication
      and verifies token_user_id == ach.user_id.
    - Never exposes private certificates through unrestricted URLs.
    """
    ach = db.query(StudentAchievement).filter(StudentAchievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    if not ach.certificate_url:
        raise HTTPException(status_code=404, detail="No certificate file has been uploaded for this achievement.")

    # Access control: If achievement is private, strictly require owner authentication
    if not ach.is_public:
        auth_token = token
        if not auth_token and authorization and authorization.lower().startswith("bearer "):
            auth_token = authorization.split(" ", 1)[1].strip()

        token_user_id = decode_token_user_id(auth_token) if auth_token else None
        if not token_user_id or token_user_id != ach.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this private certificate evidence.",
            )

    # If external URL (e.g. S3), redirect
    if ach.certificate_url.startswith("http://") or ach.certificate_url.startswith("https://"):
        return RedirectResponse(url=ach.certificate_url)

    # Local file path resolution
    filename = os.path.basename(ach.certificate_url)
    file_path = os.path.join(LOCAL_UPLOAD_DIR, filename)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate file not found on disk. It may need to be re-uploaded.",
        )

    ext = os.path.splitext(filename)[1].lower()
    media_type_map = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename,
    )

