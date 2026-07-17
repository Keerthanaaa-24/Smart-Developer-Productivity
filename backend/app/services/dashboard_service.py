from sqlalchemy.orm import Session

from app.models.task import Task


def get_dashboard_stats(
    db: Session,
    user_id: int
):

    total_tasks = db.query(Task).filter(
        Task.user_id == user_id
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "Completed"
    ).count()

    pending_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "Pending"
    ).count()

    high_priority_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.priority == "High"
    ).count()

    completion_rate = 0

    if total_tasks > 0:

        completion_rate = (
            completed_tasks / total_tasks
        ) * 100

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "high_priority_tasks": high_priority_tasks,
        "completion_rate": round(completion_rate, 2)
    }