from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User

from app.services.pomodoro_service import (
    start_pomodoro_session,
    pause_pomodoro_session,
    resume_pomodoro_session,
    complete_pomodoro_session,
    cancel_pomodoro_session,
    get_active_pomodoro_session,
    get_pomodoro_stats,
    get_pomodoro_history,
)

router = APIRouter(
    prefix="/pomodoro",
    tags=["Pomodoro & Focus"],
)


class StartSessionRequest(BaseModel):
    task_id: int | None = None
    session_type: str = "focus"
    planned_duration_seconds: int = 1500
    cycle_number: int = 1


class PauseSessionRequest(BaseModel):
    elapsed_seconds: int = 0


class CompleteSessionRequest(BaseModel):
    actual_duration_seconds: int = 1500


class CancelSessionRequest(BaseModel):
    elapsed_seconds: int = 0


@router.post("/session/start")
def start_session(
    payload: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = start_pomodoro_session(
        db=db,
        user_id=current_user.id,
        task_id=payload.task_id,
        session_type=payload.session_type,
        planned_duration_seconds=payload.planned_duration_seconds,
        cycle_number=payload.cycle_number,
    )
    return session


@router.post("/session/{session_id}/pause")
def pause_session(
    session_id: int,
    payload: PauseSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = pause_pomodoro_session(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
        elapsed_seconds=payload.elapsed_seconds,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/session/{session_id}/resume")
def resume_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = resume_pomodoro_session(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/session/{session_id}/complete")
def complete_session(
    session_id: int,
    payload: CompleteSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = complete_pomodoro_session(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
        actual_duration_seconds=payload.actual_duration_seconds,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.post("/session/{session_id}/cancel")
def cancel_session(
    session_id: int,
    payload: CancelSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = cancel_pomodoro_session(
        db=db,
        user_id=current_user.id,
        session_id=session_id,
        elapsed_seconds=payload.elapsed_seconds,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    return result


@router.get("/active")
def active_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_active_pomodoro_session(
        db=db,
        user_id=current_user.id,
    )
    return {"active_session": session}


@router.get("/stats")
def pomodoro_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stats = get_pomodoro_stats(
        db=db,
        user_id=current_user.id,
    )
    return stats


@router.get("/history")
def pomodoro_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = get_pomodoro_history(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        status_filter=status,
    )
    return {"history": history}
