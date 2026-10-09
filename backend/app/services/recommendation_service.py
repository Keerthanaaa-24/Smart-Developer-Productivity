"""
Personalized Recommendation Service (Phase 3)
Generates actionable, dismissible, and prioritized developer recommendations
based on real activity gaps, backlog velocity, and career goals.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.task import Task
from app.models.project import Project
from app.models.pomodoro_session import PomodoroSession
from app.models.developer_activity import DeveloperActivity
from app.models.personalized_recommendation import PersonalizedRecommendation
from app.models.leetcode_connection import LeetCodeConnection
from app.models.github_connection import GitHubConnection


class RecommendationService:
    """
    Generates tailored, actionable suggestions grounded in real telemetry.
    """

    def generate_recommendations(self, db: Session, user_id: int) -> List[Dict[str, Any]]:
        """
        Dynamically derives fresh recommendations and syncs with the database.
        """
        now = datetime.utcnow()
        today = date.today()
        start_7d = today - timedelta(days=7)

        # 1. Fetch user data
        tasks = db.query(Task).filter(Task.user_id == user_id).all()
        pending_tasks = [t for t in tasks if t.status != "Completed"]
        
        projects = db.query(Project).filter(Project.user_id == user_id).all()
        incomplete_projects = [p for p in projects if p.status not in ("completed", "Completed", "live")]

        pomodoros = db.query(PomodoroSession).filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status == "completed",
            func.date(PomodoroSession.started_at) >= start_7d,
        ).all() if hasattr(PomodoroSession, "started_at") else []

        activities_7d = db.query(DeveloperActivity).filter(
            DeveloperActivity.user_id == user_id,
            DeveloperActivity.activity_date >= start_7d,
        ).all()

        lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
        gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()

        candidates = []

        # Rule 1: Task Backlog Delivery
        if len(pending_tasks) >= 3:
            top_task = pending_tasks[0]
            candidates.append({
                "title": f"Execute Pending Task: '{top_task.title}'",
                "description": f"You have {len(pending_tasks)} open tasks in your active queue. Closing your highest priority task will increase your 7-day velocity.",
                "evidence_reason": f"{len(pending_tasks)} pending tasks currently open in Tasks Center.",
                "category": "project",
                "priority": "high",
                "estimated_effort": "45 - 60 mins",
                "related_skill_or_goal": "Task Execution Velocity",
            })

        # Rule 2: Incomplete Project Documentation
        if incomplete_projects:
            proj = incomplete_projects[0]
            proj_name = getattr(proj, "name", None) or getattr(proj, "title", "Project")
            candidates.append({
                "title": f"Complete Project Milestone: '{proj_name}'",
                "description": f"Add a comprehensive README, architecture diagram, and deployment link to demonstrate full-stack completion for recruiters.",
                "evidence_reason": f"Project '{proj_name}' is currently marked as {proj.status or 'in-progress'}.",
                "category": "project",
                "priority": "medium",
                "estimated_effort": "1 - 2 hours",
                "related_skill_or_goal": "Portfolio Evidence",
            })


        # Rule 3: Pomodoro Deep Work Habit
        if len(pomodoros) < 3:
            candidates.append({
                "title": "Start a 25-Minute Focus Sprint",
                "description": "Boost your active focus regularity by completing 2 structured Pomodoro sessions today without browser tab switching.",
                "evidence_reason": f"Only {len(pomodoros)} focus session(s) logged in the past 7 days.",
                "category": "focus",
                "priority": "medium",
                "estimated_effort": "25 mins",
                "related_skill_or_goal": "Deep Work Regularity",
            })

        # Rule 4: Algorithmic Problem Solving Practice
        lc_problems = lc.problems_solved if lc and lc.problems_solved else 0
        if lc_problems < 30:
            candidates.append({
                "title": "Solve 2 Data Structures Challenges",
                "description": "Practice Binary Search or Hash Map challenges on LeetCode or GeeksforGeeks to strengthen algorithmic problem-solving evidence.",
                "evidence_reason": f"Connected coding challenge count is currently at {lc_problems}.",
                "category": "practice",
                "priority": "medium",
                "estimated_effort": "45 mins",
                "related_skill_or_goal": "Data Structures & Algorithms",
            })

        # Rule 5: GitHub Commit Consistency
        github_acts = [a for a in activities_7d if a.platform == "github"]
        if len(github_acts) < 2 and gh:
            candidates.append({
                "title": "Push Incremental Git Commits",
                "description": "Commit small, atomic changes with descriptive commit messages to establish consistent version control lineage.",
                "evidence_reason": f"Fewer than 2 GitHub activity events detected in the past week.",
                "category": "learning",
                "priority": "low",
                "estimated_effort": "20 mins",
                "related_skill_or_goal": "Version Control Lineage",
            })

        # Fallback default if all active
        if not candidates:
            candidates.append({
                "title": "Maintain High Momentum",
                "description": "Great progress! Your weekly focus regularity and project delivery are on track. Continue tracking active sessions.",
                "evidence_reason": "High regularity and balanced task execution across all platforms.",
                "category": "focus",
                "priority": "low",
                "estimated_effort": "Daily cadence",
                "related_skill_or_goal": "Sustained Productivity",
            })

        # 2. Sync candidates to DB
        existing_recs = db.query(PersonalizedRecommendation).filter(
            PersonalizedRecommendation.user_id == user_id
        ).all()
        existing_titles = {r.title: r for r in existing_recs}

        for c in candidates:
            if c["title"] not in existing_titles:
                new_r = PersonalizedRecommendation(
                    user_id=user_id,
                    title=c["title"],
                    description=c["description"],
                    evidence_reason=c["evidence_reason"],
                    category=c["category"],
                    priority=c["priority"],
                    estimated_effort=c["estimated_effort"],
                    related_skill_or_goal=c.get("related_skill_or_goal"),
                )
                db.add(new_r)

        db.commit()

        # 3. Return active (non-dismissed) recommendations
        active_recs = db.query(PersonalizedRecommendation).filter(
            PersonalizedRecommendation.user_id == user_id,
            PersonalizedRecommendation.is_dismissed == False,
        ).order_by(
            PersonalizedRecommendation.is_completed.asc(),
            PersonalizedRecommendation.created_at.desc()
        ).limit(6).all()

        results = []
        for r in active_recs:
            results.append({
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "evidence_reason": r.evidence_reason,
                "category": r.category,
                "priority": r.priority,
                "estimated_effort": r.estimated_effort,
                "related_skill_or_goal": r.related_skill_or_goal,
                "is_completed": r.is_completed,
                "created_at_utc": r.created_at.isoformat() + "Z" if r.created_at else None,
            })

        return results

    def complete_recommendation(self, db: Session, user_id: int, rec_id: int) -> Dict[str, Any]:
        """Marks a recommendation as completed by the user."""
        rec = db.query(PersonalizedRecommendation).filter(
            PersonalizedRecommendation.id == rec_id,
            PersonalizedRecommendation.user_id == user_id,
        ).first()
        if not rec:
            return {"status": "error", "message": "Recommendation not found."}

        rec.is_completed = True
        rec.completed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "message": "Recommendation marked as completed! Great job taking action.",
            "recommendation_id": rec_id,
        }

    def dismiss_recommendation(self, db: Session, user_id: int, rec_id: int) -> Dict[str, Any]:
        """Dismisses a recommendation for the user."""
        rec = db.query(PersonalizedRecommendation).filter(
            PersonalizedRecommendation.id == rec_id,
            PersonalizedRecommendation.user_id == user_id,
        ).first()
        if not rec:
            return {"status": "error", "message": "Recommendation not found."}

        rec.is_dismissed = True
        rec.dismissed_at = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "message": "Recommendation dismissed.",
            "recommendation_id": rec_id,
        }


recommendation_service = RecommendationService()
