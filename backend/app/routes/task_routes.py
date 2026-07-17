from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.schemas.task_schema import TaskCreate

from app.services.task_service import (
    create_task,
    get_tasks,
    get_task_by_id,
    update_task,
    delete_task
)

from app.core.oauth2 import get_current_user

from app.models.user import User


router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


@router.post("/")
def add_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    new_task = create_task(
        db,
        task,
        current_user.id
    )

    return {
        "message": "Task created successfully",
        "task": new_task
    }


@router.get("/")
def all_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    tasks = get_tasks(
        db,
        current_user.id
    )

    return tasks


@router.get("/{task_id}")
def single_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    task = get_task_by_id(
        db,
        task_id,
        current_user.id
    )

    if not task:

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return task


@router.put("/{task_id}")
def edit_task(
    task_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    updated_task = update_task(
        db,
        task_id,
        task,
        current_user.id
    )

    if not updated_task:

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "message": "Task updated successfully",
        "task": updated_task
    }


@router.delete("/{task_id}")
def remove_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    deleted_task = delete_task(
        db,
        task_id,
        current_user.id
    )

    if not deleted_task:

        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return {
        "message": "Task deleted successfully"
    }