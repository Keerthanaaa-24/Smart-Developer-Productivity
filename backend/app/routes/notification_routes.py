from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.services.notification_service import notification_service


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications & Reminders"],
)


@router.get("/")
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves database-backed real-time notifications with unread counts and automated dynamic triggers.
    """
    return notification_service.get_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fast query for unread notification count badge in Navbar.
    """
    res = notification_service.get_notifications(
        db=db,
        user_id=current_user.id,
        limit=1,
        offset=0,
        unread_only=True,
    )
    return {"unread_count": res.get("unread_count", 0)}


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = notification_service.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification marked as read"}


@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = notification_service.mark_all_as_read(
        db=db,
        user_id=current_user.id,
    )
    return {"success": True, "marked_read_count": count}


@router.delete("/{notification_id}")
def delete_single_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = notification_service.delete_notification(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "message": "Notification deleted"}


@router.delete("/")
def clear_all_notifications(
    only_read: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = notification_service.clear_all_notifications(
        db=db,
        user_id=current_user.id,
        only_read=only_read,
    )
    return {"success": True, "cleared_count": count}


@router.post("/check")
def trigger_notification_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_count = notification_service.generate_dynamic_notifications(
        db=db,
        user_id=current_user.id,
    )
    return {
        "success": True,
        "new_notifications_generated": new_count,
    }
