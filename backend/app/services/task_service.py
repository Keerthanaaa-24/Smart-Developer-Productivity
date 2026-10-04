from sqlalchemy.orm import Session

from app.core.cache import user_cache
from app.models.task import Task

from app.schemas.task_schema import TaskCreate


def create_task(
    db: Session,
    task: TaskCreate,
    user_id: int
):

    db_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        user_id=user_id
    )

    db.add(db_task)

    db.commit()

    db.refresh(db_task)
    user_cache.invalidate_user(user_id)

    return db_task


def get_tasks(
    db: Session,
    user_id: int
):

    return db.query(Task).filter(
        Task.user_id == user_id
    ).all()


def get_task_by_id(
    db: Session,
    task_id: int,
    user_id: int
):

    return db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == user_id
    ).first()


def update_task(
    db: Session,
    task_id: int,
    task: TaskCreate,
    user_id: int
):

    db_task = get_task_by_id(
        db,
        task_id,
        user_id
    )

    if not db_task:
        return None

    was_completed = db_task.status == "Completed"
    is_now_completed = task.status == "Completed"

    db_task.title = task.title
    db_task.description = task.description
    db_task.status = task.status
    db_task.priority = task.priority
    db_task.due_date = task.due_date

    db.commit()
    db.refresh(db_task)

    # Log unified activity if task was just marked completed
    if not was_completed and is_now_completed:
        from app.services.unified_activity_service import record_task_completed_activity
        try:
            record_task_completed_activity(
                db=db,
                user_id=user_id,
                task_id=db_task.id,
                task_title=db_task.title,
                priority=db_task.priority or "Medium",
            )
            db.refresh(db_task)
        except Exception as e:
            print("Task completion activity log error:", e)

    user_cache.invalidate_user(user_id)
    return db_task


def delete_task(
    db: Session,
    task_id: int,
    user_id: int
):

    db_task = get_task_by_id(
        db,
        task_id,
        user_id
    )

    if not db_task:
        return None

    db.delete(db_task)

    db.commit()
    user_cache.invalidate_user(user_id)

    return db_task