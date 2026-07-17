from sqlalchemy.orm import Session

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

    db_task.title = task.title
    db_task.description = task.description
    db_task.status = task.status
    db_task.priority = task.priority
    db_task.due_date = task.due_date

    db.commit()

    db.refresh(db_task)

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

    return db_task