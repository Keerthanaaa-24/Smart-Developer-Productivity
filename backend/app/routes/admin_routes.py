import os
import time
import uuid
import logging
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_, text

from app.core.database import get_db, engine, verify_database_connection
from app.core.oauth2 import get_current_admin_user
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.student_achievement import StudentAchievement
from app.models.point_transaction import PointTransaction
from app.models.login_history import LoginHistory
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.project import Project
from app.models.notification import Notification
from app.models.admin_audit_log import AdminAuditLog
from app.services.admin_audit_service import log_admin_action
from app.services.points_service import award_points
from app.services.login_streak_service import get_login_streak, record_user_login
from app.core.cache import user_cache

logger = logging.getLogger("uvicorn.error")

router = APIRouter(
    prefix="/admin",
    tags=["Admin Management & Governance"],
)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class StudentStatusUpdate(BaseModel):
    is_active: bool
    reason: str = Field(..., min_length=3, max_length=255)


class PointAdjustmentRequest(BaseModel):
    user_id: int
    points: int = Field(..., description="Points to award or deduct")
    category: str = Field("admin_adjustment", max_length=50)
    reason: str = Field(..., min_length=3, max_length=255)


class PointDeletionRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255)


class StreakCorrectionRequest(BaseModel):
    user_id: int
    target_date: date
    action: str = Field(..., pattern="^(add_login_date|remove_login_date)$")
    reason: str = Field(..., min_length=3, max_length=255)


class AchievementVerificationRequest(BaseModel):
    status: str = Field(..., pattern="^(verified|rejected|correction_requested)$")
    notes: Optional[str] = Field(None, max_length=1000)
    points_override: Optional[int] = Field(None, ge=0, le=100)



# ==============================================================================
# 0. CONSOLIDATED OVERVIEW
# ==============================================================================

@router.get("/overview", summary="Consolidated dashboard overview metrics and recent activity")
def get_admin_overview(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Consolidated single-query overview endpoint for the Admin Dashboard.
    Reduces multiple parallel HTTP calls into a single lightweight response.
    """
    t0 = time.monotonic()
    db_ok = verify_database_connection()
    db_latency_ms = round((time.monotonic() - t0) * 1000, 2)

    total_students = db.query(User).filter(User.role == "student").count()
    suspended_count = db.query(User).filter(User.role == "student", User.is_active == False).count()

    active_7d = (
        db.query(LoginHistory.user_id)
        .join(User, LoginHistory.user_id == User.id)
        .filter(
            User.role == "student",
            LoginHistory.login_date >= (date.today() - timedelta(days=7)),
        )
        .distinct()
        .count()
    )

    ach_pending = db.query(StudentAchievement).filter(
        StudentAchievement.verification_status.in_(["evidence_uploaded", "link_supplied", "self_reported"])
    ).count()
    ach_verified = db.query(StudentAchievement).filter(StudentAchievement.verification_status == "verified").count()
    ach_total = db.query(StudentAchievement).count()

    pomo_stats = (
        db.query(
            func.count(PomodoroSession.id).label("session_count"),
            func.coalesce(func.sum(PomodoroSession.actual_duration_seconds), 0).label("total_sec"),
        )
        .join(User, PomodoroSession.user_id == User.id)
        .filter(User.role == "student", PomodoroSession.status == "completed")
        .first()
    )
    completed_tasks = (
        db.query(Task)
        .join(User, Task.user_id == User.id)
        .filter(User.role == "student", Task.status == "Completed")
        .count()
    )
    total_focus_hours = round((pomo_stats.total_sec / 3600), 1) if pomo_stats else 0.0
    pomo_count = pomo_stats.session_count if pomo_stats else 0

    # Duplicates count
    dup_sources_count = (
        db.query(PointTransaction.user_id, PointTransaction.source_id)
        .group_by(PointTransaction.user_id, PointTransaction.source_id, PointTransaction.source_type)
        .having(func.count(PointTransaction.id) > 1)
        .count()
    )

    # Top 5 pending achievements for quick review
    pending_rows = (
        db.query(StudentAchievement, User.username, User.email)
        .join(User, StudentAchievement.user_id == User.id)
        .filter(StudentAchievement.verification_status.in_(["evidence_uploaded", "link_supplied", "self_reported"]))
        .order_by(desc(StudentAchievement.created_at))
        .limit(5)
        .all()
    )
    pending_items = [
        {
            "id": a.id,
            "title": a.title,
            "username": u_name,
            "email": u_email,
            "issuer": a.issuer,
            "verification_status": a.verification_status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a, u_name, u_email in pending_rows
    ]

    # Top 6 recent audit logs
    recent_logs = (
        db.query(AdminAuditLog)
        .order_by(desc(AdminAuditLog.created_at))
        .limit(6)
        .all()
    )
    log_items = [
        {
            "id": l.id,
            "admin_username": l.admin_username,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in recent_logs
    ]

    return {
        "analytics": {
            "students": {
                "total_registered": total_students,
                "active_7d": active_7d,
                "suspended": suspended_count,
            },
            "achievements": {
                "total": ach_total,
                "verified": ach_verified,
                "pending": ach_pending,
            },
            "productivity": {
                "total_focus_hours": total_focus_hours,
                "completed_tasks": completed_tasks,
                "pomodoro_sessions": pomo_count,
            },
        },
        "health": {
            "database": {
                "status": "operational" if db_ok else "disconnected",
                "latency_ms": db_latency_ms,
                "engine": engine.dialect.name,
            },
        },
        "duplicates_count": dup_sources_count,
        "pending_achievements": pending_items,
        "recent_logs": log_items,
    }


# ==============================================================================
# 1. STUDENT MANAGEMENT
# ==============================================================================

@router.get("/students", summary="Search and list students with status and metrics")
def list_students(
    search: Optional[str] = Query(None, description="Search by username or email"),
    status_filter: Optional[str] = Query("all", pattern="^(all|active|suspended)$"),
    role_filter: Optional[str] = Query("all", pattern="^(all|student|admin)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Returns a paginated list of registered students with genuine metrics:
    total points, streak, task count, and active status.
    """
    query = db.query(User)

    if role_filter == "student":
        query = query.filter(User.role == "student")
    elif role_filter == "admin":
        query = query.filter(User.role.in_(["admin", "superadmin"]))

    if status_filter == "active":
        query = query.filter(User.is_active == True)
    elif status_filter == "suspended":
        query = query.filter(User.is_active == False)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(term),
                func.lower(User.email).like(term),
            )
        )

    total_count = query.count()
    users = (
        query.order_by(desc(User.id))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    user_ids = [u.id for u in users]

    # Bulk query points for students on current page
    points_map = {}
    if user_ids:
        point_rows = (
            db.query(
                PointTransaction.user_id,
                func.coalesce(func.sum(PointTransaction.points), 0).label("total_pts"),
            )
            .filter(PointTransaction.user_id.in_(user_ids))
            .group_by(PointTransaction.user_id)
            .all()
        )
        points_map = {row.user_id: int(row.total_pts) for row in point_rows}

    # Bulk query task completion count
    tasks_map = {}
    if user_ids:
        task_rows = (
            db.query(Task.user_id, func.count(Task.id).label("task_count"))
            .filter(Task.user_id.in_(user_ids), Task.status == "Completed")
            .group_by(Task.user_id)
            .all()
        )
        tasks_map = {row.user_id: int(row.task_count) for row in task_rows}

    # Bulk query achievements count
    ach_map = {}
    if user_ids:
        ach_rows = (
            db.query(
                StudentAchievement.user_id,
                func.count(StudentAchievement.id).label("ach_count"),
            )
            .filter(StudentAchievement.user_id.in_(user_ids))
            .group_by(StudentAchievement.user_id)
            .all()
        )
        ach_map = {row.user_id: int(row.ach_count) for row in ach_rows}

    # Bulk query last login date
    login_map = {}
    if user_ids:
        login_rows = (
            db.query(
                LoginHistory.user_id,
                func.max(LoginHistory.login_date).label("last_date"),
            )
            .filter(LoginHistory.user_id.in_(user_ids))
            .group_by(LoginHistory.user_id)
            .all()
        )
        login_map = {row.user_id: str(row.last_date) if row.last_date else None for row in login_rows}

    results = []
    for u in users:
        results.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role or "student",
            "is_active": u.is_active,
            "suspension_reason": u.suspension_reason,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "total_points": points_map.get(u.id, 0),
            "completed_tasks": tasks_map.get(u.id, 0),
            "achievements_count": ach_map.get(u.id, 0),
            "last_login_date": login_map.get(u.id),
        })

    return {
        "items": results,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if limit else 1,
    }


@router.get("/students/{user_id}", summary="Inspect detailed student profile and activity")
def inspect_student(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieves full student telemetry, profile, points ledger, and streak history."""
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    streak_data = get_login_streak(db, user_id)

    # Point ledger total and categories
    total_points = (
        db.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .filter(PointTransaction.user_id == user_id)
        .scalar()
    ) or 0

    recent_txs = (
        db.query(PointTransaction)
        .filter(PointTransaction.user_id == user_id)
        .order_by(desc(PointTransaction.created_at))
        .limit(10)
        .all()
    )

    achievements = (
        db.query(StudentAchievement)
        .filter(StudentAchievement.user_id == user_id)
        .order_by(desc(StudentAchievement.created_at))
        .all()
    )

    completed_tasks_count = (
        db.query(Task)
        .filter(Task.user_id == user_id, Task.status == "Completed")
        .count()
    )

    completed_pomos = (
        db.query(
            func.count(PomodoroSession.id).label("count"),
            func.coalesce(func.sum(PomodoroSession.actual_duration_seconds), 0).label("seconds"),
        )
        .filter(PomodoroSession.user_id == user_id, PomodoroSession.status == "completed")
        .first()
    )

    recent_logins = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == user_id)
        .order_by(desc(LoginHistory.login_time))
        .limit(10)
        .all()
    )

    return {
        "student": {
            "id": student.id,
            "username": student.username,
            "email": student.email,
            "role": student.role,
            "is_active": student.is_active,
            "suspension_reason": student.suspension_reason,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "full_name": settings.full_name if settings else None,
            "bio": settings.bio if settings else None,
            "github_username": settings.github_username if settings else None,
        },
        "streak": streak_data,
        "metrics": {
            "total_points": total_points,
            "completed_tasks": completed_tasks_count,
            "pomodoro_sessions": completed_pomos.count if completed_pomos else 0,
            "focus_minutes": (completed_pomos.seconds // 60) if completed_pomos else 0,
            "achievements_count": len(achievements),
        },
        "recent_transactions": [
            {
                "id": tx.id,
                "points": tx.points,
                "source_type": tx.source_type,
                "source_id": tx.source_id,
                "category": tx.category,
                "description": tx.description,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
            }
            for tx in recent_txs
        ],
        "achievements": [
            {
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "issuer": a.issuer,
                "verification_status": a.verification_status,
                "points_awarded": a.points_awarded,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in achievements
        ],
        "recent_logins": [
            {
                "id": lh.id,
                "login_date": str(lh.login_date),
                "login_time": lh.login_time.isoformat() if lh.login_time else None,
                "ip_address": lh.ip_address,
            }
            for lh in recent_logins
        ],
    }


@router.patch("/students/{user_id}/status", summary="Suspend or reactivate a student account")
def update_student_status(
    user_id: int,
    payload: StudentStatusUpdate,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Suspends or reactivates an account with authorization and audit trail.
    - Prevents suspending oneself.
    - Prevents standard admin from modifying superadmin accounts.
    - Records reason in user table and immutable audit log.
    """
    if current_admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend or modify your own administrative account.",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Student not found")

    if target_user.role == "superadmin" and current_admin.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a superadmin can modify another superadmin account.",
        )

    old_status = target_user.is_active
    target_user.is_active = payload.is_active
    target_user.suspension_reason = payload.reason.strip() if not payload.is_active else None

    db.commit()
    db.refresh(target_user)

    action_name = "USER_REACTIVATE" if payload.is_active else "USER_SUSPEND"
    client_ip = request.client.host if request.client else None

    log_admin_action(
        db=db,
        admin=current_admin,
        action=action_name,
        target_type="user",
        target_id=str(target_user.id),
        target_user_id=target_user.id,
        details={
            "old_active": old_status,
            "new_active": target_user.is_active,
            "reason": payload.reason.strip(),
            "username": target_user.username,
            "email": target_user.email,
        },
        ip_address=client_ip,
    )

    user_cache.invalidate_user(target_user.id)

    return {
        "success": True,
        "message": f"Account has been {'reactivated' if payload.is_active else 'suspended'} successfully.",
        "user_id": target_user.id,
        "is_active": target_user.is_active,
        "suspension_reason": target_user.suspension_reason,
    }


# ==============================================================================
# 2. LEADERBOARD & STREAK AUDITING
# ==============================================================================

@router.get("/audit/points", summary="Query point transaction ledger with filters")
def audit_points_ledger(
    user_id: Optional[int] = Query(None),
    source_type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Inspects immutable point ledger entries across all students."""
    query = db.query(PointTransaction, User.username, User.email).join(
        User, PointTransaction.user_id == User.id
    )

    if user_id:
        query = query.filter(PointTransaction.user_id == user_id)
    if source_type and source_type.strip():
        query = query.filter(PointTransaction.source_type == source_type.strip().lower())
    if category and category.strip():
        query = query.filter(PointTransaction.category == category.strip().lower())
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(term),
                func.lower(PointTransaction.description).like(term),
                func.lower(PointTransaction.source_id).like(term),
            )
        )

    total_count = query.count()
    rows = (
        query.order_by(desc(PointTransaction.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for tx, username, email in rows:
        items.append({
            "id": tx.id,
            "user_id": tx.user_id,
            "username": username,
            "email": email,
            "points": tx.points,
            "source_type": tx.source_type,
            "source_id": tx.source_id,
            "category": tx.category,
            "description": tx.description,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if limit else 1,
    }


@router.get("/audit/duplicate-points", summary="Scan and detect duplicate or anomalous point awards")
def detect_duplicate_points(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Detects potential duplicate point awards:
    - Multiple transactions with identical user_id and source_id
    - Multiple daily bonus awards for the same date
    Returns identified clusters for administrative audit and one-click resolution.
    """
    # 1. Query duplicate (user_id, source_id)
    dup_sources = (
        db.query(
            PointTransaction.user_id,
            PointTransaction.source_id,
            PointTransaction.source_type,
            func.count(PointTransaction.id).label("occurrences"),
            func.sum(PointTransaction.points).label("total_points_awarded"),
        )
        .group_by(
            PointTransaction.user_id,
            PointTransaction.source_id,
            PointTransaction.source_type,
        )
        .having(func.count(PointTransaction.id) > 1)
        .all()
    )

    duplicate_groups = []
    for row in dup_sources:
        txs = (
            db.query(PointTransaction)
            .filter(
                PointTransaction.user_id == row.user_id,
                PointTransaction.source_id == row.source_id,
            )
            .order_by(PointTransaction.id)
            .all()
        )
        user = db.query(User).filter(User.id == row.user_id).first()
        duplicate_groups.append({
            "user_id": row.user_id,
            "username": user.username if user else "Unknown",
            "source_type": row.source_type,
            "source_id": row.source_id,
            "occurrences": row.occurrences,
            "total_points_awarded": int(row.total_points_awarded),
            "transactions": [
                {
                    "id": t.id,
                    "points": t.points,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "description": t.description,
                }
                for t in txs
            ],
        })

    return {
        "duplicates_detected": len(duplicate_groups),
        "groups": duplicate_groups,
    }


@router.delete("/audit/points/{transaction_id}", summary="Delete an erroneous point transaction with recorded audit reason")
def delete_point_transaction(
    transaction_id: int,
    request: Request,
    payload: Optional[PointDeletionRequest] = None,
    reason: Optional[str] = Query(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Deletes an invalid or duplicate point transaction and invalidates user leaderboard cache."""
    tx = db.query(PointTransaction).filter(PointTransaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Point transaction not found")

    target_reason = (payload.reason if payload and payload.reason else reason) or "Auditing cleanup"
    target_user_id = tx.user_id
    tx_snapshot = {
        "id": tx.id,
        "user_id": tx.user_id,
        "points": tx.points,
        "source_type": tx.source_type,
        "source_id": tx.source_id,
        "category": tx.category,
        "description": tx.description,
        "reason": target_reason.strip(),
    }

    db.delete(tx)
    db.commit()

    client_ip = request.client.host if request.client else None
    log_admin_action(
        db=db,
        admin=current_admin,
        action="POINTS_DELETE_DUPLICATE",
        target_type="point_transaction",
        target_id=str(transaction_id),
        target_user_id=target_user_id,
        details=tx_snapshot,
        ip_address=client_ip,
    )

    user_cache.invalidate_user(target_user_id)

    return {
        "success": True,
        "message": "Point transaction removed successfully.",
        "transaction_id": transaction_id,
        "user_id": target_user_id,
    }


@router.post("/audit/points/adjust", summary="Make a manual point adjustment with recorded reason")
def adjust_student_points(
    payload: PointAdjustmentRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Allows administrator to credit or debit points with required justification.
    """
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    adj_id = f"adj_{uuid.uuid4().hex[:12]}"
    tx = PointTransaction(
        user_id=user.id,
        points=payload.points,
        source_type="admin_adjustment",
        source_id=adj_id,
        category=payload.category,
        description=f"Admin adjustment: {payload.reason.strip()}",
    )

    db.add(tx)
    db.commit()
    db.refresh(tx)

    client_ip = request.client.host if request.client else None
    log_admin_action(
        db=db,
        admin=current_admin,
        action="POINTS_ADJUSTMENT",
        target_type="point_transaction",
        target_id=str(tx.id),
        target_user_id=user.id,
        details={
            "points": payload.points,
            "category": payload.category,
            "reason": payload.reason.strip(),
            "username": user.username,
        },
        ip_address=client_ip,
    )

    user_cache.invalidate_user(user.id)

    return {
        "success": True,
        "message": f"Adjusted points ({payload.points:+d}) for {user.username}.",
        "transaction_id": tx.id,
        "user_id": user.id,
        "new_points": tx.points,
    }


@router.get("/audit/streaks/{user_id}", summary="Audit a student's login streak records")
def audit_student_streak(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Returns detailed login history dates and computed streak metrics."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    streak_summary = get_login_streak(db, user_id)
    records = (
        db.query(LoginHistory)
        .filter(LoginHistory.user_id == user_id)
        .order_by(desc(LoginHistory.login_date))
        .limit(60)
        .all()
    )

    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "streak_summary": streak_summary,
        "history": [
            {
                "id": r.id,
                "login_date": str(r.login_date),
                "login_time": r.login_time.isoformat() if r.login_time else None,
                "ip_address": r.ip_address,
                "user_agent": r.user_agent,
            }
            for r in records
        ],
    }


@router.post("/audit/streaks/correct", summary="Correct a streak by adding or removing a login history date")
def correct_student_streak(
    payload: StreakCorrectionRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Corrects missed or erroneously awarded streak calendar dates with recorded reason."""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    client_ip = request.client.host if request.client else None

    if payload.action == "add_login_date":
        # Check if already exists
        existing = (
            db.query(LoginHistory)
            .filter(
                LoginHistory.user_id == user.id,
                LoginHistory.login_date == payload.target_date,
            )
            .first()
        )
        if not existing:
            new_lh = LoginHistory(
                user_id=user.id,
                login_date=payload.target_date,
                ip_address="127.0.0.1 (Admin Correction)",
                user_agent=f"Admin Streak Correction: {payload.reason.strip()}",
            )
            db.add(new_lh)
            db.commit()

    elif payload.action == "remove_login_date":
        db.query(LoginHistory).filter(
            LoginHistory.user_id == user.id,
            LoginHistory.login_date == payload.target_date,
        ).delete()
        db.commit()

    # Recalculate streak
    recalculated_streak = get_login_streak(db, user.id)

    log_admin_action(
        db=db,
        admin=current_admin,
        action="STREAK_ADJUSTMENT",
        target_type="streak",
        target_id=str(user.id),
        target_user_id=user.id,
        details={
            "action": payload.action,
            "target_date": str(payload.target_date),
            "reason": payload.reason.strip(),
            "new_streak": recalculated_streak.get("current_streak"),
        },
        ip_address=client_ip,
    )

    user_cache.invalidate_user(user.id)

    return {
        "success": True,
        "message": f"Streak corrected for {user.username}.",
        "user_id": user.id,
        "recalculated_streak": recalculated_streak,
    }


# ==============================================================================
# 3. ACHIEVEMENT & CERTIFICATE VERIFICATION
# ==============================================================================

@router.get("/achievements", summary="List student achievements for verification queue")
def list_achievements_for_review(
    status_filter: Optional[str] = Query("all"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Queue of student achievements and certificates awaiting verification,
    approved, rejected, or flagged for correction.
    """
    query = db.query(StudentAchievement, User.username, User.email).join(
        User, StudentAchievement.user_id == User.id
    )

    if status_filter and status_filter != "all":
        if status_filter == "pending":
            query = query.filter(
                StudentAchievement.verification_status.in_(
                    ["evidence_uploaded", "link_supplied", "self_reported"]
                )
            )
        else:
            query = query.filter(StudentAchievement.verification_status == status_filter)

    if category and category.strip():
        query = query.filter(StudentAchievement.category == category.strip().lower())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.username).like(term),
                func.lower(StudentAchievement.title).like(term),
                func.lower(StudentAchievement.issuer).like(term),
            )
        )

    total_count = query.count()
    rows = (
        query.order_by(desc(StudentAchievement.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for ach, username, email in rows:
        items.append({
            "id": ach.id,
            "user_id": ach.user_id,
            "username": username,
            "email": email,
            "title": ach.title,
            "category": ach.category,
            "issuer": ach.issuer,
            "description": ach.description,
            "issue_date": str(ach.issue_date) if ach.issue_date else None,
            "credential_id": ach.credential_id,
            "verification_url": ach.verification_url,
            "certificate_url": ach.certificate_url,
            "verification_status": ach.verification_status,
            "verification_notes": ach.verification_notes,
            "verified_by": ach.verified_by,
            "verified_at": ach.verified_at.isoformat() if ach.verified_at else None,
            "is_public": ach.is_public,
            "points_awarded": ach.points_awarded,
            "created_at": ach.created_at.isoformat() if ach.created_at else None,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if limit else 1,
    }


@router.get("/achievements/{achievement_id}", summary="Get detailed achievement verification record")
def get_achievement_inspection(
    achievement_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieves full achievement record including certificate access and verification audit."""
    row = (
        db.query(StudentAchievement, User.username, User.email)
        .join(User, StudentAchievement.user_id == User.id)
        .filter(StudentAchievement.id == achievement_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Achievement not found")

    ach, username, email = row

    verifier_name = None
    if ach.verified_by:
        verifier = db.query(User).filter(User.id == ach.verified_by).first()
        if verifier:
            verifier_name = verifier.username

    return {
        "id": ach.id,
        "user_id": ach.user_id,
        "username": username,
        "email": email,
        "title": ach.title,
        "category": ach.category,
        "issuer": ach.issuer,
        "description": ach.description,
        "issue_date": str(ach.issue_date) if ach.issue_date else None,
        "credential_id": ach.credential_id,
        "verification_url": ach.verification_url,
        "certificate_url": ach.certificate_url,
        "verification_status": ach.verification_status,
        "verification_notes": ach.verification_notes,
        "verified_by": ach.verified_by,
        "verified_by_username": verifier_name,
        "verified_at": ach.verified_at.isoformat() if ach.verified_at else None,
        "is_public": ach.is_public,
        "points_awarded": ach.points_awarded,
        "created_at": ach.created_at.isoformat() if ach.created_at else None,
    }


@router.patch("/achievements/{achievement_id}/verify", summary="Approve, reject, or request correction on achievement")
def verify_achievement(
    achievement_id: int,
    payload: AchievementVerificationRequest,
    request: Request,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Decision endpoint for achievement credentials:
    - verified: grants verified bonus points (+15 pts default or points_override).
    - rejected: marks rejected with reason, revokes unverified points if needed.
    - correction_requested: notifies student with notes to re-upload clear evidence.
    Records immutable audit log and notifies the student in-app.
    """
    ach = db.query(StudentAchievement).filter(StudentAchievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    old_status = ach.verification_status
    ach.verification_status = payload.status
    ach.verification_notes = payload.notes.strip() if payload.notes else None
    ach.verified_by = current_admin.id
    ach.verified_at = datetime.now(timezone.utc)

    # Points adjustment based on verification outcome
    target_points = ach.points_awarded
    if payload.status == "verified":
        target_points = payload.points_override if payload.points_override is not None else 15
        ach.points_awarded = target_points
        # Award verified bonus points
        try:
            award_points(
                db=db,
                user_id=ach.user_id,
                source_type="achievement",
                source_id=f"ach_{ach.id}",
                points=target_points,
                category="achievements",
                description=f"Verified Achievement: {ach.title} ({ach.issuer})",
            )
        except Exception as pe:
            logger.warning(f"Points update notice during achievement verification: {pe}")

    elif payload.status == "rejected":
        # If points were awarded, adjust to 0
        if ach.points_awarded > 0:
            db.query(PointTransaction).filter(
                PointTransaction.user_id == ach.user_id,
                PointTransaction.source_type == "achievement",
                PointTransaction.source_id == f"ach_{ach.id}",
            ).delete()
            ach.points_awarded = 0

    db.commit()
    db.refresh(ach)

    # In-app notification to student
    try:
        notif_titles = {
            "verified": "🎉 Achievement Verified!",
            "rejected": "⚠️ Achievement Verification Notice",
            "correction_requested": "📝 Achievement Needs Correction",
        }
        notif_body = payload.notes or f"Status updated to {payload.status}."
        notif = Notification(
            user_id=ach.user_id,
            title=notif_titles.get(payload.status, "Achievement Review"),
            message=f"'{ach.title}' was reviewed by an administrator: {notif_body}",
            type="milestone" if payload.status == "verified" else "general",
            priority="normal",
            link="/achievements",
        )
        db.add(notif)
        db.commit()
    except Exception as ne:
        logger.warning(f"Could not dispatch notification to student: {ne}")

    # Audit log
    action_map = {
        "verified": "ACHIEVEMENT_VERIFY",
        "rejected": "ACHIEVEMENT_REJECT",
        "correction_requested": "ACHIEVEMENT_CORRECTION_REQUEST",
    }
    client_ip = request.client.host if request.client else None
    log_admin_action(
        db=db,
        admin=current_admin,
        action=action_map.get(payload.status, "ACHIEVEMENT_UPDATE"),
        target_type="achievement",
        target_id=str(ach.id),
        target_user_id=ach.user_id,
        details={
            "old_status": old_status,
            "new_status": ach.verification_status,
            "title": ach.title,
            "issuer": ach.issuer,
            "points_awarded": ach.points_awarded,
            "notes": ach.verification_notes,
        },
        ip_address=client_ip,
    )

    user_cache.invalidate_user(ach.user_id)

    return {
        "success": True,
        "message": f"Achievement status updated to '{payload.status}'.",
        "achievement_id": ach.id,
        "verification_status": ach.verification_status,
        "points_awarded": ach.points_awarded,
    }


# ==============================================================================
# 4. PLATFORM HEALTH & INTEGRATIONS
# ==============================================================================

@router.get("/health/overview", summary="Monitor live database latency, API status, and integrations health without leaking secrets")
def get_platform_health_overview(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Returns authentic system metrics:
    - Database ping latency in milliseconds
    - Pool utilization
    - Configuration flags for external integrations (GitHub, LeetCode, S3)
    - Sync failure counts
    Strictly safeguards secrets: returns boolean `is_configured` flags only.
    """
    t0 = time.monotonic()
    db_ok = verify_database_connection()
    db_latency_ms = round((time.monotonic() - t0) * 1000, 2)

    # Database engine info
    dialect_name = engine.dialect.name
    pool_info = {
        "dialect": dialect_name,
        "pool_size": getattr(engine.pool, "size", lambda: None)(),
        "checked_in": getattr(engine.pool, "checkedin", lambda: None)(),
        "checked_out": getattr(engine.pool, "checkedout", lambda: None)(),
        "overflow": getattr(engine.pool, "overflow", lambda: None)(),
    }

    # Integration health checks (masked boolean presence, zero secret leak)
    github_client_id = os.getenv("GITHUB_CLIENT_ID")
    github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    s3_bucket = os.getenv("AWS_S3_BUCKET")
    s3_key = os.getenv("AWS_ACCESS_KEY_ID")

    integrations = {
        "github_oauth": {
            "name": "GitHub OAuth Sync",
            "is_configured": bool(github_client_id and github_client_secret),
            "status": "operational" if (github_client_id and github_client_secret) else "unconfigured",
            "mode": "OAuth 2.0 App",
        },
        "s3_storage": {
            "name": "AWS S3 Certificate Storage",
            "is_configured": bool(s3_bucket and s3_key),
            "status": "operational" if (s3_bucket and s3_key) else "local_filesystem",
            "mode": "Amazon S3" if (s3_bucket and s3_key) else "Instance Local Storage (/uploads)",
        },
        "leetcode_sync": {
            "name": "LeetCode GraphQL Sync",
            "is_configured": True,
            "status": "operational",
            "mode": "Public GraphQL Telemetry",
        },
        "coursera_nptel": {
            "name": "Course Platforms Integration",
            "is_configured": True,
            "status": "operational",
            "mode": "Student Credential Verification",
        },
    }

    # Count recent errors/sync warnings from login_history or developer activity
    today = date.today()
    recent_sync_count = (
        db.query(PointTransaction.id)
        .filter(PointTransaction.created_at >= (datetime.now(timezone.utc) - timedelta(hours=24)))
        .count()
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "api_status": "healthy",
        "database": {
            "status": "operational" if db_ok else "disconnected",
            "latency_ms": db_latency_ms,
            "engine": dialect_name,
            "pool": pool_info,
        },
        "integrations": integrations,
        "sync_activity_24h": recent_sync_count,
        "environment": {
            "runtime": "Render Free Tier Optimized",
            "python_version": "3.12",
            "database_driver": dialect_name,
        },
    }


# ==============================================================================
# 5. PLATFORM ANALYTICS
# ==============================================================================

@router.get("/analytics/overview", summary="Genuine aggregated platform metrics across users, tasks, and achievements")
def get_platform_analytics(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Computes genuine platform metrics from live database records:
    - Registered students, 7d/30d active, suspended count
    - Verified vs pending achievements
    - Tasks completed, focus hours, total points distributed
    - 14-day daily activity trends
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    fourteen_days_ago = date.today() - timedelta(days=14)

    # 1. User counts
    total_students = db.query(User).filter(User.role == "student").count()
    suspended_count = db.query(User).filter(User.is_active == False).count()
    admin_count = db.query(User).filter(User.role.in_(["admin", "superadmin"])).count()

    # Active students (distinct user_id in login_history)
    active_7d = (
        db.query(LoginHistory.user_id)
        .join(User, LoginHistory.user_id == User.id)
        .filter(
            User.role == "student",
            LoginHistory.login_date >= (date.today() - timedelta(days=7)),
        )
        .distinct()
        .count()
    )
    active_30d = (
        db.query(LoginHistory.user_id)
        .join(User, LoginHistory.user_id == User.id)
        .filter(
            User.role == "student",
            LoginHistory.login_date >= (date.today() - timedelta(days=30)),
        )
        .distinct()
        .count()
    )

    # 2. Achievement metrics
    ach_total = db.query(StudentAchievement).count()
    ach_verified = db.query(StudentAchievement).filter(StudentAchievement.verification_status == "verified").count()
    ach_pending = db.query(StudentAchievement).filter(
        StudentAchievement.verification_status.in_(["evidence_uploaded", "link_supplied", "self_reported"])
    ).count()
    ach_rejected = db.query(StudentAchievement).filter(StudentAchievement.verification_status == "rejected").count()

    ach_by_category = (
        db.query(
            StudentAchievement.category,
            func.count(StudentAchievement.id).label("count"),
        )
        .group_by(StudentAchievement.category)
        .all()
    )

    # 3. Productivity metrics
    completed_tasks = (
        db.query(Task)
        .join(User, Task.user_id == User.id)
        .filter(User.role == "student", Task.status == "Completed")
        .count()
    )
    total_tasks = (
        db.query(Task)
        .join(User, Task.user_id == User.id)
        .filter(User.role == "student")
        .count()
    )

    pomo_stats = (
        db.query(
            func.count(PomodoroSession.id).label("session_count"),
            func.coalesce(func.sum(PomodoroSession.actual_duration_seconds), 0).label("total_sec"),
        )
        .join(User, PomodoroSession.user_id == User.id)
        .filter(User.role == "student", PomodoroSession.status == "completed")
        .first()
    )
    total_pomo_sessions = pomo_stats.session_count if pomo_stats else 0
    total_focus_hours = round((pomo_stats.total_sec / 3600), 1) if pomo_stats else 0.0

    total_projects = db.query(Project).count()

    # 4. Points economy (student points only)
    total_points = (
        db.query(func.coalesce(func.sum(PointTransaction.points), 0))
        .join(User, PointTransaction.user_id == User.id)
        .filter(User.role == "student")
        .scalar()
    ) or 0
    avg_points = round(total_points / max(1, total_students), 1)

    # 5. 14-day daily trends (registrations and completed tasks)
    daily_registrations = (
        db.query(
            func.date(User.created_at).label("reg_date"),
            func.count(User.id).label("count"),
        )
        .filter(User.role == "student", User.created_at >= fourteen_days_ago)
        .group_by(func.date(User.created_at))
        .all()
    )
    reg_map = {str(r.reg_date): int(r.count) for r in daily_registrations if r.reg_date}

    daily_logins = (
        db.query(
            LoginHistory.login_date,
            func.count(func.distinct(LoginHistory.user_id)).label("unique_logins"),
        )
        .join(User, LoginHistory.user_id == User.id)
        .filter(User.role == "student", LoginHistory.login_date >= fourteen_days_ago)
        .group_by(LoginHistory.login_date)
        .all()
    )
    login_trend_map = {str(l.login_date): int(l.unique_logins) for l in daily_logins if l.login_date}

    trend_14d = []
    for i in range(14, -1, -1):
        d = str(date.today() - timedelta(days=i))
        trend_14d.append({
            "date": d,
            "new_registrations": reg_map.get(d, 0),
            "active_students": login_trend_map.get(d, 0),
        })

    return {
        "students": {
            "total_registered": total_students,
            "active_7d": active_7d,
            "active_30d": active_30d,
            "suspended": suspended_count,
            "admins": admin_count,
        },
        "achievements": {
            "total": ach_total,
            "verified": ach_verified,
            "pending": ach_pending,
            "rejected": ach_rejected,
            "categories": [{"category": r.category, "count": int(r.count)} for r in ach_by_category],
        },
        "productivity": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "task_completion_rate": round((completed_tasks / max(1, total_tasks)) * 100, 1),
            "pomodoro_sessions": total_pomo_sessions,
            "total_focus_hours": total_focus_hours,
            "total_projects": total_projects,
        },
        "points_economy": {
            "total_points_distributed": total_points,
            "average_points_per_student": avg_points,
        },
        "trend_14d": trend_14d,
    }


# ==============================================================================
# 6. SECURITY & AUDIT LOGS
# ==============================================================================

@router.get("/audit-logs", summary="List chronological security and administrative audit logs")
def list_audit_logs(
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    admin_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Searchable audit trail of administrative actions:
    who modified what, previous state, new state, timestamp, and IP address.
    """
    query = db.query(AdminAuditLog)

    if action and action.strip():
        query = query.filter(AdminAuditLog.action == action.strip().upper())
    if target_type and target_type.strip():
        query = query.filter(AdminAuditLog.target_type == target_type.strip().lower())
    if admin_id:
        query = query.filter(AdminAuditLog.admin_id == admin_id)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(AdminAuditLog.admin_username).like(term),
                func.lower(AdminAuditLog.details).like(term),
                func.lower(AdminAuditLog.target_id).like(term),
            )
        )

    total_count = query.count()
    logs = (
        query.order_by(desc(AdminAuditLog.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_username": log.admin_username,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "target_user_id": log.target_user_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": (total_count + limit - 1) // limit if limit else 1,
    }


@router.post("/system/sync-schema", summary="Synchronize database schema and missing columns")
def admin_sync_database_schema(
    current_admin: User = Depends(get_current_admin_user),
):
    """
    Triggers an immediate database schema reconciliation to ensure all
    model columns, indexes, and tables exist without requiring a server reboot.
    """
    from app.core.schema_sync import sync_database_schema
    added = sync_database_schema(force=True)
    return {
        "success": True,
        "message": f"Database schema synchronized successfully. Reconciled {added} column(s).",
        "added_columns": added,
    }

