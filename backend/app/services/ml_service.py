"""
ML Service for Developer Productivity Dashboard
Extracts live developer activity from MySQL tables, constructs feature vectors,
invokes the trained RandomForestRegressor model, and stores predictions.
"""

import json
from datetime import date, datetime
from typing import Dict, Any, Optional, List
from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.github_connection import GitHubConnection
from app.models.user_settings import UserSettings
from app.models.productivity_prediction import ProductivityPrediction

from ml.predict import get_productivity_predictor, DeveloperActivityInput


class MLProductivityService:
    """
    Connects MySQL Activity Telemetry -> Feature Extraction -> ML Prediction -> DB Storage.
    """

    def extract_live_user_features(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Extracts real-time developer activity features from database tables for today.
        """
        today = date.today()
        now = datetime.now()
        hour_of_day = now.hour
        day_of_week = now.weekday()  # 0=Monday, 6=Sunday

        # 1. Developer Activity (Coding & Commits)
        today_acts = db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date == today,
        ).all()

        coding_seconds = 0
        github_commits = 0

        for act in today_acts:
            plat = (act.platform or "").lower()
            cat = (act.category or "").lower()
            dur = act.duration_seconds or 0
            cnt = act.activity_count or 1

            if cat == "coding" or plat in ("github", "vscode", "coding", "git"):
                coding_seconds += dur
                if plat == "github":
                    github_commits += cnt
            elif plat in ("leetcode", "geeksforgeeks"):
                coding_seconds += int(dur * 0.75)

        coding_minutes = round(coding_seconds / 60.0, 1)

        # 2. Tasks Completed vs Planned
        task_aggs = db.query(
            func.count(Task.id).label("total"),
            func.coalesce(func.sum(case((Task.status == "Completed", 1), else_=0)), 0).label("completed"),
        ).filter(Task.user_id == user_id).first()

        tasks_planned = max(1, int(task_aggs.total) if task_aggs else 1)
        tasks_completed = int(task_aggs.completed) if task_aggs else 0

        # 3. Pomodoro Focus Sessions
        today_pomodoros = db.query(PomodoroSession).filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status == "completed",
            func.date(PomodoroSession.started_at) == today,
        ).all()

        pomodoro_sessions = len(today_pomodoros)
        pomodoro_seconds = sum(
            p.actual_duration_seconds or p.planned_duration_seconds or 0
            for p in today_pomodoros
        )
        if pomodoro_seconds == 0:
            # Fallback to pomodoro platform activities if any
            pom_acts = [a for a in today_acts if a.platform == "pomodoro"]
            pomodoro_seconds = sum(a.duration_seconds or 0 for a in pom_acts)
            pomodoro_sessions = len(pom_acts)

        pomodoro_minutes = round(pomodoro_seconds / 60.0, 1)

        # 4. Focus Score & Goal Completion Rate calculation from User Settings
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        target_coding_mins = (settings.daily_coding_target_hours or 2.0) * 60.0 if settings else 120.0
        target_focus_mins = float(settings.daily_focus_target_minutes or 120) if settings else 120.0

        coding_pct = min(100.0, (coding_minutes / max(30.0, target_coding_mins)) * 100.0)
        task_pct = min(100.0, (tasks_completed / max(1, tasks_planned)) * 100.0)
        focus_pct = min(100.0, (pomodoro_minutes / max(30.0, target_focus_mins)) * 100.0)

        goal_completion_rate = round(0.4 * task_pct + 0.4 * coding_pct + 0.2 * focus_pct, 1)

        # Focus Score (0 - 100)
        if pomodoro_minutes >= 60:
            focus_score = round(min(100.0, 70.0 + (pomodoro_minutes / 180.0) * 30.0), 1)
        elif pomodoro_minutes > 0:
            focus_score = round(45.0 + (pomodoro_minutes / 60.0) * 25.0, 1)
        else:
            focus_score = round(max(20.0, min(60.0, (coding_minutes / 120.0) * 60.0)), 1)

        return {
            "coding_minutes": coding_minutes,
            "tasks_completed": tasks_completed,
            "tasks_planned": tasks_planned,
            "pomodoro_sessions": pomodoro_sessions,
            "pomodoro_minutes": pomodoro_minutes,
            "github_commits": github_commits,
            "goal_completion_rate": goal_completion_rate,
            "focus_score": focus_score,
            "hour_of_day": hour_of_day,
            "day_of_week": day_of_week,
        }

    def predict_for_user(self, db: Session, user_id: int, save_to_db: bool = True) -> Dict[str, Any]:
        """
        Executes ML prediction on the current user's live database activity telemetry.
        """
        features = self.extract_live_user_features(db, user_id)
        predictor = get_productivity_predictor()
        prediction = predictor.predict(features)

        if save_to_db:
            today = date.today()
            # Upsert or save prediction record
            existing = db.query(ProductivityPrediction).filter(
                ProductivityPrediction.user_id == user_id,
                ProductivityPrediction.prediction_date == today,
            ).first()

            if existing:
                existing.predicted_score = prediction["predicted_productivity_score"]
                existing.productivity_level = prediction["productivity_level"]
                existing.coding_minutes = features["coding_minutes"]
                existing.tasks_completed = features["tasks_completed"]
                existing.tasks_planned = features["tasks_planned"]
                existing.pomodoro_sessions = features["pomodoro_sessions"]
                existing.pomodoro_minutes = features["pomodoro_minutes"]
                existing.github_commits = features["github_commits"]
                existing.goal_completion_rate = features["goal_completion_rate"]
                existing.focus_score = features["focus_score"]
                existing.recommendation = prediction["recommendation"]
                existing.top_factors = json.dumps(prediction["top_factors"])
                existing.most_productive_time = prediction["most_productive_time"]
            else:
                record = ProductivityPrediction(
                    user_id=user_id,
                    predicted_score=prediction["predicted_productivity_score"],
                    productivity_level=prediction["productivity_level"],
                    coding_minutes=features["coding_minutes"],
                    tasks_completed=features["tasks_completed"],
                    tasks_planned=features["tasks_planned"],
                    pomodoro_sessions=features["pomodoro_sessions"],
                    pomodoro_minutes=features["pomodoro_minutes"],
                    github_commits=features["github_commits"],
                    goal_completion_rate=features["goal_completion_rate"],
                    focus_score=features["focus_score"],
                    recommendation=prediction["recommendation"],
                    top_factors=json.dumps(prediction["top_factors"]),
                    most_productive_time=prediction["most_productive_time"],
                    prediction_date=today,
                )
                db.add(record)

            db.commit()

        return prediction

    def predict_custom_features(self, input_features: DeveloperActivityInput) -> Dict[str, Any]:
        """
        Executes prediction on explicit custom activity inputs.
        """
        predictor = get_productivity_predictor()
        return predictor.predict(input_features)

    def get_prediction_history(self, db: Session, user_id: int, limit: int = 7) -> List[Dict[str, Any]]:
        """
        Retrieves historical prediction logs for the user.
        """
        records = db.query(ProductivityPrediction).filter(
            ProductivityPrediction.user_id == user_id
        ).order_by(ProductivityPrediction.prediction_date.desc()).limit(limit).all()

        history = []
        for r in records:
            factors = []
            if r.top_factors:
                try:
                    factors = json.loads(r.top_factors)
                except Exception:
                    factors = []

            history.append({
                "id": r.id,
                "date": str(r.prediction_date),
                "predicted_score": r.predicted_score,
                "productivity_level": r.productivity_level,
                "coding_minutes": r.coding_minutes,
                "tasks_completed": r.tasks_completed,
                "pomodoro_minutes": r.pomodoro_minutes,
                "recommendation": r.recommendation,
                "top_factors": factors,
                "most_productive_time": r.most_productive_time,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        return history


ml_productivity_service = MLProductivityService()
