from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.notification import Notification
from app.models.task import Task
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.developer_activity import DeveloperActivity
from app.models.pomodoro_session import PomodoroSession
from app.services.developer_streak_service import get_developer_streak
from app.services.login_streak_service import get_login_streak


class NotificationService:
    @staticmethod
    def generate_dynamic_notifications(db: Session, user_id: int) -> int:
        """
        Dynamically analyzes tasks, streak health, focus goals, and milestones to generate
        authentic, database-backed notifications and reminders.
        Guarantees strict deduplication via event_key and respects user preferences.
        """
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        today = date.today()

        # Check if user disabled notifications in settings
        productivity_reminders_enabled = settings.productivity_reminders if settings else True
        pomodoro_notifications_enabled = settings.pomodoro_notifications if settings else True
        activity_notifications_enabled = settings.activity_notifications if settings else True

        new_notifications_count = 0

        # Helper to create notification idempotently
        def create_if_not_exists(
            title: str,
            message: str,
            type_: str,
            priority: str,
            link: str,
            event_key: str,
        ):
            nonlocal new_notifications_count
            existing = (
                db.query(Notification)
                .filter(
                    Notification.user_id == user_id,
                    Notification.event_key == event_key,
                )
                .first()
            )
            if not existing:
                notif = Notification(
                    user_id=user_id,
                    title=title,
                    message=message,
                    type=type_,
                    priority=priority,
                    link=link,
                    event_key=event_key,
                    is_read=False,
                )
                db.add(notif)
                new_notifications_count += 1

        # -------------------------------------------------------------
        # 1. TASK REMINDERS (Overdue & Upcoming Deadlines)
        # -------------------------------------------------------------
        if productivity_reminders_enabled:
            # Overdue tasks
            overdue_tasks = (
                db.query(Task)
                .filter(
                    Task.user_id == user_id,
                    Task.status != "Completed",
                    Task.due_date < today,
                )
                .all()
            )

            for task in overdue_tasks:
                days_overdue = (today - task.due_date).days
                create_if_not_exists(
                    title=f"Overdue Task: {task.title[:40]}",
                    message=f"Task '{task.title}' was due {days_overdue} day(s) ago on {task.due_date}. Please review and update its status.",
                    type_="task_overdue",
                    priority="urgent" if task.priority == "High" else "high",
                    link="/tasks",
                    event_key=f"task_overdue_{task.id}_{today}",
                )

            # Tasks due today
            due_today_tasks = (
                db.query(Task)
                .filter(
                    Task.user_id == user_id,
                    Task.status != "Completed",
                    Task.due_date == today,
                )
                .all()
            )

            for task in due_today_tasks:
                create_if_not_exists(
                    title=f"Due Today: {task.title[:40]}",
                    message=f"Task '{task.title}' [{task.priority or 'Normal'} priority] is scheduled for completion today.",
                    type_="task_due",
                    priority="high" if task.priority == "High" else "normal",
                    link="/tasks",
                    event_key=f"task_due_today_{task.id}_{today}",
                )

        # -------------------------------------------------------------
        # 2. PRODUCTIVITY STREAK-AT-RISK REMINDERS
        # -------------------------------------------------------------
        if activity_notifications_enabled:
            streak_data = get_developer_streak(db, user_id)
            current_streak = streak_data.get("current_streak", 0)
            today_active = streak_data.get("today_active", False)

            if current_streak >= 1 and not today_active:
                create_if_not_exists(
                    title="Productivity Streak at Risk! 🔥",
                    message=f"Your {current_streak}-day developer productivity streak will reset if no activity or task completion is recorded today.",
                    type_="streak_at_risk",
                    priority="high",
                    link="/dashboard",
                    event_key=f"streak_at_risk_{today}",
                )

        # -------------------------------------------------------------
        # 3. FOCUS / POMODORO TARGET REMINDERS
        # -------------------------------------------------------------
        if pomodoro_notifications_enabled:
            target_focus_minutes = settings.daily_focus_target_minutes if settings else 120
            today_pomodoros = (
                db.query(PomodoroSession)
                .filter(
                    PomodoroSession.user_id == user_id,
                    PomodoroSession.status == "completed",
                    func.date(PomodoroSession.started_at) == today,
                )
                .all()
            )
            completed_minutes = sum((p.actual_duration_seconds or p.planned_duration_seconds or 0) for p in today_pomodoros) // 60

            if completed_minutes == 0:
                create_if_not_exists(
                    title="Daily Focus Block Pending ⏱️",
                    message=f"You have not logged any Pomodoro focus sessions today. Target: {target_focus_minutes}m.",
                    type_="pomodoro_goal",
                    priority="normal",
                    link="/pomodoro",
                    event_key=f"pomodoro_zero_{today}",
                )

        # -------------------------------------------------------------
        # 4. PRODUCTIVITY MILESTONES (Tasks Completed & Streak Milestones)
        # -------------------------------------------------------------
        completed_tasks_count = (
            db.query(func.count(Task.id))
            .filter(
                Task.user_id == user_id,
                Task.status == "Completed",
            )
            .scalar()
            or 0
        )

        for milestone_threshold in [5, 10, 25, 50, 100]:
            if completed_tasks_count >= milestone_threshold:
                create_if_not_exists(
                    title=f"Milestone Reached: {milestone_threshold} Tasks Completed! 🏆",
                    message=f"Congratulations! You have completed {completed_tasks_count} tasks in your productivity dashboard.",
                    type_="milestone",
                    priority="normal",
                    link="/tasks",
                    event_key=f"milestone_tasks_{milestone_threshold}",
                )

        if new_notifications_count > 0:
            db.commit()

        return new_notifications_count

    @staticmethod
    def get_notifications(
        db: Session,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ) -> dict:
        # Trigger dynamic rule generator to ensure fresh reminders
        NotificationService.generate_dynamic_notifications(db, user_id)

        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)

        total = query.count()
        unread_count = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .scalar()
            or 0
        )

        items = (
            query.order_by(
                Notification.is_read.asc(),
                Notification.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

        serialized = []
        for notif in items:
            serialized.append({
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "type": notif.type,
                "priority": notif.priority,
                "is_read": notif.is_read,
                "link": notif.link,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
                "read_at": notif.read_at.isoformat() if notif.read_at else None,
            })

        return {
            "total": total,
            "unread_count": unread_count,
            "notifications": serialized,
        }

    @staticmethod
    def mark_as_read(db: Session, user_id: int, notification_id: int) -> bool:
        notif = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if not notif:
            return False

        notif.is_read = True
        notif.read_at = datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> int:
        unread_items = (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read == False,
            )
            .all()
        )
        now = datetime.utcnow()
        for item in unread_items:
            item.is_read = True
            item.read_at = now

        db.commit()
        return len(unread_items)

    @staticmethod
    def delete_notification(db: Session, user_id: int, notification_id: int) -> bool:
        notif = (
            db.query(Notification)
            .filter(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .first()
        )
        if not notif:
            return False

        db.delete(notif)
        db.commit()
        return True

    @staticmethod
    def clear_all_notifications(db: Session, user_id: int, only_read: bool = False) -> int:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if only_read:
            query = query.filter(Notification.is_read == True)

        items = query.all()
        count = len(items)
        for item in items:
            db.delete(item)

        db.commit()
        return count


notification_service = NotificationService()
